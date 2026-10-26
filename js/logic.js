// Pure player logic: no DOM, no storage. Testable in plain Node.

export const REPEAT_AFTER_MS = 20000;

// A cover is an emoji, or an inline SVG string for stories with their own icon.
// Returns a data: URL to show the SVG in an <img> (no scripts run there), or null for an emoji.
export function coverImageUrl(cover) {
  if (typeof cover !== "string" || !cover.trimStart().startsWith("<svg")) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cover)}`;
}

// Own-property lookup: keys like "constructor" must not count as nodes.
export function getNode(story, nodeId) {
  const nodes = story?.nodes;
  if (!nodes || typeof nodeId !== "string") return null;
  return Object.hasOwn(nodes, nodeId) ? nodes[nodeId] : null;
}

export function nextNodeId(story, nodeId, optionIndex = null) {
  const node = getNode(story, nodeId);
  if (!node) return null;
  if (node.type === "narration") return node.next ?? null;
  if (node.type === "choice") return node.options?.[optionIndex]?.next ?? null;
  return null;
}

// Relative to the page, so the app also works under a subpath (GitHub Pages).
export function audioUrl(storyId, lang, nodeId) {
  return `stories/${storyId}/audio/${lang}/${nodeId}.mp3`;
}

export function resumePoint(story, saved) {
  const node = getNode(story, saved?.nodeId);
  if (node && node.type !== "ending") return saved.nodeId;
  return story.start;
}

export function onChoiceIdle(state) {
  return state.repeats === 0 ? "repeat" : "wait";
}

// Steps from nodeId to the deepest ending (cycle-safe).
function stepsToEnd(story, nodeId, seen = new Set()) {
  const node = getNode(story, nodeId);
  if (!node || seen.has(nodeId)) return 0;
  const nexts =
    node.type === "narration" ? [node.next] : node.type === "choice" ? (node.options ?? []).map((o) => o.next) : [];
  const branch = new Set(seen).add(nodeId);
  return nexts.reduce((max, n) => Math.max(max, 1 + stepsToEnd(story, n, branch)), 0);
}

// 0..1 position of a node along the longest path of the story.
export function progressFraction(story, nodeId) {
  const total = stepsToEnd(story, story?.start);
  if (total === 0) return 0;
  const left = Math.min(stepsToEnd(story, nodeId), total);
  return (total - left) / total;
}

// Text for a language, falling back to Spanish.
export function pickText(value, lang) {
  if (!value || typeof value !== "object") return "";
  return value[lang] ?? value.es ?? "";
}

// How a rejected audio.play() should be treated:
// "aborted" (superseded by a newer load/pause: ignore), "blocked" (autoplay policy: show a play button),
// "failed" (missing or undecodable audio: show the error screen).
export function classifyPlayError(err) {
  const name = err?.name;
  if (name === "AbortError") return "aborted";
  if (name === "NotAllowedError") return "blocked";
  return "failed";
}

// What the idle timer should do: "hold" while the listener has paused (or the page is hidden),
// otherwise the usual "repeat" / "wait".
export function idleAction({ repeats, paused }) {
  if (paused) return "hold";
  return onChoiceIdle({ repeats });
}
