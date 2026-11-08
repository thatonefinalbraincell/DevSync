"use client";

import React, { useState } from "react";
import { Terminal, Trash2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { CodeExecutionResult } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface TerminalOutputProps {
  result: CodeExecutionResult | null;
  onClear: () => void;
  theme: ThemeMode;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ result, onClear, theme }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isDark = theme === "dark";

  if (!result && !isOpen) return null;

  return (
    <div
      className={`border-t transition-all flex flex-col shrink-0 ${
        isOpen ? "h-44" : "h-9"
      } ${isDark ? "bg-[#181818] border-[#333333]" : "bg-white border-[#E5E5EA]"}`}
    >
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3.5 border-b flex items-center justify-between cursor-pointer select-none ${
          isDark ? "bg-[#141414] border-[#333333] hover:bg-[#232323]" : "bg-[#F5F5F7] border-[#E5E5EA] hover:bg-[#E5E5EA]/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-500" />
          <span className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#1D1D1F]"}`}>Console</span>

          {result && (
            <div className="flex items-center gap-3 ml-3 text-xs font-mono">
              <span
                className={`flex items-center gap-1 font-medium ${
                  result.exitCode === 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {result.exitCode === 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                Exit {result.exitCode}
              </span>

              <span className={`flex items-center gap-1 ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
                <Clock className="w-3 h-3" />
                {result.executionTime}ms
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {result && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className={`p-1 rounded transition-colors ${
                isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#232323]" : "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]"
              }`}
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button className={isDark ? "text-[#B3B3B3] hover:text-white" : "text-[#6E6E73] hover:text-[#1D1D1F]"}>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className={`flex-1 p-3 font-mono text-xs overflow-y-auto space-y-2 ${
            isDark ? "bg-[#141414]" : "bg-[#F5F5F7]"
          }`}
        >
          {!result ? (
            <div className={`text-xs ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
              Click "Run Code" in top bar to execute...
            </div>
          ) : (
            <>
              {result.stdout && (
                <div className="space-y-1">
                  <div className={`font-semibold text-[10px] uppercase tracking-wider ${isDark ? "text-[#B3B3B3]" : "text-[#6E6E73]"}`}>
                    Output:
                  </div>
                  <pre
                    className={`p-2.5 rounded-md border whitespace-pre-wrap leading-relaxed ${
                      isDark
                        ? "text-emerald-400 bg-[#181818] border-[#333333]"
                        : "text-emerald-700 bg-white border-[#E5E5EA] shadow-xs"
                    }`}
                  >
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.stderr && (
                <div className="space-y-1">
                  <div className="text-red-500 font-semibold text-[10px] uppercase tracking-wider">Errors:</div>
                  <pre
                    className={`p-2.5 rounded-md border whitespace-pre-wrap leading-relaxed ${
                      isDark
                        ? "text-red-400 bg-red-950/30 border-red-900/40"
                        : "text-red-700 bg-red-50 border-red-200 shadow-xs"
                    }`}
                  >
                    {result.stderr}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
