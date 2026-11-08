"use client";

import React, { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { RoomUser } from "@/types";
import { ThemeMode } from "@/lib/theme";

interface MonacoEditorWrapperProps {
  value: string;
  language: string;
  onChange: (newValue: string) => void;
  onCursorChange: (cursor: { lineNumber: number; column: number }) => void;
  remoteUsers: RoomUser[];
  activeFileId: string;
  theme: ThemeMode;
  onCRDTUpdate?: (updateBase64: string) => void;
  incomingCRDTUpdate?: string | null;
}

export const MonacoEditorWrapper: React.FC<MonacoEditorWrapperProps> = ({
  value,
  language,
  onChange,
  onCursorChange,
  remoteUsers,
  activeFileId,
  theme,
  onCRDTUpdate,
  incomingCRDTUpdate,
}) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isSelfChangeRef = useRef(false);
  const isDark = theme === "dark";

  // Initialize Yjs CRDT Document
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    try {
      const doc = ydocRef.current!;
      const yText = doc.getText(activeFileId);

      if (yText.length === 0 && value) {
        yText.insert(0, value);
      }

      // Listen for local CRDT updates to send to backend & peers
      doc.on("update", (updateUint8: Uint8Array, origin: any) => {
        if (origin !== "remote" && onCRDTUpdate) {
          const updateBase64 = Buffer.from(updateUint8).toString("base64");
          onCRDTUpdate(updateBase64);
        }
      });

      // Listen for Yjs CRDT observer events to sync with Monaco Editor
      yText.observe((event, transaction) => {
        if (transaction.origin === "remote" && editorRef.current) {
          isSelfChangeRef.current = true;
          const updatedContent = yText.toString();
          const model = editorRef.current.getModel();
          if (model && model.getValue() !== updatedContent) {
            editorRef.current.executeEdits("crdt", [
              {
                range: model.getFullModelRange(),
                text: updatedContent,
                forceMoveMarkers: true,
              },
            ]);
          }
          isSelfChangeRef.current = false;
        }
      });
    } catch (err) {
      console.warn("Yjs CRDT setup warning:", err);
    }

    editor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      if (position) {
        onCursorChange({
          lineNumber: position.lineNumber,
          column: position.column,
        });
      }
    });
  };

  // Apply incoming CRDT binary update from peer
  useEffect(() => {
    if (incomingCRDTUpdate && ydocRef.current) {
      try {
        const updateBuffer = Buffer.from(incomingCRDTUpdate, "base64");
        const updateUint8 = new Uint8Array(updateBuffer);
        Y.applyUpdate(ydocRef.current, updateUint8, "remote");
      } catch (err) {
        console.error("Failed applying incoming CRDT update:", err);
      }
    }
  }, [incomingCRDTUpdate]);

  // Handle local typing in Monaco and reflect in Y.Text CRDT
  const handleContentChange = (newVal: string) => {
    if (isSelfChangeRef.current) return;

    onChange(newVal);

    if (ydocRef.current) {
      const yText = ydocRef.current.getText(activeFileId);
      const currentYVal = yText.toString();

      if (currentYVal !== newVal) {
        ydocRef.current.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, newVal);
        });
      }
    }
  };

  // Sync Remote Cursors (Google Docs style: Always visible)
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const newDecorations: any[] = [];

    const activeRemoteUsers = remoteUsers.filter(
      (u) => u.currentFileId === activeFileId && u.cursor
    );

    activeRemoteUsers.forEach((user) => {
      if (!user.cursor) return;

      const { lineNumber, column } = user.cursor;

      newDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column + 1,
        },
        options: {
          className: `remote-cursor-${user.socketId}`,
          after: {
            content: ` ${user.name}`,
            inlineClassName: `remote-tooltip-${user.socketId}`,
          },
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteUsers, activeFileId]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${isDark ? "bg-[#1e1e1e]" : "bg-white"}`}>
      {/* Remote Cursor Dynamic Styles Injector (Always Visible) */}
      <style jsx global>{`
        ${remoteUsers
          .map(
            (u) => `
          .remote-cursor-${u.socketId} {
            border-left: 2.5px solid ${u.color} !important;
            background-color: ${u.color}15 !important;
            opacity: 1 !important;
          }
          .remote-tooltip-${u.socketId} {
            position: absolute;
            top: -20px;
            left: 0;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 6px;
            border-radius: 3px;
            background-color: ${u.color} !important;
            color: #ffffff !important;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            opacity: 1 !important;
          }
        `
          )
          .join("\n")}
      `}</style>

      <Editor
        height="100%"
        theme={isDark ? "vs-dark" : "vs"}
        language={language === "cpp" ? "cpp" : language}
        value={value}
        onChange={(val) => {
          if (val !== undefined) {
            handleContentChange(val);
          }
        }}
        onMount={handleEditorMount}
        options={{
          fontSize: 13,
          fontFamily: "'SF Mono', Consolas, 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "solid",
          cursorSmoothCaretAnimation: "on",
          lineNumbers: "on",
          renderLineHighlight: "all",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};
