"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, RotateCcw, CheckCircle, XCircle, AlertTriangle,
  Loader2, Mic, Square, Keyboard, Lightbulb, Shield,
} from "lucide-react";
import { vivaApi, VivaAnswerResult, VivaQuestion } from "@/lib/api/ai";

interface VivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  problemDescription: string;
  threadId: string;
  userId: string;
  onComplete: (verdict: "pass" | "weak" | "fail", score: number) => void;
  language?: string;
}

type VivaPhase =
  | "initializing"
  | "question"
  | "recording"
  | "transcribing"
  | "evaluating"
  | "feedback"
  | "verdict"
  | "error";

export default function VivaModal({
  isOpen,
  onClose,
  code,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  problemDescription,
  threadId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId,
  onComplete,
  language = "python",
}: VivaModalProps) {
  const [phase, setPhase] = useState<VivaPhase>("initializing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Question state
  const [, setQuestions] = useState<VivaQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Recording state
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Input mode
  const [useTextMode, setUseTextMode] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  // Answer state
  const [lastAnswer, setLastAnswer] = useState<string>("");
  const [lastFeedback, setLastFeedback] = useState<VivaAnswerResult | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);

  // Verdict state
  const [finalVerdict, setFinalVerdict] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  // Conversation tracking
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string; score: number; feedback: string }>>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // ── Start viva session when modal opens ──
  useEffect(() => {
    if (isOpen && !startedRef.current) {
      startedRef.current = true;
      startViva();
    }
    return () => stopRecordingCleanup();
  }, [isOpen]);

  useEffect(() => {
    if (phase === "question" && useTextMode) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [phase, questionNumber, useTextMode]);

  const resetState = () => {
    setPhase("initializing");
    setErrorMsg(null);
    setQuestions([]);
    setCurrentQuestion("");
    setQuestionNumber(0);
    setTotalQuestions(0);
    setRecordingDuration(0);
    setUseTextMode(false);
    setTextAnswer("");
    setLastAnswer("");
    setLastFeedback(null);
    setFinalVerdict(null);
    setFinalScore(0);
    setAnswers([]);
    startedRef.current = false;
    sessionIdRef.current = null;
    audioChunksRef.current = [];
  };

  const startViva = async () => {
    setPhase("initializing");
    setErrorMsg(null);

    try {
      const response = await vivaApi.start(threadId, code, 3, language);

      // Detect silent start failure (no questions generated)
      if (!response.questions || response.questions.length === 0) {
        setErrorMsg("Could not generate viva questions for this code. Please ensure your solution has some logic and try again.");
        setPhase("error");
        return;
      }

      // Store session_id for belt-and-suspenders persistence
      sessionIdRef.current = response.session_id || null;

      setQuestions(response.questions);
      setTotalQuestions(response.questions.length);
      setCurrentQuestion(response.first_question);
      setQuestionNumber(1);
      setPhase("question");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to start viva session");
      setPhase("error");
    }
  };

  // ── Audio recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecordingDuration(0);
      setPhase("recording");

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Mic denied or unavailable — fall back to text
      setUseTextMode(true);
      setPhase("question");
    }
  };

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return null;

    return new Promise<Blob>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      mediaRecorderRef.current!.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
  }, []);

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Process an answer (shared by voice and text paths) ──
  const processAnswer = async (answerText: string) => {
    setLastAnswer(answerText);
    setPhase("evaluating");

    try {
      const result = await vivaApi.answer(
        threadId, answerText, code, language,
        sessionIdRef.current ?? undefined  // belt-and-suspenders: bypass LangGraph checkpoint lookup
      );
      setLastFeedback(result);

      setAnswers((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: answerText,
          score: result.score,
          feedback: result.feedback,
        },
      ]);

      if (result.is_complete) {
        const verdict = result.verdict || (result.average_score && result.average_score >= 0.6 ? "pass" : "fail");
        setFinalVerdict(verdict);
        setFinalScore(result.average_score || result.score);
        setPhase("verdict");
      } else {
        const responseText = result.response || "";
        const nextQMatch = responseText.match(/\*\*(?:Next question|Question \d+):\*\*\s*(.*)/i);
        const nextQuestion = nextQMatch ? nextQMatch[1].trim() : responseText;
        setCurrentQuestion(nextQuestion);
        setQuestionNumber((n) => n + 1);
        setHintText(null);
        setPhase("feedback");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Stop recording → transcribe → evaluate ──
  const handleStopAndSubmit = async () => {
    try {
      const audioBlob = await stopRecording();
      // Clean up mic
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!audioBlob || audioBlob.size < 1000) {
        setErrorMsg("Recording too short. Please speak for at least 2 seconds.");
        setPhase("question");
        return;
      }

      // Transcribe via Groq Whisper
      setPhase("transcribing");
      const transcription = await vivaApi.transcribe(audioBlob);

      if (!transcription.success || !transcription.text) {
        setErrorMsg("Could not transcribe audio. Try again or switch to text.");
        setPhase("question");
        return;
      }

      // Submit transcribed text for evaluation
      await processAnswer(transcription.text);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Text submit ──
  const handleTextSubmit = async () => {
    if (!textAnswer.trim()) return;
    const text = textAnswer.trim();
    setTextAnswer("");
    await processAnswer(text);
  };

  const proceedToNextQuestion = () => {
    setLastFeedback(null);
    setLastAnswer("");
    setPhase("question");
  };

  const handleRetry = () => {
    stopRecordingCleanup();
    resetState();
    startedRef.current = true;
    startViva();
  };

  const handleClose = () => {
    stopRecordingCleanup();
    resetState();
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass-panel rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#44f91f]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#44f91f]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#44f91f] bg-[#44f91f]/10 px-2 py-0.5 rounded">Reflection Required</span>
              </div>
              <h2 className="text-lg font-bold text-white">Metacognitive Defense</h2>
              <p className="text-xs text-gray-500">
                {phase === "initializing"
                  ? "Analyzing your code..."
                  : phase === "verdict"
                  ? "Defense complete"
                  : `Challenge ${questionNumber} of ${totalQuestions}`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 min-h-[300px]">
          {/* ── Initializing ── */}
          {phase === "initializing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-[#44f91f] animate-spin" />
              <span className="text-slate-400">Preparing your defense challenges...</span>
            </div>
          )}

          {/* ── Error ── */}
          {phase === "error" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <XCircle className="w-12 h-12 text-red-500" />
              <p className="text-red-400 text-center max-w-md">{errorMsg}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* ── Question (voice or text input) ── */}
          {phase === "question" && (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-[#44f91f] h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(68,249,31,0.4)]"
                    style={{ width: `${((questionNumber - 1) / Math.max(totalQuestions, 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="bg-white/5 rounded-xl p-5 mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#44f91f] mb-2 block">AI Challenge</span>
                <p className="text-white text-lg leading-relaxed">{currentQuestion}</p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                </div>
              )}

              {!useTextMode ? (
                /* Voice mode */
                <div className="flex flex-col items-center gap-4">
                  <p className="text-gray-500 text-sm">Click the microphone and explain your answer verbally</p>
                  <button
                    onClick={startRecording}
                    className="group w-20 h-20 rounded-full bg-[#44f91f] hover:brightness-110 flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_30px_rgba(68,249,31,0.3)]"
                  >
                    <Mic className="w-8 h-8 text-black" />
                  </button>
                  <button
                    onClick={() => { setUseTextMode(true); setErrorMsg(null); }}
                    className="text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
                  >
                    <Keyboard className="w-3 h-3 inline mr-1" />
                    Can&apos;t use microphone? Type instead
                  </button>
                </div>
              ) : (
                /* Text fallback mode */
                <div className="space-y-3">
                  <textarea
                    ref={inputRef}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Explain your reasoning here..."
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#44f91f]/40 focus:border-[#44f91f]/50 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (hintText) return;
                        const q = currentQuestion.toLowerCase();
                        if (q.includes("purpose") || q.includes("what does")) {
                          setHintText("Think about what the code produces as output and why someone would write it.");
                        } else if (q.includes("time complexity") || q.includes("big o")) {
                          setHintText("Count the loops — how many times does each one run relative to the input size?");
                        } else if (q.includes("improve") || q.includes("better")) {
                          setHintText("Consider if there are redundant operations or a more efficient data structure.");
                        } else {
                          setHintText("Look at your code line by line and explain what each part does in your own words.");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-[#44f91f]/70 hover:text-[#44f91f] transition-colors"
                    >
                      <Lightbulb className="w-3 h-3" />
                      {hintText ? "Hint shown below" : "I need a hint"}
                    </button>
                    <button
                      onClick={() => { setUseTextMode(false); setErrorMsg(null); }}
                      className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      <Mic className="w-3 h-3 inline mr-1" />
                      Switch to voice
                    </button>
                  </div>
                  {hintText && (
                    <div className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                      <Lightbulb className="w-3 h-3 inline mr-1.5 -mt-0.5" />
                      {hintText}
                    </div>
                  )}
                  <button
                    onClick={handleTextSubmit}
                    disabled={!textAnswer.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-[#44f91f] hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(68,249,31,0.3)]"
                  >
                    Submit Defense →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Recording ── */}
          {phase === "recording" && (
            <>
              <div className="bg-white/5 rounded-xl p-5 mb-6">
                <p className="text-white text-lg leading-relaxed">{currentQuestion}</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 w-24 h-24 rounded-full bg-red-500/20 animate-ping" />
                  <button
                    onClick={handleStopAndSubmit}
                    className="relative w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all z-10"
                  >
                    <Square className="w-8 h-8 text-white fill-white" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono">Recording {formatDuration(recordingDuration)}</span>
                </div>
                <p className="text-gray-500 text-xs">Click the stop button when done</p>
              </div>
            </>
          )}

          {/* ── Transcribing ── */}
          {phase === "transcribing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <span className="text-blue-400">Transcribing with Whisper...</span>
            </div>
          )}

          {/* ── Evaluating ── */}
          {phase === "evaluating" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <span className="text-amber-400">Evaluating your understanding...</span>
              {lastAnswer && (
                <div className="max-w-md bg-white/5 rounded-xl p-3 mt-2">
                  <p className="text-xs text-gray-500 mb-1">Your response:</p>
                  <p className="text-sm text-gray-300 italic">&quot;{lastAnswer}&quot;</p>
                </div>
              )}
            </div>
          )}

          {/* ── Feedback (between questions) ── */}
          {phase === "feedback" && lastFeedback && (
            <div className="space-y-4">
              {lastAnswer && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Your Response</p>
                  <p className="text-sm text-gray-300 italic">&quot;{lastAnswer}&quot;</p>
                </div>
              )}

              <div
                className={`rounded-xl p-4 border ${
                  lastFeedback.is_acceptable
                    ? "bg-[#44f91f]/10 border-[#44f91f]/20"
                    : "bg-amber-500/10 border-amber-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {lastFeedback.is_acceptable ? (
                    <CheckCircle className="w-5 h-5 text-[#44f91f]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <span
                    className={`text-sm font-bold ${lastFeedback.is_acceptable ? "text-[#44f91f]" : "text-amber-400"}`}
                  >
                    Score: {Math.round(lastFeedback.score * 100)}%
                  </span>
                </div>
                <p className="text-sm text-gray-300">{lastFeedback.feedback}</p>

                {lastFeedback.matched_concepts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lastFeedback.matched_concepts.map((c) => (
                      <span key={c} className="text-xs bg-[#44f91f]/20 text-[#44f91f] px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {lastFeedback.missing_concepts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lastFeedback.missing_concepts.map((c) => (
                      <span key={c} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        missed: {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={proceedToNextQuestion}
                className="w-full bg-[#44f91f] hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(68,249,31,0.3)]"
              >
                Next Challenge →
              </button>
            </div>
          )}

          {/* ── Final Verdict ── */}
          {phase === "verdict" && finalVerdict && (
            <div className="text-center py-6">
              {(finalVerdict === "pass" || finalVerdict === "PASS") && (
                <>
                  <CheckCircle className="w-20 h-20 text-[#44f91f] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-[#44f91f] mb-2">Defense Verified</h3>
                  <p className="text-slate-400 mb-4">You&apos;ve demonstrated deep understanding of your logic.</p>
                </>
              )}
              {(finalVerdict === "weak" || finalVerdict === "NEEDS_DETAIL") && (
                <>
                  <AlertTriangle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-amber-400 mb-2">Partial Defense</h3>
                  <p className="text-slate-400 mb-4">Some reasoning was correct but key details are missing.</p>
                </>
              )}
              {(finalVerdict === "fail" || finalVerdict === "FAIL") && (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-red-400 mb-2">Defense Failed</h3>
                  <p className="text-slate-400 mb-4">Review the underlying concepts and defend your logic again.</p>
                </>
              )}

              <p className="text-lg text-white mb-4">
                Score: {Math.round(finalScore * 100)}%
              </p>

              {answers.length > 0 && (
                <div className="text-left mb-6 space-y-2 max-w-md mx-auto">
                  {answers.map((a, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-sm">
                      <div className="flex justify-between text-gray-400 mb-1">
                        <span>Q{i + 1}</span>
                        <span className={a.score >= 0.5 ? "text-[#44f91f]" : "text-red-400"}>
                          {Math.round(a.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1 truncate">Q: {a.question}</p>
                      <p className="text-xs text-gray-500">{a.feedback}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {(finalVerdict === "pass" || finalVerdict === "PASS") && (
                  <button
                    onClick={() => {
                      onComplete("pass", finalScore);
                      handleClose();
                    }}
                    className="bg-[#44f91f] hover:brightness-110 text-black font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(68,249,31,0.3)]"
                  >
                    Continue
                  </button>
                )}

                {(finalVerdict === "weak" || finalVerdict === "NEEDS_DETAIL") && (
                  <>
                    <button
                      onClick={() => {
                        onComplete("weak", finalScore);
                        handleClose();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      Review Code
                    </button>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retry Defense
                    </button>
                  </>
                )}

                {(finalVerdict === "fail" || finalVerdict === "FAIL") && (
                  <button
                    onClick={() => {
                      onComplete("fail", finalScore);
                      handleClose();
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                  >
                    Return to Editor
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
