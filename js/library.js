// Stories saved on the phone (IndexedDB), imported from the zips made by `cuentos export`.
import { zipEntries, groupStories, storyComplete, narratedNodeIds } from "./zip.js";

const DB_NAME = "cuentos";
let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("stories", { keyPath: "id" });
      req.result.createObjectStore("audio"); // key "<story>/<lang>/<node>" → Blob
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

const done = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = tx.onabort = () => reject(tx.error);
});

const result = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

// Library entries ({id, title, cover, languages}) of the stories saved on the phone.
export async function listLocal() {
  const db = await openDb();
  const records = await result(db.transaction("stories").objectStore("stories").getAll());
  return records.map(({ id, title, cover, languages }) => ({ id, title, cover, languages }));
}

export async function getLocalStory(id) {
  const db = await openDb();
  return (await result(db.transaction("stories").objectStore("stories").get(id)))?.story ?? null;
}

export async function getLocalAudio(id, lang, nodeId) {
  const db = await openDb();
  return (await result(db.transaction("audio").objectStore("audio").get(`${id}/${lang}/${nodeId}`))) ?? null;
}

// Saves every complete story in the zip `file`, replacing older copies.
// Returns {added: [story], skipped: [folder]}. Throws if the file is not a story zip.
export async function importZip(file, langs) {
  const buffer = await file.arrayBuffer();
  const groups = groupStories(zipEntries(buffer));
  const db = await openDb();
  const added = [];
  const skipped = [];
  for (const [folder, group] of Object.entries(groups)) {
    let story = null;
    try {
      if (group.story) story = JSON.parse(new TextDecoder().decode(bytes(buffer, group.story)));
    } catch { /* broken story.json: skipped below */ }
    if (!storyComplete(folder, story, group.audio, langs)) {
      skipped.push(folder);
      continue;
    }
    const tx = db.transaction(["stories", "audio"], "readwrite");
    const audio = tx.objectStore("audio");
    audio.delete(IDBKeyRange.bound(`${folder}/`, `${folder}/￿`));
    for (const node of narratedNodeIds(story)) {
      for (const lang of langs) {
        // Copied out of the file: a picked file (e.g. from Drive) may stop being readable later.
        audio.put(new Blob([bytes(buffer, group.audio[`${lang}/${node}`])], { type: "audio/mpeg" }), `${folder}/${lang}/${node}`);
      }
    }
    tx.objectStore("stories").put({ id: folder, title: story.title, cover: story.cover, languages: langs, story });
    await done(tx);
    added.push(story);
  }
  if (added.length && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  return { added, skipped };
}

// Removes a story saved on the phone, with all its audio.
export async function deleteLocal(id) {
  const db = await openDb();
  const tx = db.transaction(["stories", "audio"], "readwrite");
  tx.objectStore("audio").delete(IDBKeyRange.bound(`${id}/`, `${id}/￿`));
  tx.objectStore("stories").delete(id);
  await done(tx);
}

const bytes = (buffer, entry) => new Uint8Array(buffer, entry.offset, entry.size);
