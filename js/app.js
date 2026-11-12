import {
  coverImageUrl,
  REPEAT_AFTER_MS,
  getNode,
  nextNodeId,
  audioUrl,
  libraryOrder,
  pathProgress,
  lanternFills,
  endingIds,
  pickText,
  classifyPlayError,
  idleAction,
  inLanguage,
  countByLanguage,
} from "./logic.js";
import { listLocal, getLocalStory, getLocalAudio, importZip, deleteLocal } from "./library.js";

// ---------- strings ----------

const STRINGS = {
  es: {
    library: "Cuentos", loading: "Cargando…", loadError: "No se pueden cargar los cuentos",
    retry: "Reintentar", back: "Volver a los cuentos", fin: "¡Fin!",
    showText: "Ver texto", hideText: "Ocultar texto", textShort: "Texto", play: "Escuchar", pause: "Pausa",
    restart: "Otra vez este trozo", restartShort: "Otra vez", startPlaying: "Toca para escuchar",
    replayQuestion: "Oír la pregunta otra vez", path: "Camino del cuento",
    replay: "Escuchar otra vez", others: "Otros cuentos",
    endingsFound: "Has encontrado {n} de {total} finales.", endingOnly: "Has encontrado el final.",
    allEndings: "¡Has encontrado todos los finales!", moreEndings: "Quedan caminos por descubrir.",
    endingsLabel: "{n} de {total} finales encontrados",
    audioError: "No puedo cargar este cuento ahora.",
    welcomeLead: "Cuentos narrados en los que el niño elige cómo sigue la historia.",
    welcomeSteps: [
      "Pide el archivo de cuentos a quien te pasó Huhu. Su nombre termina en «-huhu-export.zip».",
      "Toca «Añadir cuentos» y elige ese archivo.",
      "Los cuentos se quedan en el móvil y funcionan sin internet.",
    ],
    install: "Para tenerlo como una app: en Chrome, menú ⋮ → «Añadir a pantalla de inicio». En iPhone, con Safari: Compartir → «Añadir a pantalla de inicio» (así los cuentos no se borran).",
    add: "Añadir cuentos", adding: "Añadiendo cuentos…",
    addedOne: "Listo: «{title}» ya está en el móvil y funciona sin internet.",
    addedMany: "Listo: {n} cuentos ya están en el móvil y funcionan sin internet.",
    addError: "Este archivo no es un paquete de cuentos de Huhu. Busca uno cuyo nombre termine en «-huhu-export.zip».",
    addCompressed: "Este zip está comprimido y Huhu no puede leerlo. Hay que hacerlo sin comprimir («almacenar»).",
    addIncomplete: "En este archivo no hay ningún cuento completo ({names}): falta el story.json, algún texto o algún audio.",
    addPartial: "No se han podido añadir: {names} (falta texto o audio).",
    addFull: "No queda espacio en el móvil para estos cuentos. Borra alguno o libera espacio y vuelve a probar.",
    adults: "Gestionar cuentos", holdHint: "Mantén pulsado",
    howText: "Los cuentos se guardan en este móvil. Si añades un cuento que ya estaba, se sustituye por la versión nueva.",
    myStories: "Cuentos", noLocal: "No hay cuentos guardados en este móvil.",
    onMac: "Los cuentos sin papelera llegan desde el Mac y no se pueden borrar desde aquí.",
    delete: "Borrar", confirmDelete: "¿Borrar «{title}»?", confirmYes: "Sí, borrar", confirmNo: "No",
    deleted: "Borrado: «{title}».", deleteError: "No se ha podido borrar el cuento.",
    language: "Idioma", caps: "Letra mayúscula",
    formatLink: "Cómo crear tus propios cuentos", formatHint: "El formato del archivo, con IA o a mano", formatTitle: "Formato de los cuentos",
    fmtIntro: `Para añadir un cuento a Huhu hace falta un archivo .zip. Dentro va una carpeta por cuento, con el texto (story.json) y un audio MP3 por cada parte del cuento.`,
    fmtZipH: "1. Qué lleva el zip",
    fmtZipP: "La carpeta se llama igual que el id del cuento. Cada idioma tiene su propia carpeta de audio.",
    fmtJsonH: "2. El texto: story.json",
    fmtJsonP: `Es una lista de partes («nodos») enlazadas entre sí. Todo texto va por idioma, así: { "es": "…" }.`,
    fmtFields: [
      "id: igual que la carpeta; solo minúsculas, números, - y _.",
      "cover: un emoji, o un dibujo SVG.",
      "title: el título.",
      "start: el nodo por el que empieza.",
      "choices: elecciones en cada recorrido (1, 2 o 3; por defecto 3).",
      "narration: un trozo de historia (text) y el nodo siguiente (next).",
      "choice: una pregunta (question) y 2 o 3 opciones, cada una con icon (emoji), label y next.",
      "ending: un final (text).",
    ],
    fmtAudioH: "3. El audio",
    fmtAudioP: "Un MP3 por cada nodo: la narración, la pregunta de cada elección y cada final. Se llama como el nodo (inicio.mp3) y va en audio/idioma/. Si ofreces un idioma, necesita el texto completo y todos los audios; si falta algo, ese idioma no aparece.",
    fmtMakeH: "4. Hacer el zip",
    fmtMakeP: "El zip tiene que ir sin comprimir («almacenar»). El «Comprimir» del Finder no sirve: Huhu lo rechaza.",
    fmtMac: "En Mac (Terminal), desde la carpeta que contiene la de tu cuento:",
    fmtWin: "En Windows, con 7-Zip: nivel de compresión «Almacenar».",
    fmtAiH: "Con una IA",
    fmtAiP: "Pide el story.json a un asistente (Claude, ChatGPT…) con este mensaje. Cambia lo que va entre corchetes por tu idea.",
    fmtAiAudio: "El audio no lo hace la IA sola: grábalo o genéralo con una voz sintética (ElevenLabs, el lector de tu móvil…), un MP3 por nodo con el nombre del nodo. Luego sigue los pasos 1 y 4.",
    fmtPrompt: `Escribe un cuento infantil interactivo (para niños de 6 a 10 años) sobre: [tu idea]. Devuélveme solo un story.json válido, en español (clave "es"), con el formato del ejemplo. Reglas: id en minúsculas y sin espacios; tres tipos de nodo (narration, choice con 2 o 3 opciones, ending); todos los textos son diccionarios por idioma; todas las ramas llegan a un final y no hay ciclos; entre 2 y 12 finales; todos los recorridos con el mismo número de elecciones (indícalo en "choices"). Se leerá en voz alta: frases cortas y claras.`,
    fmtExample: "Ejemplo", copy: "Copiar mensaje", copied: "¡Copiado!",
    exTitle: "El viaje de la luna", exStart: "Había una luna muy curiosa que quería ver el mundo.", exQuestion: "¿Adónde va la luna?",
    exA: "Al mar", exB: "Al bosque", exEndA: "La luna se miró en el mar y sonrió.", exEndB: "La luna se durmió entre los árboles.",
  },
  de: {
    library: "Geschichten", loading: "Laden…", loadError: "Geschichten können nicht geladen werden",
    retry: "Nochmal", back: "Zurück zu den Geschichten", fin: "Ende!",
    showText: "Text zeigen", hideText: "Text verbergen", textShort: "Text", play: "Anhören", pause: "Pause",
    restart: "Diesen Teil nochmal", restartShort: "Nochmal", startPlaying: "Tippen zum Anhören",
    replayQuestion: "Frage nochmal hören", path: "Weg der Geschichte",
    replay: "Nochmal anhören", others: "Andere Geschichten",
    endingsFound: "Du hast {n} von {total} Enden gefunden.", endingOnly: "Du hast das Ende gefunden.",
    allEndings: "Du hast alle Enden gefunden!", moreEndings: "Es gibt noch andere Wege zu entdecken.",
    endingsLabel: "{n} von {total} Enden gefunden",
    audioError: "Ich kann diese Geschichte gerade nicht laden.",
    welcomeLead: "Vorgelesene Geschichten, in denen das Kind entscheidet, wie es weitergeht.",
    welcomeSteps: [
      "Lass dir die Geschichten-Datei von der Person geben, die dir Huhu gezeigt hat. Ihr Name endet auf »-huhu-export.zip«.",
      "Tippe auf »Geschichten hinzufügen« und wähle die Datei.",
      "Die Geschichten bleiben auf dem Handy und funktionieren ohne Internet.",
    ],
    install: "Als App speichern: in Chrome Menü ⋮ → »Zum Startbildschirm hinzufügen«. Auf dem iPhone mit Safari: Teilen → »Zum Home-Bildschirm« (so werden die Geschichten nicht gelöscht).",
    add: "Geschichten hinzufügen", adding: "Geschichten werden hinzugefügt…",
    addedOne: "Fertig: »{title}« ist auf dem Handy und funktioniert ohne Internet.",
    addedMany: "Fertig: {n} Geschichten sind auf dem Handy und funktionieren ohne Internet.",
    addError: "Diese Datei ist kein Huhu-Geschichtenpaket. Such eine Datei, deren Name auf »-huhu-export.zip« endet.",
    addCompressed: "Diese Zip-Datei ist komprimiert, und Huhu kann sie nicht lesen. Sie muss unkomprimiert sein (»Speichern«).",
    addIncomplete: "In dieser Datei ist keine vollständige Geschichte ({names}): Es fehlt die story.json, ein Text oder ein Audio.",
    addPartial: "Nicht hinzugefügt: {names} (Text oder Audio fehlt).",
    addFull: "Auf dem Handy ist kein Platz mehr für diese Geschichten. Lösche eine oder schaffe Platz und versuche es erneut.",
    adults: "Geschichten verwalten", holdHint: "Gedrückt halten",
    howText: "Die Geschichten werden auf diesem Handy gespeichert. Fügst du eine Geschichte erneut hinzu, wird sie durch die neue Version ersetzt.",
    myStories: "Geschichten", noLocal: "Auf diesem Handy sind keine Geschichten gespeichert.",
    onMac: "Geschichten ohne Papierkorb kommen vom Mac und lassen sich hier nicht löschen.",
    delete: "Löschen", confirmDelete: "»{title}« löschen?", confirmYes: "Ja, löschen", confirmNo: "Nein",
    deleted: "Gelöscht: »{title}«.", deleteError: "Die Geschichte konnte nicht gelöscht werden.",
    language: "Sprache", caps: "Großbuchstaben",
    formatLink: "Eigene Geschichten erstellen", formatHint: "Das Dateiformat, mit KI oder von Hand", formatTitle: "Format der Geschichten",
    fmtIntro: `Um Huhu eine Geschichte hinzuzufügen, brauchst du eine .zip-Datei. Darin liegt ein Ordner pro Geschichte, mit dem Text (story.json) und einer MP3-Datei für jeden Teil der Geschichte.`,
    fmtZipH: "1. Was in die Zip-Datei kommt",
    fmtZipP: "Der Ordner heißt genauso wie die ID der Geschichte. Jede Sprache hat einen eigenen Audio-Ordner.",
    fmtJsonH: "2. Der Text: story.json",
    fmtJsonP: `Eine Liste von Teilen (»Knoten«), die miteinander verbunden sind. Jeder Text steht pro Sprache, so: { "de": "…" }.`,
    fmtFields: [
      "id: wie der Ordner; nur Kleinbuchstaben, Zahlen, - und _.",
      "cover: ein Emoji oder eine SVG-Zeichnung.",
      "title: der Titel.",
      "start: der Knoten, mit dem es beginnt.",
      "choices: Entscheidungen auf jedem Weg (1, 2 oder 3; Standard 3).",
      "narration: ein Stück Geschichte (text) und der nächste Knoten (next).",
      "choice: eine Frage (question) und 2 oder 3 Optionen, jede mit icon (Emoji), label und next.",
      "ending: ein Ende (text).",
    ],
    fmtAudioH: "3. Das Audio",
    fmtAudioP: "Eine MP3 für jeden Knoten: die Erzählung, die Frage jeder Entscheidung und jedes Ende. Sie heißt wie der Knoten (inicio.mp3) und liegt in audio/Sprache/. Eine Sprache braucht den kompletten Text und alle Audios; fehlt etwas, erscheint die Sprache nicht.",
    fmtMakeH: "4. Die Zip-Datei erstellen",
    fmtMakeP: "Die Zip-Datei muss unkomprimiert sein (»Speichern«). Das »Komprimieren« im Finder funktioniert nicht: Huhu lehnt es ab.",
    fmtMac: "Auf dem Mac (Terminal), in dem Ordner, der den Ordner deiner Geschichte enthält:",
    fmtWin: "Unter Windows mit 7-Zip: Kompressionsstufe »Speichern«.",
    fmtAiH: "Mit einer KI",
    fmtAiP: "Bitte einen Assistenten (Claude, ChatGPT …) mit dieser Nachricht um die story.json. Ersetze den Teil in eckigen Klammern durch deine Idee.",
    fmtAiAudio: `Das Audio erzeugt die KI nicht von selbst: nimm es auf oder erzeuge es mit einer synthetischen Stimme (ElevenLabs, die Vorlesefunktion deines Handys …), eine MP3 pro Knoten, benannt wie der Knoten. Dann weiter mit Schritt 1 und 4.`,
    fmtPrompt: `Schreibe eine interaktive Kindergeschichte (für Kinder von 6 bis 10 Jahren) über: [deine Idee]. Gib mir nur eine gültige story.json zurück, auf Deutsch (Schlüssel "de"), im Format des Beispiels. Regeln: id in Kleinbuchstaben und ohne Leerzeichen; drei Knotentypen (narration, choice mit 2 oder 3 Optionen, ending); alle Texte sind Wörterbücher pro Sprache; alle Zweige enden in einem Ende und es gibt keine Schleifen; zwischen 2 und 12 Enden; alle Wege mit gleich vielen Entscheidungen (in "choices" angeben). Sie wird vorgelesen: kurze, klare Sätze.`,
    fmtExample: "Beispiel", copy: "Nachricht kopieren", copied: "Kopiert!",
    exTitle: "Die Reise des Mondes", exStart: "Es war einmal ein sehr neugieriger Mond, der die Welt sehen wollte.", exQuestion: "Wohin fliegt der Mond?",
    exA: "Zum Meer", exB: "In den Wald", exEndA: "Der Mond sah sich im Meer an und lächelte.", exEndB: "Der Mond schlief zwischen den Bäumen ein.",
  },
  ca: {
    library: "Contes", loading: "Carregant…", loadError: "No es poden carregar els contes",
    retry: "Tornar-ho a provar", back: "Tornar als contes", fin: "Fi!",
    showText: "Veure el text", hideText: "Amagar el text", textShort: "Text", play: "Escoltar", pause: "Pausa",
    restart: "Una altra vegada aquest tros", restartShort: "Un altre cop", startPlaying: "Toca per escoltar",
    replayQuestion: "Tornar a sentir la pregunta", path: "Camí del conte",
    replay: "Escoltar un altre cop", others: "Altres contes",
    endingsFound: "Has trobat {n} de {total} finals.", endingOnly: "Has trobat el final.",
    allEndings: "Has trobat tots els finals!", moreEndings: "Encara queden camins per descobrir.",
    endingsLabel: "{n} de {total} finals trobats",
    audioError: "Ara no puc carregar aquest conte.",
    welcomeLead: "Contes narrats en què l'infant tria com continua la història.",
    welcomeSteps: [
      "Demana l'arxiu de contes a qui et va passar Huhu. El seu nom acaba en «-huhu-export.zip».",
      "Toca «Afegir contes» i tria aquest arxiu.",
      "Els contes es queden al mòbil i funcionen sense internet.",
    ],
    install: "Per tenir-lo com una app: a Chrome, menú ⋮ → «Afegeix a la pantalla d'inici». A l'iPhone, amb Safari: Comparteix → «Afegeix a la pantalla d'inici» (així els contes no s'esborren).",
    add: "Afegir contes", adding: "Afegint contes…",
    addedOne: "Fet: «{title}» ja és al mòbil i funciona sense internet.",
    addedMany: "Fet: {n} contes ja són al mòbil i funcionen sense internet.",
    addError: "Aquest arxiu no és un paquet de contes de Huhu. Busca'n un el nom del qual acabi en «-huhu-export.zip».",
    addCompressed: "Aquest zip està comprimit i Huhu no el pot llegir. Cal fer-lo sense comprimir («emmagatzemar»).",
    addIncomplete: "En aquest arxiu no hi ha cap conte complet ({names}): hi falta el story.json, algun text o algun àudio.",
    addPartial: "No s'han pogut afegir: {names} (hi falta text o àudio).",
    addFull: "No queda espai al mòbil per a aquests contes. Esborra'n algun o allibera espai i torna-ho a provar.",
    adults: "Gestionar contes", holdHint: "Mantén premut",
    howText: "Els contes es guarden en aquest mòbil. Si afegeixes un conte que ja hi era, se substitueix per la versió nova.",
    myStories: "Contes", noLocal: "No hi ha contes desats en aquest mòbil.",
    onMac: "Els contes sense paperera vénen del Mac i no es poden esborrar des d'aquí.",
    delete: "Esborrar", confirmDelete: "Vols esborrar «{title}»?", confirmYes: "Sí, esborrar", confirmNo: "No",
    deleted: "Esborrat: «{title}».", deleteError: "No s'ha pogut esborrar el conte.",
    language: "Llengua", caps: "Lletra majúscula",
    formatLink: "Com crear els teus propis contes", formatHint: "El format de l'arxiu, amb IA o a mà", formatTitle: "Format dels contes",
    fmtIntro: `Per afegir un conte a Huhu cal un arxiu .zip. A dins hi va una carpeta per conte, amb el text (story.json) i un àudio MP3 per cada part del conte.`,
    fmtZipH: "1. Què porta el zip",
    fmtZipP: "La carpeta es diu igual que l'id del conte. Cada llengua té la seva pròpia carpeta d'àudio.",
    fmtJsonH: "2. El text: story.json",
    fmtJsonP: `És una llista de parts («nodes») enllaçades entre si. Tot text va per llengua, així: { "ca": "…" }.`,
    fmtFields: [
      "id: igual que la carpeta; només minúscules, números, - i _.",
      "cover: un emoji o un dibuix SVG.",
      "title: el títol.",
      "start: el node pel qual comença.",
      "choices: eleccions a cada recorregut (1, 2 o 3; per defecte 3).",
      "narration: un tros d'història (text) i el node següent (next).",
      "choice: una pregunta (question) i 2 o 3 opcions, cadascuna amb icon (emoji), label i next.",
      "ending: un final (text).",
    ],
    fmtAudioH: "3. L'àudio",
    fmtAudioP: "Un MP3 per cada node: la narració, la pregunta de cada elecció i cada final. Es diu com el node (inicio.mp3) i va a audio/llengua/. Si ofereixes una llengua, cal el text complet i tots els àudios; si falta res, aquesta llengua no apareix.",
    fmtMakeH: "4. Fer el zip",
    fmtMakeP: "El zip ha d'anar sense comprimir («emmagatzemar»). El «Comprimeix» del Finder no serveix: Huhu el rebutja.",
    fmtMac: "Al Mac (Terminal), des de la carpeta que conté la del teu conte:",
    fmtWin: "A Windows, amb 7-Zip: nivell de compressió «Emmagatzemar».",
    fmtAiH: "Amb una IA",
    fmtAiP: "Demana el story.json a un assistent (Claude, ChatGPT…) amb aquest missatge. Canvia el que va entre claudàtors per la teva idea.",
    fmtAiAudio: "L'àudio no el fa la IA sola: grava'l o genera'l amb una veu sintètica (ElevenLabs, el lector del mòbil…), un MP3 per node amb el nom del node. Després segueix els passos 1 i 4.",
    fmtPrompt: `Escriu un conte infantil interactiu (per a nens de 6 a 10 anys) sobre: [la teva idea]. Retorna'm només un story.json vàlid, en català (clau "ca"), amb el format de l'exemple. Regles: id en minúscules i sense espais; tres tipus de node (narration, choice amb 2 o 3 opcions, ending); tots els textos són diccionaris per llengua; totes les branques arriben a un final i no hi ha cicles; entre 2 i 12 finals; tots els recorreguts amb el mateix nombre d'eleccions (indica'l a "choices"). S'explicarà en veu alta: frases curtes i clares.`,
    fmtExample: "Exemple", copy: "Copiar el missatge", copied: "Copiat!",
    exTitle: "El viatge de la lluna", exStart: "Hi havia una lluna molt curiosa que volia veure el món.", exQuestion: "On va la lluna?",
    exA: "Al mar", exB: "Al bosc", exEndA: "La lluna es va mirar al mar i va somriure.", exEndB: "La lluna es va adormir entre els arbres.",
  },
};
const LANGS = ["es", "de", "ca"];
const LANTERNS = 8; // lanterns along the story's path
const HOLD_MS = 1500; // press-and-hold that opens the adults' area

