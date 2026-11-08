"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { getSavedUser, saveUser } from "@/lib/supabase";
import { getSavedTheme, saveTheme, ThemeMode } from "@/lib/theme";
import { ProjectFile, RoomUser, ChatMessage, CodeExecutionResult } from "@/types";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { EditorTabBar } from "@/components/EditorTabBar";
import { MonacoEditorWrapper } from "@/components/MonacoEditorWrapper";
import { ChatPanel } from "@/components/ChatPanel";
import { TerminalOutput } from "@/components/TerminalOutput";
import { Loader2 } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();

  // State
  const [user, setUser] = useState<{ id: string; name: string }>(getSavedUser());
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<RoomUser[]>([]);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [incomingCRDTUpdate, setIncomingCRDTUpdate] = useState<string | null>(null);

  // Refs for real-time handlers to prevent stale closure state
  const filesRef = useRef(files);
  filesRef.current = files;
  const activeFileIdRef = useRef(activeFileId);
  activeFileIdRef.current = activeFileId;
  const userRef = useRef(user);
  userRef.current = user;

  // 1. Initial Load: Fetch Room & Files & Theme
  useEffect(() => {
    const initialTheme = getSavedTheme();
    setTheme(initialTheme);
    saveTheme(initialTheme);

    const fetchRoom = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (!res.ok) throw new Error("Failed to fetch room");
        const data = await res.json();

        setFiles(data.files || []);
        if (data.files && data.files.length > 0) {
          setActiveFileId(data.files[0].id);
        }
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Error loading room:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Theme Toggle Handler
  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const isDark = theme === "dark";

  // 2. Socket.IO Connections & Auto-Reconnect Event Listeners
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleConnect = () => {
      socket.emit("join-room", { roomId, user: userRef.current });
    };

    socket.on("connect", handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    socket.on("room-state", ({ files: roomFiles, messages: roomMessages, users }: any) => {
      if (roomFiles && roomFiles.length > 0) {
        setFiles(roomFiles);
        if (!activeFileIdRef.current) {
          setActiveFileId(roomFiles[0].id);
        }
      }
      if (roomMessages) {
        setMessages(roomMessages);
      }
      if (users) {
        setRoomUsers(users);
      }
    });

    socket.on("room-users", (usersList: RoomUser[]) => {
      setRoomUsers(usersList);
    });

    // CRDT Binary Update from Peer
    socket.on("crdt-update", ({ fileId, update }: { fileId: string; update: string }) => {
      setIncomingCRDTUpdate(update);
    });

    socket.on("code-update", ({ fileId, content }: { fileId: string; content: string }) => {
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === fileId ? { ...f, content } : f))
      );
    });

    socket.on(
      "cursor-update",
      ({ socketId, user: peerUser, fileId, cursor }: { socketId: string; user: RoomUser; fileId: string; cursor: any }) => {
        setRoomUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.socketId === socketId ? { ...u, currentFileId: fileId, cursor } : u
          )
        );
      }
    );

    socket.on("typing-status", ({ user: peerUser, isTyping }: { user: RoomUser; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.some((u) => u.socketId === peerUser.socketId) ? prev : [...prev, peerUser];
        } else {
          return prev.filter((u) => u.socketId !== peerUser.socketId);
        }
      });
    });

    socket.on("file-created", (newFile: ProjectFile) => {
      setFiles((prev) => [...prev, newFile]);
    });

    socket.on("file-deleted", ({ fileId }: { fileId: string }) => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (activeFileIdRef.current === fileId) {
        const remaining = filesRef.current.filter((f) => f.id !== fileId);
        if (remaining.length > 0) setActiveFileId(remaining[0].id);
      }
    });

    socket.on("new-message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("leave-room");
      socket.off("connect", handleConnect);
      socket.off("room-state");
      socket.off("room-users");
      socket.off("crdt-update");
      socket.off("code-update");
      socket.off("cursor-update");
      socket.off("typing-status");
      socket.off("file-created");
      socket.off("file-deleted");
      socket.off("new-message");
      socket.disconnect();
    };
  }, [roomId]);

  // CRDT Local Update Handler
  const handleCRDTUpdate = (updateBase64: string) => {
    if (!activeFileId) return;
    const socket = getSocket();
    socket.emit("crdt-update", {
      roomId,
      fileId: activeFileId,
      update: updateBase64,
    });
  };

  // File Content Change Handler (Fallback)
  const handleCodeChange = (newContent: string) => {
    if (!activeFileId) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f))
    );

    const socket = getSocket();
    socket.emit("code-change", {
      roomId,
      fileId: activeFileId,
      content: newContent,
    });
  };

  // Cursor Move Handler
  const handleCursorChange = (cursor: { lineNumber: number; column: number }) => {
    if (!activeFileId) return;
    const socket = getSocket();
    socket.emit("cursor-move", {
      roomId,
      fileId: activeFileId,
      cursor,
    });
  };

  // Jump to User Cursor
  const handleJumpToUserCursor = (peerUser: RoomUser) => {
    if (peerUser.currentFileId) {
      setActiveFileId(peerUser.currentFileId);
    }
  };

  // Create New File
  const handleCreateFile = async (name: string, language: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language, content: "" }),
      });
      const newFile = await res.json();
      setActiveFileId(newFile.id);
    } catch (err) {
      console.error("Failed to create file:", err);
    }
  };

  // Delete File
  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/rooms/${roomId}/files/${fileId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  // Close Tab
  const handleCloseTab = (fileId: string) => {
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.id !== fileId);
    setFiles(remaining);
    if (activeFileId === fileId) {
      setActiveFileId(remaining[0].id);
    }
  };

  // Language change
  const handleLanguageChange = (fileId: string, language: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, language } : f))
    );
  };

  // Chat Send Message
  const handleSendMessage = (text: string) => {
    const socket = getSocket();
    socket.emit("send-message", { roomId, text, user: userRef.current });
  };

  // Typing Handler
  const handleTyping = (isTyping: boolean) => {
    const socket = getSocket();
    socket.emit("user-typing", { roomId, isTyping });
  };

  // Update Display Name
  const handleUpdateUserName = (newName: string) => {
    const updated = { ...user, name: newName };
    setUser(updated);
    saveUser(updated);
    const socket = getSocket();
    socket.emit("join-room", { roomId, user: updated });
  };

  // Execute Code
  const handleRunCode = async () => {
    const activeFile = files.find((f) => f.id === activeFileId);
    if (!activeFile) return;

    setIsExecuting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeFile.language,
          code: activeFile.content,
        }),
      });
      const result = await res.json();
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        stdout: "",
        stderr: `Failed to reach code execution server: ${err.message}`,
        executionTime: 0,
        exitCode: 1,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const activeFile = files.find((f) => f.id === activeFileId);
  const otherUsers = roomUsers.filter((u) => u.name !== user.name);

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-3 ${
          isDark ? "bg-[#141414] text-white" : "bg-[#F5F5F7] text-[#1D1D1F]"
        }`}
      >
        <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
        <p className={`font-medium text-xs ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
          Entering DevSync Room #{roomId}...
        </p>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isDark ? "bg-[#141414]" : "bg-[#F5F5F7]"}`}>
      {/* Top Navigation Header */}
      <Header
        roomId={roomId}
        users={roomUsers}
        currentUser={user}
        onRunCode={handleRunCode}
        isExecuting={isExecuting}
        onUpdateUserName={handleUpdateUserName}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onJumpToUserCursor={handleJumpToUserCursor}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Explorer Sidebar */}
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={(id) => setActiveFileId(id)}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          theme={theme}
        />

        {/* Center Code Editor & Terminal Drawer */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
          {/* File Tabs & Language Selector */}
          <EditorTabBar
            files={files}
            activeFileId={activeFileId}
            onSelectFile={(id) => setActiveFileId(id)}
            onCloseTab={handleCloseTab}
            onLanguageChange={handleLanguageChange}
            theme={theme}
          />

          {/* Monaco Code Editor with CRDT */}
          <div className="flex-1 relative overflow-hidden">
            {activeFile ? (
              <MonacoEditorWrapper
                key={activeFile.id}
                value={activeFile.content}
                language={activeFile.language}
                onChange={handleCodeChange}
                onCursorChange={handleCursorChange}
                remoteUsers={otherUsers}
                activeFileId={activeFile.id}
                theme={theme}
                onCRDTUpdate={handleCRDTUpdate}
                incomingCRDTUpdate={incomingCRDTUpdate}
              />
            ) : (
              <div
                className={`h-full flex items-center justify-center text-xs ${
                  isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"
                }`}
              >
                Select or create a file to start editing.
              </div>
            )}
          </div>

          {/* Terminal / Code Execution Console */}
          <TerminalOutput result={executionResult} onClear={() => setExecutionResult(null)} theme={theme} />
        </main>

        {/* Right Chat Column */}
        <div className={`w-80 flex flex-col border-l ${isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"}`}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={user}
            typingUsers={typingUsers.filter((u) => u.name !== user.name)}
            onTyping={handleTyping}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}
