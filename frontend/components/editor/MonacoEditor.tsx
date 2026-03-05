"use client";

import { useRef, useEffect, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onKeystroke?: (event: KeyboardEvent) => void;
  onPaste?: () => void;
}

export default function MonacoEditor({
  language,
  value,
  onChange,
  onKeystroke,
  onPaste,
}: MonacoEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const onKeystrokeRef = useRef(onKeystroke);
  const onPasteRef = useRef(onPaste);

  // Keep callback refs current without re-mounting the editor
  useEffect(() => { onKeystrokeRef.current = onKeystroke; }, [onKeystroke]);
  useEffect(() => { onPasteRef.current = onPaste; }, [onPaste]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Track keystrokes via Monaco (not document-level) to avoid double-counting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.onKeyDown((e: any) => {
      if (onKeystrokeRef.current) {
        const key = e.browserEvent?.key || e.code || "Unknown";
        onKeystrokeRef.current(new KeyboardEvent("keydown", { key }));
      }
    });

    // Track paste events
    editor.onDidPaste(() => {
      if (onPasteRef.current) {
        onPasteRef.current();
      }
    });

    // Force Monaco to remeasure font metrics after JetBrains Mono loads.
    // remeasureFonts is a STATIC method on monaco.editor, not on the instance.
    const remeasure = () => {
      editor.layout();
      try { monaco.editor.remeasureFonts(); } catch { /* noop for older versions */ }
    };

    // Wait for all fonts (covers cached / already-loaded case)
    document.fonts.ready.then(() => remeasure());

    // Also specifically wait for JetBrains Mono and add a safety delay
    document.fonts.load('14px "JetBrains Mono"').then(() => {
      setTimeout(remeasure, 100);
    }).catch(() => { /* font not available, fallback font already measured */ });

    editor.focus();
  }, []);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v || "")}
      onMount={handleEditorMount}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: "JetBrains Mono, Consolas, 'Courier New', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        roundedSelection: true,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "on",
        padding: { top: 16, bottom: 16 },
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
      }}
    />
  );
}