// Each language with its own name and a drawn flag (emoji flags are missing on many phones: there is no Catalan one).
const LANG_NAMES = { es: "Español", de: "Deutsch", ca: "Català" };
const stripes = (colors) => colors.map((c, i) => `<rect y="${(2 * i) / colors.length}" width="3" height="${2 / colors.length + 0.01}" fill="${c}"/>`).join("");
const FLAGS = {
  es: stripes(["#AA151B", "#F1BF00", "#F1BF00", "#AA151B"]), // rojo, amarillo (doble), rojo
  de: stripes(["#000000", "#DD0000", "#FFCE00"]),
  ca: stripes(["#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09"]), // senyera
};
const flagUrl = (lang) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2">${FLAGS[lang]}</svg>`)}`;
const flagEl = (lang) => el("img", { class: "flag", src: flagUrl(lang), alt: "", "aria-hidden": "true" });

// ---------- drawn icons (one stroke, round ends) ----------

const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = {
  back: '<path d="M14.5 5 7.5 12l7 7"/>',
  play: '<path d="M8 4.8v14.4a.8.8 0 0 0 1.2.7l11-7.2a.8.8 0 0 0 0-1.4l-11-7.2A.8.8 0 0 0 8 4.8Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor" stroke="none"/>',
  replay: '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3"/><path d="M4.4 3.6v4h4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l1 12.5h8.4l1-12.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  caret: '<path d="m7 10 5 5 5-5"/>',
  book: '<path d="M3.5 5.5H9a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5h-6Z"/><path d="M20.5 5.5H15a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5h6Z"/>',
  text: '<path d="M5 7h14M5 12h14M5 17h9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 7.5v6M12 17v.5"/><circle cx="12" cy="12" r="9"/>',
  next: '<path d="m9.5 5 7 7-7 7"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
};

