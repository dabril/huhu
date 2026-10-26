import {
  coverImageUrl,
  REPEAT_AFTER_MS,
  getNode,
  nextNodeId,
  audioUrl,
  resumePoint,
  progressFraction,
  pickText,
  classifyPlayError,
  idleAction,
} from "./logic.js";
import { listLocal, getLocalStory, getLocalAudio, importZip, deleteLocal } from "./library.js";

// ---------- strings ----------

const STRINGS = {
  es: {
    library: "Cuentos", resume: "Seguir", loading: "Cargando…", loadError: "No se pueden cargar los cuentos",
    empty: "Todavía no hay cuentos", retry: "Reintentar", back: "Volver a los cuentos", fin: "Fin",
    showText: "Ver texto", hideText: "Ocultar texto", play: "Reproducir", pause: "Pausa",
    restart: "Empezar de nuevo este trozo", skip: "Siguiente", startPlaying: "Toca para escuchar",
    replay: "Escuchar otra vez", choose: "Elige",
    audioError: "No puedo cargar este cuento ahora.", back2: "Volver",
    add: "＋ Añadir cuentos", adding: "Añadiendo cuentos…", added: "Cuentos añadidos:",
    addError: "En este fichero no hay cuentos que se puedan usar.",
    settings: "Configurar", myStories: "Cuentos en este móvil", noLocal: "No hay cuentos guardados en este móvil.",
    delete: "Borrar", confirmDelete: "¿Borrar «{title}» de este móvil?", deleted: "Cuento borrado:",
    deleteError: "No se ha podido borrar el cuento.",
  },
  de: {
    library: "Geschichten", resume: "Weiter", loading: "Laden…", loadError: "Geschichten können nicht geladen werden",
    empty: "Noch keine Geschichten", retry: "Nochmal", back: "Zurück zu den Geschichten", fin: "Ende",
    showText: "Text zeigen", hideText: "Text verbergen", play: "Abspielen", pause: "Pause",
    restart: "Diesen Teil nochmal", skip: "Weiter", startPlaying: "Tippen zum Anhören",
    replay: "Nochmal anhören", choose: "Wähle",
    audioError: "Ich kann diese Geschichte gerade nicht laden.", back2: "Zurück",
    add: "＋ Geschichten hinzufügen", adding: "Geschichten werden hinzugefügt…", added: "Hinzugefügt:",
    addError: "In dieser Datei sind keine passenden Geschichten.",
    settings: "Einstellungen", myStories: "Geschichten auf diesem Handy", noLocal: "Auf diesem Handy sind keine Geschichten gespeichert.",
    delete: "Löschen", confirmDelete: "»{title}« von diesem Handy löschen?", deleted: "Gelöscht:",
    deleteError: "Die Geschichte konnte nicht gelöscht werden.",
  },
};
const LANGS = ["es", "de"];

// ---------- storage (localStorage may be unavailable) ----------

const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

const progressKey = (id, lang) => `progress:${id}:${lang}`;

function loadProgress(id, lang) {
  try {
    return JSON.parse(store.get(progressKey(id, lang)));
  } catch {
    return null;
  }
}
const saveProgress = (id, lang, nodeId) => store.set(progressKey(id, lang), JSON.stringify({ nodeId }));
const clearProgress = (id, lang) => store.del(progressKey(id, lang));

// ---------- state ----------

const app = document.getElementById("app");
const state = {
  lang: LANGS.includes(store.get("lang")) ? store.get("lang") : "es",
  showText: store.get("showText") === "1",
  session: null, // active story: {story, local, nodeId, repeats, questionEndedAt, idleTimer, choiceReady, blocked}
  notice: null, // message shown once on the library (result of an import)
};
const t = (key) => STRINGS[state.lang][key];

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  const { class: cls, text, ...rest } = props;
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  for (const [k, v] of Object.entries(rest)) {
    if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

// Emoji covers are text; SVG covers are images sized by the same font-size rules (1em).
function coverEl(cover, tag, props = {}) {
  const url = coverImageUrl(cover);
  return url
    ? el("img", { class: "cover", src: url, alt: "", "aria-hidden": "true", ...props })
    : el(tag, { class: "cover", "aria-hidden": "true", text: cover, ...props });
}

function setLang(lang) {
  state.lang = lang;
  store.set("lang", lang);
  document.documentElement.lang = lang;
}

// ---------- events (only stories played from the Mac's server; imported ones have nobody to tell) ----------

function eventBody(type, extra = {}) {
  const s = state.session;
  return JSON.stringify({
    type, story_id: s.story.id, lang: state.lang, node_id: s.nodeId,
    client_time: new Date().toISOString(), ...extra,
  });
}

function postEvent(type, extra) {
  if (state.session.local) return;
  try {
    fetch("api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: eventBody(type, extra), keepalive: true,
    }).catch(() => {});
  } catch { /* failed events are ignored */ }
}

