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

interface UserWidgetRecord {
  widget: any;
  domNode: HTMLElement;
  badge: HTMLElement;
  arrow: HTMLElement;
  nameSpan: HTMLElement;
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
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const widgetsMapRef = useRef<Map<string, UserWidgetRecord>>(new Map());
  const ydocRef = useRef<Y.Doc | null>(null);
  const isSelfChangeRef = useRef(false);
  const isDark = theme === "dark";

  // Initialize Yjs CRDT Document
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

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
            const selections = editorRef.current.getSelections();
            editorRef.current.executeEdits("crdt", [
              {
                range: model.getFullModelRange(),
                text: updatedContent,
                forceMoveMarkers: true,
              },
            ]);
            if (selections) {
              editorRef.current.setSelections(selections);
            }
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

  // Sync Remote Cursors and Floating Name Bubbles
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const activeRemoteUsers = remoteUsers.filter(
      (u) => u.currentFileId === activeFileId && u.cursor
    );

    const activeUserSockets = new Set<string>();

    // 1. Manage Floating Name Bubble Content Widgets
    activeRemoteUsers.forEach((user) => {
      if (!user.cursor) return;
      activeUserSockets.add(user.socketId);

      const { lineNumber, column } = user.cursor;
      let record = widgetsMapRef.current.get(user.socketId);

      if (!record) {
        const domNode = document.createElement("div");
        domNode.className = "remote-cursor-bubble-container";
        domNode.style.pointerEvents = "none";
        domNode.style.userSelect = "none";
        domNode.style.zIndex = "60";
        domNode.style.lineHeight = "1";

        const badge = document.createElement("div");
        badge.className = "remote-cursor-bubble-badge";
        badge.style.backgroundColor = user.color;
        badge.style.color = "#ffffff";
        badge.style.fontSize = "10.5px";
        badge.style.fontWeight = "600";
        badge.style.padding = "2.5px 8px";
        badge.style.borderRadius = "9999px";
        badge.style.whiteSpace = "nowrap";
        badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        badge.style.position = "relative";
        badge.style.display = "inline-flex";
        badge.style.alignItems = "center";
        badge.style.letterSpacing = "0.2px";
        badge.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        badge.style.transform = "translateY(-4px)";

        const nameSpan = document.createElement("span");
        nameSpan.innerText = user.name;
        badge.appendChild(nameSpan);

        const arrow = document.createElement("div");
        arrow.style.position = "absolute";
        arrow.style.bottom = "-3.5px";
        arrow.style.left = "8px";
        arrow.style.width = "0";
        arrow.style.height = "0";
        arrow.style.borderLeft = "3.5px solid transparent";
        arrow.style.borderRight = "3.5px solid transparent";
        arrow.style.borderTop = `3.5px solid ${user.color}`;
        badge.appendChild(arrow);

        domNode.appendChild(badge);

        let currentPosition = { lineNumber, column };

        const widget = {
          getId: () => `widget-remote-user-${user.socketId}`,
          getDomNode: () => domNode,
          getPosition: () => ({
            position: currentPosition,
            preference: [
              monaco.editor.ContentWidgetPositionPreference.ABOVE,
              monaco.editor.ContentWidgetPositionPreference.BELOW,
            ],
          }),
        };

        editor.addContentWidget(widget);

        record = { widget, domNode, badge, arrow, nameSpan };
        widgetsMapRef.current.set(user.socketId, record);
      } else {
        // Update user properties if changed
        record.badge.style.backgroundColor = user.color;
        record.arrow.style.borderTop = `3.5px solid ${user.color}`;
        if (record.nameSpan.innerText !== user.name) {
          record.nameSpan.innerText = user.name;
        }

        // Update widget coordinates
        record.widget.getPosition = () => ({
          position: { lineNumber, column },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
            monaco.editor.ContentWidgetPositionPreference.BELOW,
          ],
        });

        editor.layoutContentWidget(record.widget);
      }
    });

    // Remove widgets for users who left or switched files
    widgetsMapRef.current.forEach((record, socketId) => {
      if (!activeUserSockets.has(socketId)) {
        try {
          editor.removeContentWidget(record.widget);
        } catch (_) {}
        widgetsMapRef.current.delete(socketId);
      }
    });

    // 2. Manage Vertical Cursor Caret Lines (0-width ranges)
    const newDecorations: any[] = [];
    activeRemoteUsers.forEach((user) => {
      if (!user.cursor) return;
      const { lineNumber, column } = user.cursor;

      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-caret-${user.socketId}`,
          isWholeLine: false,
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteUsers, activeFileId]);

  // Clean up content widgets on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const editor = editorRef.current;
        widgetsMapRef.current.forEach((record) => {
          try {
            editor.removeContentWidget(record.widget);
          } catch (_) {}
        });
        widgetsMapRef.current.clear();
      }
    };
  }, []);

  return (
    <div className={`w-full h-full relative overflow-hidden ${isDark ? "bg-[#1e1e1e]" : "bg-white"}`}>
      {/* Remote Caret Vertical Line Styles */}
      <style jsx global>{`
        ${remoteUsers
          .map(
            (u) => `
          .remote-caret-${u.socketId} {
            border-left: 2px solid ${u.color} !important;
            margin-left: -1px !important;
            pointer-events: none !important;
            z-index: 45 !important;
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