function icon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icon-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICONS[name];
  return svg;
}

// Huhu, the owl of the app icon. "worried" (when a story cannot load): brows up, eyes looking down.
function owl(cls = "owl", mood = "") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    '<path d="M11 25 13 5l14 11ZM53 25 51 5 37 16Z" fill="#1f8a7d"/>' +
    '<ellipse cx="32" cy="36" rx="24" ry="25" fill="#2fb5a3"/>' +
    '<ellipse cx="32" cy="44" rx="14" ry="13" fill="#5cc9b8"/>' +
    '<circle cx="22.5" cy="31" r="9.5" fill="#fdf4dc"/><circle cx="41.5" cy="31" r="9.5" fill="#fdf4dc"/>' +
    (mood === "worried"
      ? '<circle cx="22.5" cy="34" r="4.8" fill="#1d2433"/><circle cx="41.5" cy="34" r="4.8" fill="#1d2433"/>' +
        '<circle cx="24" cy="32.4" r="1.6" fill="#fdf4dc"/><circle cx="43" cy="32.4" r="1.6" fill="#fdf4dc"/>' +
        '<path d="M13.5 21.5 26 17M50.5 21.5 38 17" stroke="#1d2433" stroke-width="3.4" stroke-linecap="round"/>'
      : '<circle cx="23.5" cy="32" r="4.8" fill="#1d2433"/><circle cx="40.5" cy="32" r="4.8" fill="#1d2433"/>' +
        '<circle cx="25" cy="30.4" r="1.6" fill="#fdf4dc"/><circle cx="42" cy="30.4" r="1.6" fill="#fdf4dc"/>') +
    '<path d="M28.5 39h7L32 44.5Z" fill="#f6c445"/>' +
    '<path d="M24 59.5v3M27.5 59.5v3M36.5 59.5v3M40 59.5v3" stroke="#c99a2e" stroke-width="2.6" stroke-linecap="round"/>'; // talons
  return svg;
}

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