function beaconAbandoned() {
  if (state.session.local) return;
  try {
    navigator.sendBeacon("api/events", new Blob([eventBody("story_abandoned")], { type: "application/json" }));
  } catch { /* ignore */ }
}

// ---------- audio ----------

const player = new Audio();
player.preload = "auto";

function playCurrent() {
  const s = state.session;
  if (!s) return;
  s.blocked = false;
  const promise = player.play();
  if (promise) {
    promise.catch((err) => {
      if (state.session !== s) return;
      const kind = classifyPlayError(err);
      if (kind === "aborted") return; // superseded by a newer load/pause
      if (kind === "failed") return showAudioError();
      s.blocked = true;
      updateControls();
    });
  }
}

let blobUrl = null;

function setSource(url) {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = url?.startsWith("blob:") ? url : null;
  if (url) player.src = url;
  else player.removeAttribute("src");
}

async function loadNodeAudio(nodeId) {
  const s = state.session;
  if (!s.local) {
    setSource(audioUrl(s.story.id, state.lang, nodeId));
    return playCurrent();
  }
  let blob = null;
  try {
    blob = await getLocalAudio(s.story.id, state.lang, nodeId);
  } catch { /* handled below */ }
  if (state.session !== s || s.nodeId !== nodeId) return; // moved on while reading
  if (!blob) return showAudioError();
  setSource(URL.createObjectURL(blob));
  playCurrent();
}

player.addEventListener("play", () => {
  const s = state.session;
  if (s) {
    s.userPaused = false;
    clearTimeout(s.idleTimer); // a replay is running; the timer is re-armed when it ends
  }
  updateControls();
});
player.addEventListener("pause", () => {
  const s = state.session;
  if (s && !player.ended) {
    s.userPaused = true;
    clearTimeout(s.idleTimer);
  }
  updateControls();
});
player.addEventListener("ended", () => handleEnded());
player.addEventListener("error", () => {
  // Changing or removing `src` is normal; only a real failure of the current source counts.
  if (state.session && player.getAttribute("src") && player.error) showAudioError();
});

function setMediaSession(title) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: t("library") });
    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => restartNode());
    navigator.mediaSession.setActionHandler("nexttrack", () => skipNode());
  } catch { /* optional */ }
}

// ---------- story flow ----------

let opening = false;

