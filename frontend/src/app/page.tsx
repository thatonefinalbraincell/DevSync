"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Code2, Users, ArrowRight, Zap, Terminal, Loader2, Sun, Moon } from "lucide-react";
import { getSavedUser, saveUser } from "@/lib/supabase";
import { getSavedTheme, saveTheme, ThemeMode } from "@/lib/theme";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function Home() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");
  const [userName, setUserName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const user = getSavedUser();
    setUserName(user.name);
    const initialTheme = getSavedTheme();
    setTheme(initialTheme);
    saveTheme(initialTheme);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const isDark = theme === "dark";

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (userName.trim()) {
        const currentUser = getSavedUser();
        saveUser({ ...currentUser, name: userName.trim() });
      }

      router.push(`/room/${data.roomId}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      const fallbackId = Math.random().toString(36).substring(2, 6).toUpperCase();
      router.push(`/room/A${fallbackId}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;

    if (userName.trim()) {
      const currentUser = getSavedUser();
      saveUser({ ...currentUser, name: userName.trim() });
    }

    const cleanRoomId = roomIdInput.trim().replace("#", "").toUpperCase();
    router.push(`/room/${cleanRoomId}`);
  };

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-6 select-none transition-colors ${
        isDark ? "bg-[#141414] text-white" : "bg-[#F5F5F7] text-[#1D1D1F]"
      }`}
    >
      {/* Absolute Theme Toggle at top right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleToggleTheme}
          className={`p-2 rounded-full border transition-colors cursor-pointer ${
            isDark
              ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-amber-400"
              : "bg-white hover:bg-[#E5E5EA] border-[#E5E5EA] text-indigo-600 shadow-sm"
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Netflix Dark Mode"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#E50914] text-white mb-2 shadow-sm">
            <Code2 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Dev<span className="text-[#E50914]">Sync</span>
          </h1>
          <p className={`text-sm leading-relaxed ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
            Real-time collaborative code editor with live cursors, chat, and code execution.
          </p>
        </div>

        {/* Card Form */}
        <div
          className={`p-6 rounded-2xl border space-y-4 shadow-sm transition-colors ${
            isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"
          }`}
        >
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
              Your Display Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Arjun"
              className={`w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#E50914] border transition-colors ${
                isDark ? "bg-[#232323] border-[#333333] text-white" : "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
              }`}
            />
          </div>

          {mode === "home" ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#E50914] hover:bg-[#b80710] font-medium text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    <span>Create Room</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setMode("join")}
                className={`py-2.5 px-4 rounded-lg font-medium text-sm border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isDark
                    ? "bg-[#232323] hover:bg-[#333333] text-white border-[#333333]"
                    : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border-[#E5E5EA]"
                }`}
              >
                <span>Join Room</span>
                <ArrowRight className={`w-4 h-4 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="pt-2 space-y-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
                  Enter Room ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. A7F2"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className={`w-full px-3.5 py-2.5 font-mono text-center tracking-widest text-base uppercase focus:outline-none focus:border-[#E50914] rounded-lg border ${
                    isDark ? "bg-[#232323] border-[#333333] text-white" : "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
                  }`}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#E50914] hover:bg-[#b80710] text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Enter Room
                </button>
                <button
                  type="button"
                  onClick={() => setMode("home")}
                  className={`px-4 py-2.5 font-medium rounded-lg text-sm border transition-colors cursor-pointer ${
                    isDark ? "bg-[#232323] hover:bg-[#333333] text-white border-[#333333]" : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border-[#E5E5EA]"
                  }`}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Minimal Features List */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div
            className={`p-3.5 rounded-xl border space-y-1 shadow-xs transition-colors ${
              isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"
            }`}
          >
            <Zap className="w-4 h-4 text-[#E50914] mx-auto mb-1" />
            <div className="text-xs font-semibold">Real-time</div>
            <div className={`text-[11px] ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>Sync code</div>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 shadow-xs transition-colors ${
              isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <div className="text-xs font-semibold">Presence</div>
            <div className={`text-[11px] ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>Live cursors</div>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1 shadow-xs transition-colors ${
              isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <div className="text-xs font-semibold">Execute</div>
            <div className={`text-[11px] ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>Run code</div>
          </div>
        </div>
      </div>
    </main>
  );
}