const readJson = (key) => {
  try { return JSON.parse(store.get(key)); } catch { return null; }
};

// Keys older versions kept per story (when it was last opened, and where it was left halfway).
// Nothing writes them now; deleting a story still clears them.
const playedKey = (id) => `played:${id}`;
const legacyProgressKey = (id, lang) => `progress:${id}:${lang}`;
function forgetPlayed(id) {
  store.del(playedKey(id));
  for (const lang of LANGS) store.del(legacyProgressKey(id, lang));
}

// Endings found in a story (by node id; the same in every language), kept like stamps.
const endingsKey = (id) => `endings:${id}`;
function foundEndings(id) {
  const list = readJson(endingsKey(id));
  return Array.isArray(list) ? list : [];
}
function addFoundEnding(id, nodeId) {
  const list = foundEndings(id);
  if (!list.includes(nodeId)) store.set(endingsKey(id), JSON.stringify([...list, nodeId]));
}

// ---------- state ----------

const app = document.getElementById("app");
const state = {
  lang: LANGS.includes(store.get("lang")) ? store.get("lang") : "es",
  showText: store.get("showText") === "1",
  caps: store.get("caps") === "1", // the child's text in capitals, the letters early readers learn first
  session: null, // active story: {story, local, nodeId, repeats, questionEndedAt, idleTimer, choiceReady, blocked}
  notice: null, // {text, kind} shown once (result of an import or a delete)
};
const t = (key) => STRINGS[state.lang][key];
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  const { class: cls, text, ...rest } = props;
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  for (const [k, v] of Object.entries(rest)) {
    if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== ""));
  return node;
}