async function openStory(id) {
  if (opening || state.session) return; // ignore a second tap while the first is in flight
  opening = true;
  // Called from a card tap; the tap's user activation lets play() work after the fetch.
  try {
    let story = await getLocalStory(id).catch(() => null);
    const local = !!story;
    if (!local) {
      const res = await fetch(`api/stories/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(res.status);
      story = await res.json();
    }
    state.session = { story, local, nodeId: null, repeats: 0, questionEndedAt: null, idleTimer: null, choiceReady: false, blocked: false, userPaused: false, failed: false };
    renderPlayer();
    setMediaSession(pickText(story.title, state.lang));
    goToNode(resumePoint(story, loadProgress(id, state.lang)));
    postEvent("story_started");
  } catch {
    state.session = null;
    renderLibrary();
  } finally {
    opening = false;
  }
}

function goToNode(nodeId) {
  const s = state.session;
  const node = getNode(s.story, nodeId);
  if (!node) return leaveStory(false);
  clearTimeout(s.idleTimer);
  s.nodeId = nodeId;
  s.repeats = 0;
  s.questionEndedAt = null;
  s.choiceReady = false;
  s.userPaused = false;
  s.failed = false;
  if (node.type === "ending") clearProgress(s.story.id, state.lang);
  else saveProgress(s.story.id, state.lang, nodeId);
  renderNode();
  loadNodeAudio(nodeId);
}

function handleEnded() {
  const s = state.session;
  if (!s) return;
  const node = getNode(s.story, s.nodeId);
  if (node?.type === "narration") {
    const next = nextNodeId(s.story, s.nodeId);
    if (next) goToNode(next);
  } else if (node?.type === "choice") {
    showChoices();
  } else if (node?.type === "ending") {
    finishStory();
  }
}

function showChoices() {
  const s = state.session;
  s.choiceReady = true;
  s.questionEndedAt = Date.now();
  renderNode();
  armIdle();
}

function armIdle() {
  const s = state.session;
  clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(onIdle, REPEAT_AFTER_MS);
}

function onIdle() {
  const s = state.session;
  if (!s || !s.choiceReady) return;
  const paused = s.userPaused || document.visibilityState === "hidden";
  if (idleAction({ repeats: s.repeats, paused }) === "repeat") {
    s.repeats += 1;
    postEvent("question_repeated");
    player.currentTime = 0;
    playCurrent();
  } // otherwise wait forever: never choose for the child
}

function showAudioError() {
  const s = state.session;
  if (!s || s.failed) return;
  s.failed = true;
  s.blocked = false;
  clearTimeout(s.idleTimer);
  player.pause();
  const stage = document.getElementById("stage");
  if (stage) {
    stage.replaceChildren(
      el("p", { class: "question", role: "alert", text: t("audioError") }),
      el("div", { class: "options" },
        el("button", { class: "option opt-0", id: "btn-retry", onclick: retryNode },
          el("span", { class: "label", text: t("retry") })),
        el("button", { class: "option opt-1", id: "btn-leave", onclick: () => leaveStory(true) },
          el("span", { class: "label", text: t("back2") }))));
  }
  updateControls();
}

function retryNode() {
  const s = state.session;
  if (!s) return;
  goToNode(s.nodeId);
}

function choose(index) {
  const s = state.session;
  const elapsed = s.questionEndedAt ? Date.now() - s.questionEndedAt : 0;
  postEvent("choice_made", { option_index: index, elapsed_ms: elapsed });
  clearTimeout(s.idleTimer);
  player.pause();
  const next = nextNodeId(s.story, s.nodeId, index);
  if (next) goToNode(next);
}

function finishStory() {
  const s = state.session;
  if (s.finished) return;
  s.finished = true;
  postEvent("story_finished");
  clearProgress(s.story.id, state.lang);
  renderFin();
}

function leaveStory(abandoned = true) {
  const s = state.session;
  if (s && abandoned && !s.finished && s.nodeId) postEvent("story_abandoned");
  if (s) clearTimeout(s.idleTimer);
  player.pause();
  setSource(null);
  state.session = null;
  renderLibrary();
}

// ---------- transport controls ----------

function togglePlay() {
  if (!state.session || state.session.failed) return;
  if (player.paused) playCurrent();
  else player.pause();
}

function restartNode() {
  const s = state.session;
  if (!s || s.finished || s.failed) return;
  clearTimeout(s.idleTimer);
  // On a question the buttons stay on screen; the idle timer restarts when the audio ends again.
  player.currentTime = 0;
  playCurrent();
}

function skipNode() {
  const s = state.session;
  if (!s || s.finished || s.choiceReady || s.failed) return;
  player.pause();
  handleEnded();
}

// ---------- rendering ----------

function renderLibrary() {
  document.documentElement.lang = state.lang;
  document.title = "Huhu";
  const langs = el("div", { class: "langs", role: "group", "aria-label": "Idioma / Sprache" },
    ...LANGS.map((l) => el("button", {
      class: "lang-btn", text: l.toUpperCase(), "aria-pressed": String(l === state.lang),
      onclick: () => { setLang(l); renderLibrary(); },
    })));
  const list = el("div", { class: "cards" }, el("p", { class: "message", text: t("loading") }));
  const settings = el("button", { class: "settings-btn", text: "⚙️", "aria-label": t("settings"), onclick: renderSettings });
  app.replaceChildren(el("div", { class: "topbar" }, el("h1", { text: t("library") }), langs, settings), list);
  loadLibrary(list);
}

// Settings: the stories saved on the phone, each with a button to delete it.
function renderSettings() {
  document.title = t("settings");
  const list = el("div", { class: "cards" }, el("p", { class: "message", text: t("loading") }));
  app.replaceChildren(
    el("div", { class: "topbar" },
      el("button", { class: "back-btn", text: "←", "aria-label": t("back"), onclick: renderLibrary }),
      el("h1", { text: t("settings") })),
    el("h2", { class: "subhead", text: t("myStories") }),
    list);
  loadSettingsList(list);
}

async function loadSettingsList(list) {
  let local = [];
  let failed = false;
  try { local = await listLocal(); } catch { failed = true; }
  if (!list.isConnected) return;
  local.sort((a, b) => pickText(a.title, state.lang).localeCompare(pickText(b.title, state.lang)));
  const notice = state.notice;
  state.notice = null;
  list.replaceChildren(
    ...(notice ? [el("p", { class: "notice", role: "status", text: notice })] : []),
    ...(local.length ? local.map(settingsRow)
      : [el("p", { class: "message", text: failed ? t("loadError") : t("noLocal") })]));
}

function settingsRow(story) {
  const title = pickText(story.title, state.lang);
  return el("div", { class: "card row" },
    coverEl(story.cover, "span"),
    el("span", { class: "title", text: title }),
    el("button", { class: "delete-btn", text: "🗑️", "aria-label": `${t("delete")}: ${title}`, onclick: () => removeStory(story.id, title) }));
}

async function removeStory(id, title) {
  if (!confirm(t("confirmDelete").replace("{title}", title))) return;
  try {
    await deleteLocal(id);
    for (const lang of LANGS) clearProgress(id, lang);
    state.notice = `${t("deleted")} ${title}`;
  } catch {
    state.notice = t("deleteError");
  }
  renderSettings();
}

// Stories from the Mac's server, if there is one (on GitHub Pages there never is).
async function serverStories() {
  try {
    const res = await fetch("api/stories");
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

async function loadLibrary(list) {
  let localFailed = false;
  const [local, remote] = await Promise.all([
    listLocal().catch(() => { localFailed = true; return []; }),
    serverStories(),
  ]);
  if (!list.isConnected) return;
  const ids = new Set(local.map((s) => s.id)); // a story saved on the phone wins: it works offline
  const stories = [...local, ...remote.filter((s) => !ids.has(s.id))]
    .filter((s) => !s.languages || s.languages.includes(state.lang))
    .sort((a, b) => pickText(a.title, state.lang).localeCompare(pickText(b.title, state.lang)));
  const notice = state.notice;
  state.notice = null;
  list.replaceChildren(
    ...(notice ? [el("p", { class: "notice", role: "status", text: notice })] : []),
    ...(stories.length ? stories.map(storyCard)
      : [el("p", { class: "message", text: localFailed ? t("loadError") : t("empty") })]),
    addButton());
}

function addButton() {
  const input = el("input", { type: "file", accept: ".zip,application/zip", hidden: "" });
  input.addEventListener("change", () => input.files[0] && addStories(input.files[0]));
  return el("div", { class: "add" }, input,
    el("button", { class: "text-toggle", text: t("add"), onclick: () => input.click() }));
}

async function addStories(file) {
  const list = app.querySelector(".cards");
  list?.replaceChildren(el("p", { class: "message", role: "status", text: t("adding") }));
  try {
    const { added } = await importZip(file, LANGS);
    state.notice = added.length
      ? `${t("added")} ${added.map((s) => pickText(s.title, state.lang)).join(", ")}`
      : t("addError");
  } catch {
    state.notice = t("addError");
  }
  if (!state.session) renderLibrary();
}

function storyCard(story) {
  const title = pickText(story.title, state.lang);
  const started = loadProgress(story.id, state.lang)?.nodeId;
  return el("button", { class: "card", "aria-label": title, onclick: () => openStory(story.id) },
    coverEl(story.cover, "span"),
    el("span", { class: "title", text: title }),
    started ? el("span", { class: "badge", text: t("resume") }) : "");
}

function renderPlayer() {
  const s = state.session;
  const title = pickText(s.story.title, state.lang);
  document.title = title;
  const stage = el("section", { class: "stage", id: "stage" });
  const bar = el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, el("div", { id: "bar" }));
  const controls = el("div", { class: "controls" },
    el("button", { class: "ctl", id: "btn-restart", text: "⏮", "aria-label": t("restart"), onclick: restartNode }),
    el("button", { class: "ctl main", id: "btn-play", onclick: togglePlay }),
    el("button", { class: "ctl", id: "btn-skip", text: "⏭", "aria-label": t("skip"), onclick: skipNode }));
  const bigplay = el("button", { class: "bigplay", id: "bigplay", text: `▶ ${t("startPlaying")}`, hidden: "", onclick: togglePlay });
  app.replaceChildren(el("div", { class: "player" },
    el("button", { class: "back-btn", text: "←", "aria-label": t("back"), onclick: () => leaveStory(true) }),
    stage, bigplay, bar, controls));
  updateControls();
}

function renderNode() {
  const s = state.session;
  const node = getNode(s.story, s.nodeId);
  const stage = document.getElementById("stage");
  if (!stage || !node) return;
  const bar = document.getElementById("bar");
  const pct = Math.round(progressFraction(s.story, s.nodeId) * 100);
  bar.style.width = `${pct}%`;
  bar.parentElement.setAttribute("aria-valuenow", String(pct));

  if (node.type === "choice" && s.choiceReady) {
    stage.replaceChildren(renderChoice(node));
  } else if (node.type === "choice") {
    stage.replaceChildren(
      coverEl(s.story.cover, "div"),
      el("p", { class: "question", "aria-live": "polite", text: pickText(node.question, state.lang) }));
  } else {
    stage.replaceChildren(...renderListening(node));
  }
  updateControls();
}

function renderListening(node) {
  const s = state.session;
  const parts = [
    coverEl(s.story.cover, "div"),
    el("h1", { text: pickText(s.story.title, state.lang) }),
  ];
  const text = el("p", { class: "narration-text", text: pickText(node.text, state.lang) });
  text.hidden = !state.showText;
  const toggle = el("button", {
    class: "text-toggle", "aria-expanded": String(state.showText),
    text: state.showText ? t("hideText") : t("showText"),
    onclick: () => {
      state.showText = !state.showText;
      store.set("showText", state.showText ? "1" : "0");
      text.hidden = !state.showText;
      toggle.textContent = state.showText ? t("hideText") : t("showText");
      toggle.setAttribute("aria-expanded", String(state.showText));
    },
  });
  parts.push(toggle, text);
  return parts;
}

function renderChoice(node) {
  // `.choice-extras` is the slot for future extra inputs (e.g. a voice button).
  return el("div", { class: "choice" },
    el("p", { class: "question", "aria-live": "polite", text: pickText(node.question, state.lang) }),
    el("div", { class: "options" }, ...node.options.map((opt, i) =>
      el("button", {
        class: `option opt-${i}`, "aria-label": pickText(opt.label, state.lang), onclick: () => choose(i),
      },
      el("span", { class: "icon", "aria-hidden": "true", text: opt.icon }),
      el("span", { class: "label", text: pickText(opt.label, state.lang) })))),
    el("div", { class: "choice-extras", id: "choice-extras" }));
}

function renderFin() {
  document.getElementById("bar")?.style.setProperty("width", "100%");
  app.replaceChildren(el("section", { class: "fin" },
    el("div", { class: "big", role: "status", text: t("fin") }),
    coverEl(state.session.story.cover, "div", { style: "font-size:80px" }),
    el("button", { class: "home", text: t("back"), onclick: () => leaveStory(false) })));
  app.querySelector(".home").focus();
}

function updateControls() {
  const play = document.getElementById("btn-play");
  if (!play) return;
  const s = state.session;
  const paused = player.paused;
  play.textContent = paused ? "▶" : "⏸";
  play.setAttribute("aria-label", paused ? t("play") : t("pause"));
  document.getElementById("btn-skip").disabled = !!s?.choiceReady;
  const big = document.getElementById("bigplay");
  big.hidden = !(s?.blocked && paused);
}

// ---------- boot ----------

document.addEventListener("visibilitychange", () => {
  const s = state.session;
  if (document.visibilityState === "hidden" && s && !s.finished && s.nodeId) beaconAbandoned();
  // Coming back to a waiting question: the countdown starts again from zero.
  if (document.visibilityState === "visible" && s?.choiceReady && !s.userPaused && player.ended) armIdle();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

setLang(state.lang);
renderLibrary();
