import { EditorContext } from "./types";

export function calculateFrustration(context: EditorContext): number {
  let score = 0;

  if (context.idle_seconds > 180) {
    score += 0.4;
  } else if (context.idle_seconds > 60) {
    score += 0.2;
  }

  if (context.backspace_rate > 0.4) {
    score += 0.3;
  } else if (context.backspace_rate > 0.2) {
    score += 0.15;
  }

  if (context.run_count > 5) {
    score += 0.2;
  }

  score += Math.min(context.paste_count * 0.1, 0.3);

  return Math.min(score, 1.0);
}

export function getFrustrationLevel(score: number): "low" | "medium" | "high" {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}