// Emoji covers are text; SVG covers are images sized by the same font-size rules (1em).
function coverEl(cover) {
  const url = coverImageUrl(cover);
  return url
    ? el("img", { class: "cover", src: url, alt: "", "aria-hidden": "true" })
    : el("span", { class: "cover", "aria-hidden": "true", text: cover });
}

// Every cover sits on the same bark disc; only its size changes per screen.
const disc = (cover, size) => el("div", { class: `disc disc-${size}` }, coverEl(cover));

function setLang(lang) {
  state.lang = lang;
  store.set("lang", lang);
  document.documentElement.lang = lang;
}

const standalone = () => {
  try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch { return false; }
};

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
player.addEventListener("timeupdate", () => updatePath());
player.addEventListener("ended", () => handleEnded());
player.addEventListener("error", () => {
  // Changing or removing `src` is normal; only a real failure of the current source counts.
  if (state.session && player.getAttribute("src") && player.error) showAudioError();
});

function setMediaSession(title) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: "Huhu" });
    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => restartNode());
    // Skipping a part is only offered on the lock screen / notification (for adults), not on the child's screen.
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
    goToNode(story.start);
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
  if (node.type === "ending") addFoundEnding(s.story.id, nodeId);
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
    // Huhu, worried, sits on the story's disc: a child who can't read the sentence still sees something went wrong.
    // One way forward (try again); the back arrow above is the way out.
    stage.className = "stage failed";
    stage.replaceChildren(
      el("div", { class: "perch" }, disc(s.story.cover, "stage"), owl("owl", "worried")),
      el("p", { class: "question", role: "alert", text: t("audioError") }),
      el("div", { class: "actions" },
        el("button", { class: "btn primary wide", id: "btn-retry", onclick: retryNode }, icon("replay"), el("span", { text: t("retry") }))));
  }
  updateControls();
  document.getElementById("btn-retry")?.focus();
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
  renderFin();
}

// From the ending: the same story again from the start, to find another path.
function replayStory() {
  const s = state.session;
  if (!s) return;
  s.finished = false;
  renderPlayer();
  goToNode(s.story.start);
  postEvent("story_started");
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

// ---------- the lantern path (the story's progress) ----------

function lanternPath(cls = "") {
  return el("div", {
    class: `path ${cls}`.trim(), id: "path", role: "progressbar",
    "aria-label": t("path"), "aria-valuemin": "0", "aria-valuemax": "100",
  }, ...Array.from({ length: LANTERNS }, (_, i) => el("span", { class: "lantern", style: `--i:${i}` }, el("i"))));
}

function setPath(fraction) {
  const path = document.getElementById("path");
  if (!path) return;
  lanternFills(fraction, LANTERNS).forEach((f, i) => {
    const lantern = path.children[i];
    lantern.style.setProperty("--fill", f.toFixed(3));
    lantern.classList.toggle("lit", f >= 1);
  });
  path.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
}

function updatePath() {
  const s = state.session;
  if (!s || s.finished) return;
  const node = getNode(s.story, s.nodeId);
  if (!node) return;
  const ratio = node.type === "choice" || !player.duration ? 0 : player.currentTime / player.duration;
  setPath(pathProgress(s.story, s.nodeId, ratio));
}

// Small lanterns for the endings of a story: lit for each one already found.
function endingLanterns(found, total) {
  return el("span", { class: "endings", role: "img", "aria-label": fill(t("endingsLabel"), { n: found, total }) },
    ...Array.from({ length: total }, (_, i) => el("i", { class: i < found ? "on" : "" })));
}

// ---------- press-and-hold (keeps adults' controls away from little fingers) ----------

function holdButton(label, onDone) {
  let timer = null;
  const btn = el("button", { class: "hold", "aria-label": `${label} (${t("holdHint")})` },
    el("span", { class: "hold-ring" }, icon("lock")),
    el("span", { class: "hold-text" }, el("strong", { text: label }), el("span", { text: t("holdHint") })));
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove("holding"); };
  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    btn.classList.add("holding");
    timer = setTimeout(() => { cancel(); onDone(); }, HOLD_MS);
  });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) btn.addEventListener(ev, cancel);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  // Keyboard and screen readers open it directly (e.detail is 0 for those clicks).
  btn.addEventListener("click", (e) => { if (e.detail === 0) onDone(); });
  return btn;
}

// ---------- rendering ----------

function langButton() {
  return el("button", {
    class: "lang-btn", "aria-haspopup": "dialog", "aria-label": `${t("language")}: ${LANG_NAMES[state.lang]}`,
    onclick: openLangPicker,
  }, flagEl(state.lang), el("span", { class: "lang-name", text: LANG_NAMES[state.lang] }), icon("caret"));
}

// Capitals are only a CSS class (text-transform): the stories' text stays as written, and ß becomes SS on its own.
function applyCaps() {
  document.documentElement.classList.toggle("caps", state.caps);
}

function capsButton() {
  const btn = el("button", { class: "caps-btn", "aria-label": t("caps"), "aria-pressed": String(state.caps) },
    el("span", { "aria-hidden": "true", text: "ABC" }));
  btn.addEventListener("click", () => {
    state.caps = !state.caps;
    store.set("caps", state.caps ? "1" : "0");
    applyCaps();
    btn.setAttribute("aria-pressed", String(state.caps));
  });
  return btn;
}

function masthead() {
  return el("header", { class: "masthead" },
    owl(), el("span", { class: "brand", text: "Huhu" }), capsButton(), langButton());
}

function buildNotice(notice) {
  return el("div", { class: `notice ${notice.kind}`, role: notice.kind === "error" ? "alert" : "status", tabindex: "-1" },
    icon(notice.kind === "error" ? "alert" : "check"),
    el("div", { class: "notice-body" },
      el("p", { text: notice.text }),
      notice.format ? el("button", { class: "btn small", onclick: renderFormat }, icon("book"), el("span", { text: t("formatLink") })) : null));
}

// Brings a notice into view and gives it focus, so the result of an action is never off-screen
// or lost to a screen reader after the screen is redrawn.
function revealNotice(node) {
  requestAnimationFrame(() => { if (node.isConnected) node.focus(); }); // focus() also scrolls it into view
}

