"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { EditorContext } from "../lib/types";

export function useTelemetry() {
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);

  const lastKeystrokeTime = useRef(Date.now());
  const typingStartTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const idle = (Date.now() - lastKeystrokeTime.current) / 1000;
      setIdleSeconds(idle);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onKeystroke = useCallback((event: KeyboardEvent) => {
    if (event.key === "Backspace" || event.key === "Delete") {
      setBackspaceCount((c) => c + 1);
    }
    setTotalKeystrokes((c) => c + 1);
    lastKeystrokeTime.current = Date.now();
    setIdleSeconds(0);
  }, []);

  const onPaste = useCallback(() => {
    setPasteCount((c) => c + 1);
  }, []);

  const onRun = useCallback(() => {
    setRunCount((c) => c + 1);
  }, []);

  const getEditorContext = useCallback((): EditorContext => ({
    idle_seconds: idleSeconds,
    backspace_rate: totalKeystrokes > 0 ? backspaceCount / totalKeystrokes : 0,
    paste_count: pasteCount,
    run_count: runCount,
  }), [idleSeconds, totalKeystrokes, backspaceCount, pasteCount, runCount]);

  const reset = useCallback(() => {
    setTotalKeystrokes(0);
    setBackspaceCount(0);
    setPasteCount(0);
    setRunCount(0);
    setIdleSeconds(0);
    lastKeystrokeTime.current = Date.now();
    typingStartTime.current = Date.now();
  }, []);

  const getTimeSpent = useCallback((): number => {
    return Math.floor((Date.now() - typingStartTime.current) / 1000);
  }, []);

  return {
    onKeystroke,
    onPaste,
    onRun,
    getEditorContext,
    reset,
    getTimeSpent,
  };
}
