import * as Y from "yjs";

export function createYDoc(): Y.Doc {
  return new Y.Doc();
}

export function encodeUpdate(doc: Y.Doc): string {
  const updateUint8 = Y.encodeStateAsUpdate(doc);
  return Buffer.from(updateUint8).toString("base64");
}

export function applyUpdate(doc: Y.Doc, updateBase64: string) {
  try {
    const updateBuffer = Buffer.from(updateBase64, "base64");
    const updateUint8 = new Uint8Array(updateBuffer);
    Y.applyUpdate(doc, updateUint8);
  } catch (err) {
    console.error("Failed to apply CRDT update:", err);
  }
}
