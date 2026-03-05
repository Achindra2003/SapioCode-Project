import { CompileResponse } from "../types";
import { LANGUAGES } from "../constants";

export async function executeCode(
  code: string,
  language: string = "python3",
  stdin: string = ""
): Promise<CompileResponse> {
  const langConfig = LANGUAGES[language as keyof typeof LANGUAGES];

  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const response = await fetch("/api/compile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      stdin,
      language: langConfig.language,
      versionIndex: langConfig.versionIndex,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  const data: CompileResponse = await response.json();
  return data;
}