function noticeEl() {
  const notice = state.notice;
  state.notice = null;
  if (!notice) return null;
  const node = buildNotice(notice);
  revealNotice(node);
  return node;
}

function renderLibrary() {
  document.documentElement.lang = state.lang;
  document.title = "Huhu";
  const list = el("div", { class: "cards" }, el("p", { class: "message", text: t("loading") }));
  app.replaceChildren(el("div", { class: "screen library" }, masthead(), list));
  loadLibrary(list);
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

// Every story the library can show (on the phone or on the Mac's server), in any language.
async function libraryStories() {
  let localFailed = false;
  const [local, remote] = await Promise.all([
    listLocal().catch(() => { localFailed = true; return []; }),
    serverStories(),
  ]);
  const ids = new Set(local.map((s) => s.id)); // a story saved on the phone wins: it works offline
  return { stories: [...local, ...remote.filter((s) => !ids.has(s.id))], localFailed };
}

async function loadLibrary(list) {
  const { stories: all, localFailed } = await libraryStories();
  if (!list.isConnected) return;
  // No stories at all yet: the adult's first visit.
  if (!all.length && !localFailed) return renderWelcome();
  const stories = all.filter((s) => inLanguage(s, state.lang));
  const ordered = libraryOrder(stories, (s) => pickText(s.title, state.lang)); // newest first
  const screen = list.parentElement;
  list.replaceChildren(...(ordered.length ? ordered.map(storyCard)
    : [el("p", { class: "message", text: localFailed ? t("loadError") : t("noLocal") })]));
  list.before(...[noticeEl(), el("h1", { class: "section-title", text: t("library") })].filter(Boolean));
  screen.append(el("footer", { class: "ground" }, holdButton(t("adults"), renderAdults)));
}

function storyCard(story) {
  const title = pickText(story.title, state.lang);
  const total = Number.isInteger(story.endings) ? story.endings : 0;
  const found = Math.min(foundEndings(story.id).length, total);
  const lanterns = total > 1 ? endingLanterns(found, total) : null;
  return el("button", { class: "card", onclick: () => openStory(story.id) },
    disc(story.cover, "sm"),
    el("span", { class: "card-body" },
      el("span", { class: "title", text: title }),
      lanterns ? el("span", { class: "card-meta" }, lanterns) : null));
}

// First visit: who Huhu is, and how to add the stories someone sent.
function renderWelcome() {
  document.title = "Huhu";
  app.replaceChildren(el("div", { class: "screen welcome" },
    el("header", { class: "masthead" }, el("span", { class: "spacer" }), langButton()),
    el("div", { class: "welcome-hero" }, owl("owl owl-xl"), el("h1", { class: "brand brand-xl", text: "Huhu" }),
      el("p", { class: "lead", text: t("welcomeLead") })),
    el("ol", { class: "steps" }, ...t("welcomeSteps").map((step) => el("li", { text: step }))),
    noticeEl(), // right above the button, where the eye is after a failed try
    addButton(renderLibrary),
    standalone() ? null : el("p", { class: "hint", text: t("install") })));
}

function addButton(after) {
  const input = el("input", { type: "file", accept: ".zip,application/zip", hidden: "" });
  const btn = el("button", { class: "btn primary wide", onclick: () => input.click() }, icon("plus"), el("span", { text: t("add") }));
  input.addEventListener("change", () => input.files[0] && addStories(input.files[0], btn, after));
  return el("div", { class: "add" }, input, btn);
}

async function addStories(file, btn, after) {
  btn.disabled = true;
  btn.replaceChildren(el("span", { class: "spinner", "aria-hidden": "true" }), el("span", { role: "status", text: t("adding") }));
  try {
    const { added, skipped } = await importZip(file, LANGS);
    // Folders a zip tool adds on its own (macOS metadata, hidden files) are not stories anyone sent.
    const names = skipped.filter((f) => !f.startsWith("__MACOSX") && !f.startsWith(".")).map((f) => `«${f}»`).join(", ");
    const partial = names ? ` ${fill(t("addPartial"), { names })}` : "";
    state.notice = added.length === 1
      ? { kind: "ok", text: fill(t("addedOne"), { title: pickText(added[0].title, state.lang) }) + partial }
      : added.length
        ? { kind: "ok", text: fill(t("addedMany"), { n: added.length }) + partial }
        : names
          ? { kind: "error", text: fill(t("addIncomplete"), { names }), format: true }
          : { kind: "error", text: t("addError") };
  } catch (err) {
    state.notice = err?.message === "compressed" ? { kind: "error", text: t("addCompressed"), format: true }
      : err?.name === "QuotaExceededError" ? { kind: "error", text: t("addFull") }
        : { kind: "error", text: t("addError") };
  }
  if (!state.session) after();
}

// The adults' area: add stories, how it works, delete stories saved on the phone.
function renderAdults() {
  document.title = t("adults");
  const list = el("div", { class: "rows" }, el("p", { class: "message", text: t("loading") }));
  app.replaceChildren(el("div", { class: "screen adults" },
    el("header", { class: "topbar" },
      el("button", { class: "icon-btn", "aria-label": t("back"), onclick: renderLibrary }, icon("back")),
      el("h1", { text: t("adults") })),
    noticeEl(),
    addButton(renderAdults),
    el("p", { class: "about", text: t("howText") }),
    standalone() ? null : el("p", { class: "hint", text: t("install") }),
    el("button", { class: "link-row", id: "btn-format", onclick: renderFormat },
      icon("book"),
      el("span", { class: "link-text" }, el("strong", { text: t("formatLink") }), el("span", { text: t("formatHint") })),
      icon("next")),
    el("h2", { class: "section-title", text: t("myStories") }),
    list));
  loadAdultList(list);
}

// ---------- the story format (how to make a zip by hand or with an AI) ----------

// A complete one-choice story, in the app's language: the same example for the page and for the AI prompt.
function exampleJson() {
  const L = state.lang;
  const tx = (text) => ({ [L]: text });
  return JSON.stringify({
    id: "luna", cover: "🌙", title: tx(t("exTitle")), start: "inicio", choices: 1,
    nodes: {
      inicio: { type: "narration", text: tx(t("exStart")), next: "eleccion" },
      eleccion: {
        type: "choice", question: tx(t("exQuestion")),
        options: [
          { icon: "🌊", label: tx(t("exA")), next: "final-mar" },
          { icon: "🌳", label: tx(t("exB")), next: "final-bosque" },
        ],
      },
      "final-mar": { type: "ending", text: tx(t("exEndA")) },
      "final-bosque": { type: "ending", text: tx(t("exEndB")) },
    },
  }, null, 2);
}

// Clipboard needs https; on the Mac's http address the old way still works.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el("textarea", { readonly: "", style: "position:fixed;opacity:0" });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    area.remove();
    return ok;
  }
}

