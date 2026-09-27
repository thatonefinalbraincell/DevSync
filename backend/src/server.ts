import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { getOrCreateRoom, updateFileContent, createFile, deleteFile, addChatMessage } from "./lib/db";
import { runCode } from "./services/codeRunner";

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

// User track map: roomId -> Map<socketId, UserInfo>
interface ActiveUser {
  socketId: string;
  id: string;
  name: string;
  color: string;
  currentFileId?: string;
  cursor?: { lineNumber: number; column: number };
}

const roomUsersMap = new Map<string, Map<string, ActiveUser>>();

// User colors array for assignment
const USER_COLORS = [
  "#10B981", // Emerald Green (Arjun)
  "#3B82F6", // Blue (Malavika)
  "#8B5CF6", // Purple (Sreehari)
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EF4444", // Red
];

// --- REST API ENDPOINTS ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Create Room
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

// Get Room with Files and Messages
app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getOrCreateRoom(roomId);
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create File in Room
app.post("/api/rooms/:roomId/files", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, language, content } = req.body;
    if (!name) {
      return res.status(400).json({ error: "File name is required" });
    }
    const newFile = await createFile(roomId, name, language || "javascript", content || "");

    // Notify room via socket
    io.to(roomId).emit("file-created", newFile);

    res.json(newFile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete File in Room
app.delete("/api/rooms/:roomId/files/:fileId", async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    await deleteFile(fileId, roomId);

    // Notify room via socket
    io.to(roomId).emit("file-deleted", { fileId });

    res.json({ success: true, fileId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Code Endpoint
app.post("/api/execute", async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Code content is required" });
    }
    const result = await runCode(language || "javascript", code, stdin || "");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SOCKET.IO REAL-TIME EVENT HANDLERS ---

io.on("connection", (socket) => {
  let currentRoomId: string | null = null;
  let currentUser: ActiveUser | null = null;

  // Join Room Event
  socket.on("join-room", async ({ roomId, user }: { roomId: string; user?: { id?: string; name?: string } }) => {
    currentRoomId = roomId;
    socket.join(roomId);

    if (!roomUsersMap.has(roomId)) {
      roomUsersMap.set(roomId, new Map());
    }

    const activeUsers = roomUsersMap.get(roomId)!;
    const userCount = activeUsers.size;
    const assignedColor = USER_COLORS[userCount % USER_COLORS.length];

    const userId = user?.id || `user-${socket.id.substring(0, 5)}`;
    const userName = user?.name || `Coder #${Math.floor(1000 + Math.random() * 9000)}`;

    currentUser = {
      socketId: socket.id,
      id: userId,
      name: userName,
      color: assignedColor,
    };

    activeUsers.set(socket.id, currentUser);

    // Broadcast updated user list to everyone in room
    const usersList = Array.from(activeUsers.values());
    io.to(roomId).emit("room-users", usersList);

    // Broadcast system notification
    socket.to(roomId).emit("user-joined", {
      user: currentUser,
      message: `${currentUser.name} joined the room`,
    });
  });

  // Code Editing Sync Event
  socket.on("code-change", async ({ roomId, fileId, content }: { roomId: string; fileId: string; content: string }) => {
    // Broadcast immediately to peers in room (except sender)
    socket.to(roomId).emit("code-update", {
      fileId,
      content,
      senderSocketId: socket.id,
    });

    // Update in database / memory
    await updateFileContent(fileId, roomId, content);
  });

  // Multi-Cursor Sync Event
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

  // User Typing Status
  socket.on("user-typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    if (currentUser) {
      socket.to(roomId).emit("typing-status", {
        user: currentUser,
        isTyping,
      });
    }
  });

  // Room Chat Message Event
  socket.on("send-message", async ({ roomId, text }: { roomId: string; text: string }) => {
    if (!currentUser || !text.trim()) return;

    const savedMsg = await addChatMessage(roomId, currentUser.id, currentUser.name, currentUser.color, text);

    io.to(roomId).emit("new-message", savedMsg);
  });

  // Leave / Disconnect
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
  console.log(`🚀 CollabCode Backend running on http://localhost:${PORT}`);
});
