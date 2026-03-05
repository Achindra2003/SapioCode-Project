/**
 * Utility to normalize starter_code from the backend into a
 * per-language Record<string, string> used by the workbench.
 *
 * Handles:
 *  • dict  { python3: "...", java: "...", cpp17: "...", nodejs: "..." }
 *  • string (legacy — treated as python3 only)
 *  • missing / empty → uses LANGUAGES[lang].starter as default
 *
 * For any language key that is empty/missing, generates a sensible
 * boilerplate based on the problem title (like LeetCode does).
 */
import { LANGUAGES } from "@/lib/constants";

const LANG_KEYS = ["python3", "java", "cpp17", "nodejs"] as const;

/**
 * Attempt to extract a function name from Python starter code.
 * Falls back to "solution" if nothing found.
 */
function extractFunctionName(pythonCode: string): string {
  const match = pythonCode.match(/def\s+(\w+)\s*\(/);
  return match ? match[1] : "solution";
}

/**
 * Attempt to extract parameter names from Python starter code.
 * Returns empty array if nothing found.
 */
function extractParams(pythonCode: string): string[] {
  const match = pythonCode.match(/def\s+\w+\s*\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((p) => p.trim().split(":")[0].split("=")[0].trim())
    .filter(Boolean);
}

/**
 * Converts a snake_case name to camelCase.
 */
function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Generate a Java boilerplate from a function name and params.
 */
function javaBoilerplate(funcName: string, params: string[]): string {
  const camelName = toCamelCase(funcName);
  const javaParams = params.map((p) => `Object ${p}`).join(", ");
  return `import java.util.*;

public class Main {
    public static Object ${camelName}(${javaParams}) {
        // Write your solution here
        return null;
    }

    public static void main(String[] args) {
        System.out.println(${camelName}(${params.map(() => "null").join(", ")}));
    }
}
`;
}

/**
 * Generate a C++17 boilerplate from a function name and params.
 */
function cppBoilerplate(funcName: string, params: string[]): string {
  const cppParams = params.map((p) => `auto ${p}`).join(", ");
  return `#include <iostream>
#include <vector>
#include <string>
using namespace std;

auto ${funcName}(${cppParams}) {
    // Write your solution here
    return 0;
}

int main() {
    cout << ${funcName}(${params.map(() => "0").join(", ")}) << endl;
    return 0;
}
`;
}

/**
 * Generate a Node.js/JavaScript boilerplate from a function name and params.
 */
function nodejsBoilerplate(funcName: string, params: string[]): string {
  const camelName = toCamelCase(funcName);
  return `function ${camelName}(${params.join(", ")}) {
    // Write your solution here
    return null;
}

// Test your solution
console.log(${camelName}(${params.map(() => "null").join(", ")}));
`;
}

/**
 * Generate a Python boilerplate from a function name and params.
 */
function pythonBoilerplate(funcName: string, params: string[]): string {
  return `def ${funcName}(${params.join(", ")}):
    # Write your solution here
    pass

# Test your solution
if __name__ == "__main__":
    print(${funcName}(${params.map(() => "None").join(", ")}))
`;
}

/**
 * Normalize starter_code from the backend into a per-language map.
 *
 * @param raw - either a string (legacy python-only) or dict { python3, java, cpp17, nodejs }
 * @param title - problem title, used to generate a fallback function name
 * @returns Record<string, string> with keys for all 4 supported languages
 */
export function normalizeStarterCode(
  raw: string | Record<string, string> | undefined | null,
  title?: string
): Record<string, string> {
  const result: Record<string, string> = {};

  // Parse raw into a working dict
  let dict: Record<string, string> = {};
  if (typeof raw === "string" && raw.trim()) {
    dict = { python3: raw };
  } else if (raw && typeof raw === "object") {
    dict = { ...raw };
  }

  // Extract function info from whichever language has code
  const referencePython = dict.python3 || "";
  const funcName =
    referencePython
      ? extractFunctionName(referencePython)
      : title
        ? title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
        : "solution";
  const params = referencePython ? extractParams(referencePython) : [];

  // Fill each language: use provided code if nonempty, else generate boilerplate
  for (const lang of LANG_KEYS) {
    const provided = (dict[lang] || "").trim();
    if (provided) {
      result[lang] = provided;
    } else {
      // Generate boilerplate for this language
      switch (lang) {
        case "python3":
          result[lang] = referencePython || pythonBoilerplate(funcName, params);
          break;
        case "java":
          result[lang] = javaBoilerplate(funcName, params);
          break;
        case "cpp17":
          result[lang] = cppBoilerplate(funcName, params);
          break;
        case "nodejs":
          result[lang] = nodejsBoilerplate(funcName, params);
          break;
      }
    }
  }

  // If ALL are empty, fall back to LANGUAGES[lang].starter (the generic defaults)
  const allEmpty = LANG_KEYS.every((k) => !result[k]?.trim());
  if (allEmpty) {
    for (const lang of LANG_KEYS) {
      result[lang] = LANGUAGES[lang]?.starter || "";
    }
  }

  return result;
}