function renderFormat() {
  document.title = t("formatTitle");
  const L = state.lang;
  const tree = [
    "luna-huhu-export.zip",
    "└─ luna/                 ← = id",
    "   ├─ story.json",
    "   └─ audio/",
    `      └─ ${L}/`,
    "         ├─ inicio.mp3",
    "         ├─ eleccion.mp3",
    "         ├─ final-mar.mp3",
    "         └─ final-bosque.mp3",
  ].join("\n");
  const example = exampleJson();
  const prompt = `${t("fmtPrompt")}\n\n${t("fmtExample")}:\n${example}`;
  const section = (...children) => el("section", { class: "doc-sec" }, ...children);
  const heading = (text) => el("h2", { class: "section-title", text });
  const code = (text, cls = "") => el("pre", { class: `code ${cls}`.trim(), tabindex: "0", text });
  const copyBtn = el("button", { class: "btn wide", id: "btn-copy" }, icon("copy"), el("span", { text: t("copy") }));
  copyBtn.addEventListener("click", async () => {
    if (!(await copyText(prompt))) return;
    copyBtn.replaceChildren(icon("check"), el("span", { role: "status", text: t("copied") }));
    setTimeout(() => copyBtn.replaceChildren(icon("copy"), el("span", { text: t("copy") })), 2000);
  });
  app.replaceChildren(el("div", { class: "screen doc" },
    el("header", { class: "topbar" },
      el("button", { class: "icon-btn", "aria-label": t("back"), onclick: renderAdults }, icon("back")),
      el("h1", { text: t("formatTitle") })),
    el("p", { text: t("fmtIntro") }),
    section(heading(t("fmtZipH")), el("p", { text: t("fmtZipP") }), code(tree)),
    section(heading(t("fmtJsonH")), el("p", { text: t("fmtJsonP") }),
      el("ul", { class: "fields" }, ...t("fmtFields").map((line) => {
        const [term, ...rest] = line.split(": ");
        return el("li", {}, el("code", { text: term }), ` ${rest.join(": ")}`);
      })),
      code(example)),
    section(heading(t("fmtAudioH")), el("p", { text: t("fmtAudioP") })),
    section(heading(t("fmtMakeH")), el("p", { text: t("fmtMakeP") }),
      el("p", { text: t("fmtMac") }), code("zip -0 -r luna-huhu-export.zip luna", "wrap"),
      el("p", { text: t("fmtWin") })),
    section(heading(t("fmtAiH")), el("p", { text: t("fmtAiP") }), code(prompt, "wrap"), copyBtn,
      el("p", { class: "about", text: t("fmtAiAudio") }))));
  window.scrollTo(0, 0);
}

async function loadAdultList(list) {
  // Every story the library shows: the ones saved on the phone can be deleted, the ones served by the Mac cannot.
  const { stories, localFailed } = await libraryStories();
  const localIds = new Set((await listLocal().catch(() => [])).map((x) => x.id));
  if (!list.isConnected) return;
  stories.sort((a, b) => pickText(a.title, state.lang).localeCompare(pickText(b.title, state.lang)));
  const fromMac = stories.some((x) => !localIds.has(x.id));
  list.replaceChildren(
    ...(fromMac ? [el("p", { class: "about", text: t("onMac") })] : []),
    ...(stories.length ? stories.map((x) => adultRow(x, localIds.has(x.id)))
      : [el("p", { class: "message", text: localFailed ? t("loadError") : t("noLocal") })]));
}

function adultRow(story, deletable) {
  const title = pickText(story.title, state.lang);
  const row = el("div", { class: "row" });
  if (!deletable) {
    row.append(disc(story.cover, "xs"), el("span", { class: "title", text: title }));
    return row;
  }
  const trash = el("button", { class: "icon-btn quiet", "aria-label": `${t("delete")}: ${title}`, onclick: () => ask() }, icon("trash"));
  const show = () => row.replaceChildren(disc(story.cover, "xs"), el("span", { class: "title", text: title }), trash);
  // Deleting asks on the row itself, in words, instead of a browser dialog.
  const ask = () => {
    row.replaceChildren(
      el("span", { class: "title confirm", text: fill(t("confirmDelete"), { title }) }),
      el("span", { class: "row-actions" },
        el("button", { class: "btn small", onclick: () => { show(); trash.focus(); } }, el("span", { text: t("confirmNo") })),
        el("button", { class: "btn small danger", onclick: () => removeStory(story.id, title, row, show) }, el("span", { text: t("confirmYes") }))));
    row.querySelector(".btn").focus();
  };
  show();
  return row;
}

// The result shows where the row was, so the adult sees it without losing their place in the list.
async function removeStory(id, title, row, show) {
  app.querySelectorAll(".notice").forEach((n) => n.remove()); // an older result (e.g. «Listo: …») would contradict this one
  try {
    await deleteLocal(id);
    forgetPlayed(id);
    store.del(endingsKey(id));
  } catch {
    show(); // the story is still there: put its row back, with the error right under it
    const error = buildNotice({ kind: "error", text: t("deleteError") });
    row.after(error);
    revealNotice(error);
    return;
  }
  const list = row.parentElement;
  const done = buildNotice({ kind: "ok", text: fill(t("deleted"), { title }) });
  row.replaceWith(done);
  revealNotice(done);
  if (list && !list.querySelector(".row")) list.append(el("p", { class: "message", text: t("noLocal") }));
}

// The language list: big buttons with flag, name and how many stories each language has.
let langPickerOpening = false;

