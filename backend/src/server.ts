import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { getOrCreateRoom, updateFileContent, createFile, deleteFile, addChatMessage } from "./lib/db";
import { runCode } from "./services/codeRunner";
import { getOrCreateYDoc, initYFileText, applyCRDTUpdate, getYFileContent } from "./lib/crdt";

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface ActiveUser {
  socketId: string;
  id: string;
  name: string;
  color: string;
  currentFileId?: string;
  cursor?: { lineNumber: number; column: number };
}

const roomUsersMap = new Map<string, Map<string, ActiveUser>>();

// Google Docs Palette for user cursors
const GOOGLE_DOCS_CURSOR_COLORS = [
  "#E53935", // Red (User A)
  "#1E88E5", // Blue (User B)
  "#43A047", // Green (User C)
  "#8E24AA", // Purple
  "#FB8C00", // Orange
  "#00ACC1", // Cyan
  "#D81B60", // Pink
  "#00897B", // Teal
  "#F4511E", // Deep Orange
  "#3F51B5", // Indigo
];

function getDeterministicUserColor(identifier: string, roomIndex: number): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs((hash + roomIndex) % GOOGLE_DOCS_CURSOR_COLORS.length);
  return GOOGLE_DOCS_CURSOR_COLORS[index];
}

// REST Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/rooms", async (req, res) => {
  try {
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomId = req.body?.roomId || `A${randomCode}`;
    const room = await getOrCreateRoom(roomId);
    res.json({ success: true, roomId: room.id, room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getOrCreateRoom(roomId);
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rooms/:roomId/files", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, language, content } = req.body;
    if (!name) return res.status(400).json({ error: "File name is required" });
    const newFile = await createFile(roomId, name, language || "javascript", content || "");
    
    // Initialize Yjs CRDT Y.Text for new file
    initYFileText(roomId, newFile.id, newFile.content);

    io.to(roomId).emit("file-created", newFile);
    res.json(newFile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/rooms/:roomId/files/:fileId", async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    await deleteFile(fileId, roomId);
    io.to(roomId).emit("file-deleted", { fileId });
    res.json({ success: true, fileId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/execute", async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    if (!code) return res.status(400).json({ error: "Code content is required" });
    const result = await runCode(language || "javascript", code, stdin || "");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO Handlers
io.on("connection", (socket) => {
  let currentRoomId: string | null = null;
  let currentUser: ActiveUser | null = null;

  socket.on("join-room", async ({ roomId, user }: { roomId: string; user?: { id?: string; name?: string } }) => {
    currentRoomId = roomId;
    socket.join(roomId);

    if (!roomUsersMap.has(roomId)) {
      roomUsersMap.set(roomId, new Map());
    }

    const activeUsers = roomUsersMap.get(roomId)!;
    const userCount = activeUsers.size;

    const userId = user?.id || `user-${socket.id.substring(0, 5)}`;
    const userName = user?.name || `Coder #${Math.floor(1000 + Math.random() * 9000)}`;
    const assignedColor = getDeterministicUserColor(userName + userId, userCount);

    currentUser = {
      socketId: socket.id,
      id: userId,
      name: userName,
      color: assignedColor,
    };

    activeUsers.set(socket.id, currentUser);

    const usersList = Array.from(activeUsers.values());

    // Fetch latest room data to send room-state to joining socket
    const room = await getOrCreateRoom(roomId);
    
    // Ensure Yjs CRDT instance is initialized for each file in room
    if ((room as any).files) {
      (room as any).files.forEach((file: any) => {
        initYFileText(roomId, file.id, file.content);
      });
    }

    socket.emit("room-state", {
      roomId,
      files: (room as any).files,
      messages: (room as any).messages,
      users: usersList,
    });

    // Broadcast updated user list to everyone in room
    io.to(roomId).emit("room-users", usersList);

    socket.to(roomId).emit("user-joined", {
      user: currentUser,
      message: `${currentUser.name} joined the room`,
    });
  });

  // CRDT Yjs Binary Update Handler
  socket.on(
    "crdt-update",
    async ({ roomId, fileId, update }: { roomId: string; fileId: string; update: string }) => {
      try {
        // Apply CRDT update to server Y.Doc instance
        applyCRDTUpdate(roomId, update);
        const latestContent = getYFileContent(roomId, fileId);

        // Broadcast CRDT binary update to all other room members
        socket.to(roomId).emit("crdt-update", {
          fileId,
          update,
          senderSocketId: socket.id,
        });

        // Persist updated text content in database / memory
        await updateFileContent(fileId, roomId, latestContent);
      } catch (err) {
        console.error("CRDT update error:", err);
      }
    }
  );

  // Legacy code change fallback
  socket.on("code-change", async ({ roomId, fileId, content }: { roomId: string; fileId: string; content: string }) => {
    socket.to(roomId).emit("code-update", {
      fileId,
      content,
      senderSocketId: socket.id,
    });
    await updateFileContent(fileId, roomId, content);
  });

  socket.on(
    "cursor-move",
    ({
      roomId,
      fileId,
      cursor,
      selection,
    }: {
      roomId: string;
      fileId: string;
      cursor: { lineNumber: number; column: number };
      selection?: any;
    }) => {
      if (currentUser) {
        currentUser.currentFileId = fileId;
        currentUser.cursor = cursor;

        socket.to(roomId).emit("cursor-update", {
          socketId: socket.id,
          user: currentUser,
          fileId,
          cursor,
          selection,
        });
      }
    }
  );

  socket.on("user-typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    if (currentUser) {
      socket.to(roomId).emit("typing-status", {
        user: currentUser,
        isTyping,
      });
    }
  });

  socket.on("send-message", async ({ roomId, text, user }: { roomId: string; text: string; user?: { id: string; name: string } }) => {
    if (!text || !text.trim()) return;

    const senderId = currentUser?.id || user?.id || `user-${socket.id.substring(0, 5)}`;
    const senderName = currentUser?.name || user?.name || "Coder";
    const senderColor = currentUser?.color || getDeterministicUserColor(senderName + senderId, 0);

    const savedMsg = await addChatMessage(roomId, senderId, senderName, senderColor, text.trim());
    io.to(roomId).emit("new-message", savedMsg);
  });

  const handleUserLeave = () => {
    if (currentRoomId && roomUsersMap.has(currentRoomId)) {
      const activeUsers = roomUsersMap.get(currentRoomId)!;
      activeUsers.delete(socket.id);

      const usersList = Array.from(activeUsers.values());
      io.to(currentRoomId).emit("room-users", usersList);

      if (currentUser) {
        socket.to(currentRoomId).emit("user-left", {
          socketId: socket.id,
          user: currentUser,
          message: `${currentUser.name} left the room`,
        });
      }
    }
  };

  socket.on("leave-room", handleUserLeave);
  socket.on("disconnect", handleUserLeave);
});

server.listen(PORT, () => {
  console.log(`🚀 DevSync Backend running on http://localhost:${PORT}`);
});
