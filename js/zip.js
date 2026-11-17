// Reading story zips: the ones `huhu export` makes (stored, uncompressed) and the ones a phone, Drive or the
// Finder make (deflate). Pure functions: no DOM, no storage. Testable in plain Node.

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

// [{name, offset, size, method}] for each file; `offset` is where its (maybe compressed) bytes start in `buffer`.
// Throws Error("not-zip"), or Error("compressed") for a compression Huhu cannot undo.
export function zipEntries(buffer) {
  const view = new DataView(buffer);
  const len = buffer.byteLength;
  let eocd = -1;
  for (let i = len - 22; i >= Math.max(0, len - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not-zip");
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const names = new TextDecoder();
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (pos + 46 > len || view.getUint32(pos, true) !== CENTRAL) throw new Error("not-zip");
    const method = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 20, true); // compressed size
    const nameLen = view.getUint16(pos + 28, true);
    const skip = nameLen + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    const name = names.decode(new Uint8Array(buffer, pos + 46, nameLen));
    pos += 46 + skip;
    if (name.endsWith("/")) continue; // folder entry
    if (method !== STORED && !(method === DEFLATE && canInflate())) throw new Error("compressed");
    if (local + 30 > len || view.getUint32(local, true) !== LOCAL) throw new Error("not-zip");
    const offset = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (offset + size > len) throw new Error("not-zip");
    entries.push({ name, offset, size, method });
  }
  return entries;
}

const STORED = 0;
const DEFLATE = 8;
let inflateOk = null;
function canInflate() { // the stream exists in older browsers without the "deflate-raw" format
  if (inflateOk === null) {
    try { new DecompressionStream("deflate-raw"); inflateOk = true; } catch { inflateOk = false; }
  }
  return inflateOk;
}

// The file's own bytes: as they are in a stored zip, inflated in a compressed one.
export async function entryBytes(buffer, entry) {
  const raw = new Uint8Array(buffer, entry.offset, entry.size);
  if (entry.method !== DEFLATE) return raw;
  try {
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new Error("not-zip"); // damaged data
  }
}

// Whether some bytes can be an MP3: an ID3 tag or an MPEG frame at the start. A file that is neither
// (an empty or damaged download, a text) would only fail later, in front of the child.
export function looksLikeMp3(bytes) {
  if (!bytes || bytes.length < 4) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true; // "ID3"
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

// Nodes that have a narration file: every node of a known type.
export function narratedNodeIds(story) {
  return Object.entries(story.nodes)
    .filter(([, node]) => ["narration", "choice", "ending"].includes(node?.type))
    .map(([id]) => id);
}

// Groups zip entries by story folder: {id: {story: entry, audio: {"<lang>/<node>": entry}}}.
export function groupStories(entries) {
  const groups = {};
  for (const entry of entries) {
    const parts = entry.name.split("/");
    const group = (groups[parts[0]] ??= { story: null, audio: {} });
    if (parts.length === 2 && parts[1] === "story.json") group.story = entry;
    else if (parts.length === 4 && parts[1] === "audio" && parts[3].endsWith(".mp3")) {
      group.audio[`${parts[2]}/${parts[3].slice(0, -4)}`] = entry;
    }
  }
  return groups;
}

const PENDING = "[traducción pendiente]"; // placeholder older versions of the converter wrote

const hasText = (value, lang) => {
  const text = value?.[lang];
  return typeof text === "string" && text.trim() !== "" && text.trim() !== PENDING;
};

// Every per-language text of a story: title, narrations, endings, questions and option labels.
function textFields(story) {
  const fields = [story.title];
  for (const node of Object.values(story.nodes)) {
    if (node?.type === "narration" || node?.type === "ending") fields.push(node.text);
    else if (node?.type === "choice") {
      fields.push(node.question);
      for (const option of node.options ?? []) fields.push(option?.label);
    }
  }
  return fields;
}

// Whether every path can be played to an end: each node reachable from the start is a known type, a narration
// goes on to a node that exists, and a choice has 2 or 3 options that each lead to one. A hand-made story
// that breaks this would leave the child stuck halfway.
export function playableGraph(story) {
  const nodes = story.nodes;
  const has = (id) => typeof id === "string" && Object.hasOwn(nodes, id);
  const seen = new Set();
  const queue = [story.start];
  while (queue.length) {
    const id = queue.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodes[id];
    if (node?.type === "narration") {
      if (!has(node.next)) return false;
      queue.push(node.next);
    } else if (node?.type === "choice") {
      const options = Array.isArray(node.options) ? node.options : [];
      if (options.length < 2 || options.length > 3 || !options.every((o) => has(o?.next))) return false;
      queue.push(...options.map((o) => o.next));
    } else if (node?.type !== "ending") {
      return false;
    }
  }
  return true;
}

// The languages of `langs` a story from a zip can be played in: it has the right id, a start node and paths
// that end, and for each language every text is written and every node has its audio. [] means it cannot be played.
export function storyLanguages(folder, story, audio, langs) {
  if (!story || typeof story !== "object" || story.id !== folder) return [];
  if (!/^[a-z0-9_-]+$/.test(folder) || !story.title || !story.nodes || typeof story.nodes !== "object") return [];
  if (!Object.hasOwn(story.nodes, story.start) || !playableGraph(story)) return [];
  const fields = textFields(story);
  const nodes = narratedNodeIds(story);
  return langs.filter((lang) =>
    fields.every((field) => hasText(field, lang)) && nodes.every((node) => Object.hasOwn(audio, `${lang}/${node}`)));
}
