"use client";

import React, { useState } from "react";
import { Play, Copy, Check, Users, Code2, Loader2, User, UserPlus, Sun, Moon, Navigation } from "lucide-react";
import { RoomUser } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface HeaderProps {
  roomId: string;
  users: RoomUser[];
  currentUser: { name: string; id: string };
  onRunCode: () => void;
  isExecuting: boolean;
  onUpdateUserName: (newName: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onJumpToUserCursor?: (user: RoomUser) => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  users,
  currentUser,
  onRunCode,
  isExecuting,
  onUpdateUserName,
  theme,
  onToggleTheme,
  onJumpToUserCursor,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);

  const isDark = theme === "dark";

  // Copy ONLY Room ID string
  const handleCopyRoomIdOnly = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Copy Full Invite Link
  const handleCopyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUserName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <header
      className={`h-13 px-4 flex items-center justify-between sticky top-0 z-30 select-none border-b transition-colors ${
        isDark ? "bg-[#181818] border-[#333333] text-white" : "bg-white border-[#E5E5EA] text-[#1D1D1F] shadow-xs"
      }`}
    >
      {/* Left: Brand Logo & Room ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-base tracking-tight">
          <div className="w-6.5 h-6.5 rounded bg-[#E50914] flex items-center justify-center text-white shadow-sm">
            <Code2 className="w-4 h-4" />
          </div>
          <span>
            Dev<span className="text-[#E50914]">Sync</span>
          </span>
        </div>

        <div className={`h-4 w-[1px] ${isDark ? "bg-[#333333]" : "bg-[#E5E5EA]"}`} />

        {/* Room ID Tag (Copies ONLY Room ID) */}
        <button
          onClick={handleCopyRoomIdOnly}
          title="Click to copy Room ID"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
            isDark
              ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-[#FFFFFF]"
              : "bg-[#F5F5F7] hover:bg-[#E5E5EA] border-[#E5E5EA] text-[#1D1D1F]"
          }`}
        >
          <span className={isDark ? "text-[#B3B3B3] font-sans" : "text-[#6E6E73] font-sans"}>Room:</span>
          <span className="font-bold text-[#E50914]">#{roomId}</span>
          {copiedId ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
          ) : (
            <Copy className={`w-3.5 h-3.5 ml-0.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
          )}
        </button>
      </div>

      {/* Middle: Active Users List with Realtime Line Locations */}
      <div
        className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border ${
          isDark ? "bg-[#141414] border-[#333333]" : "bg-[#F5F5F7] border-[#E5E5EA]"
        }`}
      >
        <Users className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
        <span className={`text-xs font-medium mr-1 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
          {users.length} Active
        </span>
        <div className="flex items-center gap-1.5">
          {users.map((u) => {
            const cursorLine = u.cursor ? `Line ${u.cursor.lineNumber}` : null;
            return (
              <button
                key={u.socketId}
                onClick={() => onJumpToUserCursor && onJumpToUserCursor(u)}
                title={cursorLine ? `Click to jump to ${u.name}'s cursor on ${cursorLine}` : u.name}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-transform hover:scale-105 cursor-pointer ${
                  isDark ? "bg-[#232323] border-[#333333]" : "bg-white border-black/5 shadow-xs"
                }`}
                style={{ color: u.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                <span>{u.name}</span>
                {cursorLine && (
                  <span className="text-[10px] opacity-75 font-mono flex items-center gap-0.5">
                    <Navigation className="w-2.5 h-2.5" />
                    {cursorLine}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Actions: Theme Toggle, Invite Link, User Name, Run Code */}
      <div className="flex items-center gap-2">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            isDark
              ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-amber-400"
              : "bg-[#F5F5F7] hover:bg-[#E5E5EA] border-[#E5E5EA] text-indigo-600"
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Netflix Dark Mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Invite Link Button (Copies full URL) */}
        <button
          onClick={handleCopyInviteLink}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
            isDark
              ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-white"
              : "bg-[#F5F5F7] hover:bg-[#E5E5EA] border-[#E5E5EA] text-[#1D1D1F]"
          }`}
          title="Copy full invite link"
        >
          {copiedInvite ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Link Copied!</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Invite</span>
            </>
          )}
        </button>

        {/* Display Name Editor */}
        {isEditingName ? (
          <form onSubmit={handleSaveName} className="flex items-center gap-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={`px-2 py-1 text-xs rounded border focus:outline-none ${
                isDark ? "bg-[#141414] border-[#E50914] text-white" : "bg-white border-[#E50914] text-[#1D1D1F]"
              }`}
              autoFocus
            />
            <button type="submit" className="text-xs bg-[#E50914] px-2 py-1 rounded text-white font-medium">
              Save
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-white"
                : "bg-white hover:bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
            }`}
            title="Edit display name"
          >
            <User className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
            <span>{currentUser.name}</span>
          </button>
        )}

        {/* Run Code Button (Netflix Red) */}
        <button
          onClick={onRunCode}
          disabled={isExecuting}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer shadow-sm ${
            isExecuting
              ? "bg-[#333333] text-[#B3B3B3] cursor-not-allowed"
              : "bg-[#E50914] hover:bg-[#b80710] text-white"
          }`}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
