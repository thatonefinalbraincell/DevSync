import * as Y from "yjs";

// Master Y.Doc store per room: roomId -> Y.Doc
const roomYDocs = new Map<string, Y.Doc>();

export function getOrCreateYDoc(roomId: string): Y.Doc {
  if (!roomYDocs.has(roomId)) {
    const doc = new Y.Doc();
    roomYDocs.set(roomId, doc);
  }
  return roomYDocs.get(roomId)!;
}

export function initYFileText(roomId: string, fileId: string, initialContent: string): Y.Text {
  const doc = getOrCreateYDoc(roomId);
  const yText = doc.getText(fileId);
  if (yText.length === 0 && initialContent) {
    yText.insert(0, initialContent);
  }
  return yText;
}

export function applyCRDTUpdate(roomId: string, updateBase64: string): Uint8Array {
  const doc = getOrCreateYDoc(roomId);
  const updateBuffer = Buffer.from(updateBase64, "base64");
  const updateUint8 = new Uint8Array(updateBuffer);
  Y.applyUpdate(doc, updateUint8);
  return Y.encodeStateAsUpdate(doc);
}

export function getYFileContent(roomId: string, fileId: string): string {
  const doc = getOrCreateYDoc(roomId);
  const yText = doc.getText(fileId);
  return yText.toString();
}
