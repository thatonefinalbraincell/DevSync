"use client";

import React from "react";
import { X, Code2 } from "lucide-react";
import { ProjectFile } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface EditorTabBarProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onLanguageChange: (fileId: string, language: string) => void;
  theme: ThemeMode;
}

const SUPPORTED_LANGUAGES = [
  { id: "cpp", name: "C++" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python" },
  { id: "html", name: "HTML" },
  { id: "css", name: "CSS" },
  { id: "markdown", name: "Markdown" },
];

export const EditorTabBar: React.FC<EditorTabBarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCloseTab,
  onLanguageChange,
  theme,
}) => {
  const activeFile = files.find((f) => f.id === activeFileId);
  const isDark = theme === "dark";

  return (
    <div
      className={`h-9 border-b flex items-center justify-between select-none px-2 overflow-x-auto transition-colors ${
        isDark ? "bg-[#181818] border-[#333333]" : "bg-[#F5F5F7] border-[#E5E5EA]"
      }`}
    >
      {/* File Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto h-full pt-1">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`flex items-center gap-2 px-3 h-full rounded-t-md text-xs transition-colors cursor-pointer border-t-2 ${
                isActive
                  ? isDark
                    ? "bg-[#1e1e1e] text-white font-semibold border-[#E50914]"
                    : "bg-white text-[#1D1D1F] font-semibold border-[#E50914] shadow-xs"
                  : isDark
                  ? "bg-transparent text-[#B3B3B3] hover:bg-[#232323] hover:text-white border-transparent"
                  : "bg-transparent text-[#6E6E73] hover:bg-[#E5E5EA]/60 hover:text-[#1D1D1F] border-transparent"
              }`}
            >
              <span>{file.name}</span>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                  className={`p-0.5 rounded transition-colors ${
                    isDark ? "hover:bg-[#333333] text-[#B3B3B3] hover:text-white" : "hover:bg-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Language selector */}
      {activeFile && (
        <div className="flex items-center gap-1.5 px-2 shrink-0">
          <Code2 className={`w-3.5 h-3.5 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`} />
          <select
            value={activeFile.language}
            onChange={(e) => onLanguageChange(activeFile.id, e.target.value)}
            className={`rounded px-2 py-0.5 text-xs focus:outline-none focus:border-[#E50914] cursor-pointer border ${
              isDark
                ? "bg-[#141414] border-[#333333] text-white"
                : "bg-white border-[#E5E5EA] text-[#1D1D1F] shadow-xs"
            }`}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
