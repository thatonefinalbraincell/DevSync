import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// In-memory fallback state in case database server is unreachable
export interface InMemFile {
  id: string;
  roomId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemRoom {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  files: Map<string, InMemFile>;
  messages: Array<{
    id: string;
    roomId: string;
    userId: string;
    userName: string;
    userColor: string;
    text: string;
    createdAt: Date;
  }>;
}

const memoryRooms = new Map<string, InMemRoom>();

let isDbConnected = false;

// Check connection status asynchronously
prisma
  .$connect()
  .then(() => {
    isDbConnected = true;
    console.log("✅ Prisma successfully connected to PostgreSQL (Supabase)!");
  })
  .catch((err) => {
    isDbConnected = false;
    console.warn("⚠️ Database connection error. Using in-memory database store fallback.", err.message);
  });

export function getDefaultFiles(roomId: string): InMemFile[] {
  const now = new Date();
  return [
    {
      id: `${roomId}-main-cpp`,
      roomId,
      name: "main.cpp",
      path: "main.cpp",
      language: "cpp",
      content: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from CollabCode!" << endl;
    return 0;
}
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${roomId}-utils-cpp`,
      roomId,
      name: "utils.cpp",
      path: "utils.cpp",
      language: "cpp",
      content: `#include <iostream>
using namespace std;

void greet(string name) {
    cout << "Welcome to the room, " << name << "!" << endl;
}
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${roomId}-index-js`,
      roomId,
      name: "index.js",
      path: "index.js",
      language: "javascript",
      content: `// Real-time Collaborative Code Execution
function calculateSum(a, b) {
    return a + b;
}

console.log("Calculation Result:", calculateSum(42, 58));
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${roomId}-readme-md`,
      roomId,
      name: "README.md",
      path: "README.md",
      language: "markdown",
      content: `# CollabCode Room: #${roomId}

Welcome to your real-time collaborative coding workspace!

## Features
- 🚀 Real-time multi-user editing
- 🟢 Live cursors with user labels
- 💬 Built-in room chat
- ▶️ Code execution
`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function getOrCreateRoom(roomId: string) {
  if (isDbConnected) {
    try {
      let room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { files: true, messages: { take: 50, orderBy: { createdAt: "asc" } } },
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            id: roomId,
            name: `Room #${roomId}`,
            files: {
              create: getDefaultFiles(roomId).map((f) => ({
                name: f.name,
                path: f.path,
                language: f.language,
                content: f.content,
              })),
            },
          },
          include: { files: true, messages: true },
        });
      }
      return room;
    } catch (error) {
      console.error("Prisma query error, falling back to memory:", error);
      isDbConnected = false;
    }
  }

  // Memory fallback
  if (!memoryRooms.has(roomId)) {
    const defaultFilesMap = new Map<string, InMemFile>();
    getDefaultFiles(roomId).forEach((f) => defaultFilesMap.set(f.id, f));

    memoryRooms.set(roomId, {
      id: roomId,
      name: `Room #${roomId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: defaultFilesMap,
      messages: [],
    });
  }

  const room = memoryRooms.get(roomId)!;
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    files: Array.from(room.files.values()),
    messages: room.messages,
  };
}

export async function updateFileContent(fileId: string, roomId: string, content: string) {
  if (isDbConnected) {
    try {
      return await prisma.file.update({
        where: { id: fileId },
        data: { content, updatedAt: new Date() },
      });
    } catch (err) {
      console.warn("DB update failed, using memory:", err);
      isDbConnected = false;
    }
  }

  const room = memoryRooms.get(roomId);
  if (room && room.files.has(fileId)) {
    const file = room.files.get(fileId)!;
    file.content = content;
    file.updatedAt = new Date();
    return file;
  }
  return null;
}

export async function createFile(roomId: string, name: string, language: string, content: string = "") {
  if (isDbConnected) {
    try {
      return await prisma.file.create({
        data: {
          roomId,
          name,
          path: name,
          language,
          content,
        },
      });
    } catch (err) {
      console.warn("DB file create failed, using memory:", err);
      isDbConnected = false;
    }
  }

  const room = (await getOrCreateRoom(roomId)) as any;
  const newFile: InMemFile = {
    id: `file-${Date.now()}`,
    roomId,
    name,
    path: name,
    language,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const memRoom = memoryRooms.get(roomId);
  if (memRoom) {
    memRoom.files.set(newFile.id, newFile);
  }
  return newFile;
}

export async function deleteFile(fileId: string, roomId: string) {
  if (isDbConnected) {
    try {
      return await prisma.file.delete({
        where: { id: fileId },
      });
    } catch (err) {
      console.warn("DB file delete failed, using memory:", err);
      isDbConnected = false;
    }
  }

  const memRoom = memoryRooms.get(roomId);
  if (memRoom) {
    memRoom.files.delete(fileId);
  }
  return true;
}

export async function addChatMessage(roomId: string, userId: string, userName: string, userColor: string, text: string) {
  if (isDbConnected) {
    try {
      return await prisma.chatMessage.create({
        data: {
          roomId,
          userId,
          userName,
          userColor,
          text,
        },
      });
    } catch (err) {
      console.warn("DB chat create failed, using memory:", err);
      isDbConnected = false;
    }
  }

  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomId,
    userId,
    userName,
    userColor,
    text,
    createdAt: new Date(),
  };

  const memRoom = memoryRooms.get(roomId);
  if (memRoom) {
    memRoom.messages.push(msg);
  }
  return msg;
}
