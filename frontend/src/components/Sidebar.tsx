"use client";

import React, { useState } from "react";
import { Folder, FileCode, Plus, Trash2, ChevronDown, ChevronRight, FileText, Code } from "lucide-react";
import { ProjectFile } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface SidebarProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, language: string) => void;
  onDeleteFile: (fileId: string) => void;
  theme: ThemeMode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  theme,
}) => {
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const isDark = theme === "dark";

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "cpp":
      case "c":
      case "h":
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <Code className="w-3.5 h-3.5 text-amber-400" />;
      case "py":
        return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
      case "md":
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileCode className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />;
    }
  };

  const detectLanguage = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "cpp":
      case "c":
        return "cpp";
      case "py":
        return "python";
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "md":
        return "markdown";
      default:
        return "javascript";
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const lang = detectLanguage(name);
    onCreateFile(name, lang);
    setNewFileName("");
    setIsCreating(false);
  };

  return (
    <aside
      className={`w-60 border-r flex flex-col shrink-0 select-none transition-colors ${
        isDark ? "bg-[#181818] border-[#333333] text-white" : "bg-white border-[#E5E5EA] text-[#1D1D1F]"
      }`}
    >
      {/* Section Header */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
          isDark ? "bg-[#141414] border-[#333333]" : "bg-[#F5F5F7] border-[#E5E5EA]"
        }`}
      >
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
          Explorer
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className={`p-1 rounded transition-colors cursor-pointer ${
            isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#232323]" : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]"
          }`}
          title="New File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File Tree */}
      <div className="py-2 px-1.5 flex-1 overflow-y-auto space-y-0.5">
        <div
          onClick={() => setIsProjectOpen(!isProjectOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium text-xs cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#232323] text-white" : "hover:bg-[#F5F5F7] text-[#1D1D1F]"
          }`}
        >
          {isProjectOpen ? (
            <ChevronDown className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
          ) : (
            <ChevronRight className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
          )}
          <Folder className="w-3.5 h-3.5 text-[#E50914]" />
          <span className="font-semibold">project</span>
        </div>

        {isProjectOpen && (
          <div className="pl-3.5 space-y-0.5">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-[#232323] text-white font-semibold border-l-2 border-[#E50914]"
                        : "bg-[#F5F5F7] text-[#1D1D1F] font-semibold border-l-2 border-[#E50914]"
                      : isDark
                      ? "text-[#B3B3B3] hover:bg-[#232323] hover:text-white"
                      : "text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getFileIcon(file.name)}
                    <span className="truncate">{file.name}</span>
                  </div>

                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${file.name}?`)) {
                          onDeleteFile(file.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-400 transition-opacity cursor-pointer"
                      title="Delete File"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="mt-1.5 pl-4 pr-2">
            <input
              type="text"
              placeholder="filename.cpp"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className={`w-full px-2 py-1 border rounded text-xs focus:outline-none ${
                isDark ? "bg-[#141414] border-[#E50914] text-white" : "bg-white border-[#E50914] text-[#1D1D1F]"
              }`}
              autoFocus
              onBlur={() => {
                if (!newFileName.trim()) setIsCreating(false);
              }}
            />
          </form>
        )}
      </div>

      {/* Footer */}
      <div
        className={`px-3 py-2 border-t text-[11px] flex justify-between items-center ${
          isDark ? "bg-[#141414] border-[#333333] text-[#B3B3B3]" : "bg-[#F5F5F7] border-[#E5E5EA] text-[#6E6E73]"
        }`}
      >
        <span>DevSync Workspace</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    </aside>
  );
};
