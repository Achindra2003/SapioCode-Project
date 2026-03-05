import { Topic } from "./types";

export const UNLOCK_THRESHOLD = 0.75;

export const LANGUAGES: Record<string, {
  language: string;
  versionIndex: string;
  label: string;
  monaco: string;
  starter: string;
}> = {
  python3: {
    language: "python3",
    versionIndex: "4",
    label: "Python 3",
    monaco: "python",
    starter: `def solution():
    # Write your code here
    pass

# Test your solution
if __name__ == "__main__":
    print(solution())
`,
  },
  java: {
    language: "java",
    versionIndex: "4",
    label: "Java",
    monaco: "java",
    starter: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello, World!");
    }
}
`,
  },
  cpp17: {
    language: "cpp17",
    versionIndex: "1",
    label: "C++ 17",
    monaco: "cpp",
    starter: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  },
  nodejs: {
    language: "nodejs",
    versionIndex: "4",
    label: "JavaScript",
    monaco: "javascript",
    starter: `function solution() {
    // Write your code here
    return null;
}

// Test your solution
console.log(solution());
`,
  },
};

export const TOPICS: Topic[] = [
  {
    id: "variables-basics",
    name: "Variables & Basics",
    order: 1,
    description: "Learn about variables, data types, and basic operations",
    questionIds: [
      "variable-swap",
      "type-conversion",
      "get-absolute",
      "simple-calculator",
      "temperature-converter",
      "bmi-calculator",
    ],
    questionCount: 6,
  },
  {
    id: "conditionals",
    name: "Conditionals",
    order: 2,
    description: "Master if/else statements and boolean logic",
    questionIds: [
      "even-or-odd",
      "grade-calculator",
      "leap-year",
      "positive-negative-zero",
      "max-of-three",
      "safe-calculator",
    ],
    questionCount: 6,
  },
  {
    id: "loops",
    name: "Loops",
    order: 3,
    description: "Understand for and while loops, iteration patterns",
    questionIds: [
      "sum-of-n",
      "multiplication-table",
      "factorial",
      "fibonacci",
      "prime-check",
      "pattern-pyramid",
    ],
    questionCount: 6,
  },
  {
    id: "arrays",
    name: "Arrays & Lists",
    order: 4,
    description: "Work with arrays, lists, and common array operations",
    questionIds: [
      "two-sum",
      "reverse-array",
      "find-maximum",
      "remove-duplicates",
      "array-rotation",
      "second-largest",
    ],
    questionCount: 6,
  },
  {
    id: "strings",
    name: "Strings",
    order: 5,
    description: "Master string manipulation and common string algorithms",
    questionIds: [
      "palindrome-check",
      "reverse-string",
      "count-vowels",
      "anagram-check",
      "string-compression",
      "fizzbuzz",
    ],
    questionCount: 6,
  },
];

export const JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute";
export const MAX_CODE_LENGTH = 10000;
export const MAX_STDIN_LENGTH = 5000;
export const DEFAULT_LANGUAGE = "python3";