async function openLangPicker() {
  // The counts come from the network: a second tap while they load must not open a second sheet.
  if (langPickerOpening || document.querySelector("dialog.lang-sheet")) return;
  langPickerOpening = true;
  let all;
  try {
    ({ stories: all } = await libraryStories());
  } finally {
    langPickerOpening = false;
  }
  if (state.session) return; // a story opened meanwhile: no sheet over the player
  const counts = countByLanguage(all, LANGS);
  const dialog = el("dialog", { class: "lang-sheet", "aria-labelledby": "lang-title" });
  const pick = (lang) => {
    dialog.close();
    setLang(lang);
    renderLibrary();
    app.querySelector(".lang-btn")?.focus(); // the screen was redrawn: keep the place where the change was made
  };
  dialog.append(
    el("h2", { id: "lang-title", text: t("language") }),
    el("div", { class: "lang-list" },
      ...LANGS.map((l) => el("button", {
        class: "lang-option", lang: l, "aria-pressed": String(l === state.lang),
        "aria-label": `${LANG_NAMES[l]}, ${counts[l]}`, onclick: () => pick(l),
      }, flagEl(l), el("span", { class: "lang-name", text: LANG_NAMES[l] }),
      el("span", { class: "lang-count" }, icon("book"), el("span", { text: String(counts[l]) }))))));
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); }); // tap outside the list
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function renderPlayer() {
  const s = state.session;
  const title = pickText(s.story.title, state.lang);
  document.title = title;
  const controls = el("div", { class: "controls", id: "controls" },
    // Shown when the phone blocked autoplay: a row of its own above the buttons, so it never crowds them.
    el("span", { class: "tap-hint", id: "tap-hint", hidden: "", text: t("startPlaying") }),
    el("button", { class: "ctl", id: "btn-restart", "aria-label": t("restart"), onclick: restartNode },
      el("span", { class: "ctl-disc" }, icon("replay")), el("span", { class: "ctl-label", text: t("restartShort") })),
    el("span", { class: "ctl-main" },
      el("button", { class: "ctl-play", id: "btn-play", onclick: togglePlay })),
    el("button", { class: "ctl", id: "btn-text", onclick: toggleText },
      el("span", { class: "ctl-disc" }, icon("text")), el("span", { class: "ctl-label", text: t("textShort") })));
  const askAgain = el("button", { class: "btn wide", id: "btn-ask", hidden: "", onclick: restartNode },
    icon("replay"), el("span", { text: t("replayQuestion") }));
  app.replaceChildren(el("div", { class: "screen player" },
    el("header", { class: "topbar" },
      el("button", { class: "icon-btn", "aria-label": t("back"), onclick: () => leaveStory(true) }, icon("back")),
      el("h1", { class: "player-title", text: title })),
    lanternPath(),
    el("section", { class: "stage", id: "stage" }),
    controls, askAgain));
  updateControls();
}

function toggleText() {
  state.showText = !state.showText;
  store.set("showText", state.showText ? "1" : "0");
  const text = document.getElementById("narration");
  if (text) text.hidden = !state.showText;
  document.getElementById("stage")?.classList.toggle("with-text", state.showText && !!text);
  updateControls();
}

function renderNode() {
  const s = state.session;
  const node = getNode(s.story, s.nodeId);
  const stage = document.getElementById("stage");
  if (!stage || !node) return;
  updatePath();

  if (node.type === "choice" && s.choiceReady) {
    stage.className = "stage choosing";
    stage.replaceChildren(...renderChoice(node));
  } else if (node.type === "choice") {
    stage.className = "stage";
    stage.replaceChildren(
      disc(s.story.cover, "stage"),
      el("p", { class: "question", "aria-live": "polite", text: pickText(node.question, state.lang) }));
  } else {
    const text = el("p", { class: "narration-text", id: "narration", text: pickText(node.text, state.lang) });
    text.hidden = !state.showText;
    stage.className = `stage${state.showText ? " with-text" : ""}`;
    stage.replaceChildren(disc(s.story.cover, "stage"), text);
  }
  updateControls();
}

// The button's drawing if the option has one (an inline SVG, like covers), or its emoji.
function optionIcon(opt) {
  const url = coverImageUrl(opt.image);
  return url
    ? el("img", { class: "icon", src: url, alt: "", "aria-hidden": "true" })
    : el("span", { class: "icon", "aria-hidden": "true", text: opt.icon });
}

function renderChoice(node) {
  return [
    el("p", { class: "question", "aria-live": "polite", text: pickText(node.question, state.lang) }),
    el("div", { class: "options" }, ...node.options.map((opt, i) =>
      el("button", { class: `option opt-${i}`, onclick: () => choose(i) },
        optionIcon(opt),
        el("span", { class: "label", text: pickText(opt.label, state.lang) })))),
  ];
}

function renderFin() {
  const s = state.session;
  const ends = endingIds(s.story);
  const total = ends.length;
  const found = foundEndings(s.story.id).filter((id) => ends.includes(id)).length;
  const summary = total <= 1 ? t("endingOnly") : fill(t("endingsFound"), { n: found, total });
  const nudge = total > 1 ? (found >= total ? t("allEndings") : t("moreEndings")) : null;
  app.replaceChildren(el("section", { class: "screen fin" },
    lanternPath("celebrate"),
    el("div", { class: "fin-main" },
      el("div", { class: "fin-art" }, disc(s.story.cover, "stage"), owl()),
      el("h1", { class: "fin-title", role: "status", text: t("fin") }),
      el("div", { class: "fin-found" },
        total > 1 ? endingLanterns(found, total) : null,
        el("p", { text: summary }),
        nudge ? el("p", { class: "nudge", text: nudge }) : null)),
    el("div", { class: "actions" },
      el("button", { class: "btn primary wide", id: "btn-replay", onclick: replayStory }, icon("replay"), el("span", { text: t("replay") })),
      el("button", { class: "btn wide", onclick: () => leaveStory(false) }, el("span", { text: t("others") })))));
  setPath(1);
  app.querySelector("#btn-replay").focus();
}

function updateControls() {
  const play = document.getElementById("btn-play");
  if (!play) return;
  const s = state.session;
  const paused = player.paused;
  play.replaceChildren(icon(paused ? "play" : "pause"));
  play.setAttribute("aria-label", paused ? t("play") : t("pause"));
  const blocked = !!(s?.blocked && paused);
  play.classList.toggle("invite", blocked);
  document.getElementById("tap-hint").hidden = !blocked;
  // While the child chooses, only the paths and "hear the question again" are on screen.
  const choosing = !!s?.choiceReady && !s?.failed;
  document.getElementById("controls").hidden = choosing || !!s?.failed;
  document.getElementById("btn-ask").hidden = !choosing;
  const node = s && getNode(s.story, s.nodeId);
  const textBtn = document.getElementById("btn-text");
  textBtn.classList.toggle("off", node?.type === "choice");
  textBtn.disabled = node?.type === "choice";
  textBtn.setAttribute("aria-label", state.showText ? t("hideText") : t("showText"));
  textBtn.setAttribute("aria-pressed", String(state.showText));
  document.getElementById("stage")?.classList.toggle("playing", !paused);
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
applyCaps();
renderLibrary();
