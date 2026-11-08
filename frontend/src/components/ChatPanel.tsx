"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { ChatMessage, RoomUser } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: { id: string; name: string };
  typingUsers: RoomUser[];
  onTyping: (isTyping: boolean) => void;
  theme: ThemeMode;
}

const QUICK_CHIPS = ["fixed it 👍", "check line 4", "looks good", "ship it"];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  currentUser,
  typingUsers,
  onTyping,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
    onTyping(false);
  };

  const handleChipClick = (chipText: string) => {
    onSendMessage(chipText);
  };

  return (
    <div
      className={`h-full w-full flex flex-col transition-colors ${
        isDark ? "bg-[#181818] text-white" : "bg-white text-[#1D1D1F]"
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3.5 border-b flex items-center justify-between cursor-pointer select-none shrink-0 ${
          isDark ? "bg-[#141414] border-[#333333] hover:bg-[#232323]" : "bg-[#F5F5F7] border-[#E5E5EA] hover:bg-[#E5E5EA]/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#E50914]" />
          <span className="text-xs font-semibold">Chat</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono border ${
              isDark ? "bg-[#232323] text-[#B3B3B3] border-[#333333]" : "bg-white text-[#6E6E73] border-[#E5E5EA]"
            }`}
          >
            {messages.length}
          </span>
        </div>
        <button className={isDark ? "text-[#B3B3B3] hover:text-white" : "text-[#6E6E73] hover:text-[#1D1D1F]"}>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden min-h-0">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {messages.map((msg) => {
              const isMe = msg.userName === currentUser.name;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col text-xs max-w-[85%] ${
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="font-semibold text-[11px]"
                      style={{ color: isMe ? "#E50914" : msg.userColor || "#34C759" }}
                    >
                      {isMe ? "You" : msg.userName}
                    </span>
                    <span className={`text-[10px] ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg border text-xs leading-relaxed break-words shadow-xs ${
                      isMe
                        ? "bg-[#E50914] text-white border-[#E50914]"
                        : isDark
                        ? "bg-[#232323] border-[#333333] text-white"
                        : "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {typingUsers.length > 0 && (
              <div className="text-[11px] text-[#E50914] italic">
                {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chips & Input Container (Anchored at bottom, no empty space) */}
          <div className="shrink-0 pt-2 space-y-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className={`px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                    isDark
                      ? "bg-[#232323] hover:bg-[#333333] border-[#333333] text-[#B3B3B3] hover:text-white"
                      : "bg-[#F5F5F7] hover:bg-[#E5E5EA] border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Type message..."
                value={inputText}
                onChange={handleInputChange}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E50914] border ${
                  isDark
                    ? "bg-[#141414] border-[#333333] text-white placeholder-[#B3B3B3]"
                    : "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F] placeholder-[#6E6E73]"
                }`}
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#E50914] hover:bg-[#b80710] text-white rounded-md text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
