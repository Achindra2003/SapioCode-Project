"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useCallback } from "react";

interface MonacoEditorProps {
    language: string;
    value: string;
    onChange: (value: string) => void;
    onRunCode?: () => void;
}

export default function MonacoEditor({ language, value, onChange, onRunCode }: MonacoEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;

        // Define Obsidian Theme
        monaco.editor.defineTheme("obsidian-glass", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#02040800", // Transparent for glass effect
                "editor.lineHighlightBackground": "#ffffff05",
                "editorCursor.foreground": "#10b981",
                "editor.selectionBackground": "#10b98120",
                "editorIndentGuide.background": "#ffffff05",
                "editorIndentGuide.activeBackground": "#ffffff10",
            },
        });

        monaco.editor.setTheme("obsidian-glass");

        // Add Keybinding
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRunCode?.();
        });
    }, [onRunCode]);

    return (
        <div className="h-full w-full bg-transparent">
            <Editor
                height="100%"
                width="100%"
                language={language}
                value={value}
                theme="obsidian-glass"
                onChange={(val) => onChange(val || "")}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 16,
                    fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 40, bottom: 40 },
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 20,
                    lineNumbersMinChars: 3,
                    cursorSmoothCaretAnimation: "on",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    renderLineHighlight: "all",
                    contextmenu: false,
                    scrollbar: {
                        vertical: "hidden",
                        horizontal: "hidden",
                    },
                }}
            />
        </div>
    );
}
