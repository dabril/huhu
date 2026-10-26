// Reading the story zips made by `cuentos export`: uncompressed ("stored") zips only.
// Pure functions: no DOM, no storage. Testable in plain Node.

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

// [{name, offset, size}] for each file; `offset` is where its bytes start in `buffer`.
// Throws Error("not-zip") or Error("compressed").
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
    const size = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const skip = nameLen + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    const name = names.decode(new Uint8Array(buffer, pos + 46, nameLen));
    pos += 46 + skip;
    if (name.endsWith("/")) continue; // folder entry
    if (method !== 0) throw new Error("compressed");
    if (local + 30 > len || view.getUint32(local, true) !== LOCAL) throw new Error("not-zip");
    const offset = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (offset + size > len) throw new Error("not-zip");
    entries.push({ name, offset, size });
  }
  return entries;
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

// Whether a story from a zip can be played: right id, a start node, and audio for every node in `langs`.
export function storyComplete(folder, story, audio, langs) {
  if (!story || typeof story !== "object" || story.id !== folder) return false;
  if (!/^[a-z0-9_-]+$/.test(folder) || !story.title || !story.nodes || typeof story.nodes !== "object") return false;
  if (!Object.hasOwn(story.nodes, story.start)) return false;
  return narratedNodeIds(story).every((node) => langs.every((lang) => Object.hasOwn(audio, `${lang}/${node}`)));
}
