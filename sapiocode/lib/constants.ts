import { JDoodleLanguageConfig, Question } from "./types";

export const LANGUAGES: Record<string, JDoodleLanguageConfig> = {
    python3: {
        language: "python3",
        versionIndex: "4",
        label: "Python 3",
        monaco: "python",
        starter: "def main():\n    print(\"Hello, Obsidian Workbench!\")\n\nif __name__ == \"__main__\":\n    main()",
    },
    java: {
        language: "java",
        versionIndex: "4",
        label: "Java",
        monaco: "java",
        starter: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Obsidian Workbench!\");\n    }\n}",
    },
    c: {
        language: "c",
        versionIndex: "5",
        label: "C",
        monaco: "c",
        starter: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, Obsidian Workbench!\\n\");\n    return 0;\n}",
    },
    cpp17: {
        language: "cpp17",
        versionIndex: "1",
        label: "C++",
        monaco: "cpp",
        starter: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, Obsidian Workbench!\" << std::endl;\n    return 0;\n}",
    },
    nodejs: {
        language: "nodejs",
        versionIndex: "4",
        label: "JavaScript",
        monaco: "javascript",
        starter: "console.log(\"Hello, Obsidian Workbench!\");",
    },
    go: {
        language: "go",
        versionIndex: "4",
        label: "Go",
        monaco: "go",
        starter: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, Obsidian Workbench!\")\n}",
    },
    ruby: {
        language: "ruby",
        versionIndex: "4",
        label: "Ruby",
        monaco: "ruby",
        starter: "puts \"Hello, Obsidian Workbench!\"",
    },
    rust: {
        language: "rust",
        versionIndex: "4",
        label: "Rust",
        monaco: "rust",
        starter: "fn main() {\n    println!(\"Hello, Obsidian Workbench!\");\n}",
    },
    php: {
        language: "php",
        versionIndex: "4",
        label: "PHP",
        monaco: "php",
        starter: "<?php\necho \"Hello, Obsidian Workbench!\";",
    },
    kotlin: {
        language: "kotlin",
        versionIndex: "4",
        label: "Kotlin",
        monaco: "kotlin",
        starter: "fun main() {\n    println(\"Hello, Obsidian Workbench!\")\n}",
    },
};

export const PROBLEMS: Question[] = [
    {
        id: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        starterCode: {
            python3: "def twoSum(nums, target):\n    # TODO: Implement\n    pass",
            java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // TODO\n    }\n}",
            nodejs: "function twoSum(nums, target) {\n    // TODO\n}",
        },
    },
    {
        id: "reverse-string",
        title: "Reverse String",
        difficulty: "easy",
        description: "Write a function that reverses a string. The input string is given as an array of characters.",
        starterCode: {
            python3: "def reverseString(s):\n    # TODO\n    pass",
        },
    },
    {
        id: "fizz-buzz",
        title: "FizzBuzz",
        difficulty: "easy",
        description: "Write a program that prints numbers from 1 to n. For multiples of 3, print 'Fizz'. For multiples of 5, print 'Buzz'. For multiples of both, print 'FizzBuzz'.",
        starterCode: {
            python3: "def fizzBuzz(n):\n    # TODO\n    pass",
        },
    },
    {
        id: "palindrome-check",
        title: "Palindrome Check",
        difficulty: "easy",
        description: "Given a string, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.",
        starterCode: {
            python3: "def isPalindrome(s):\n    # TODO\n    pass",
        },
    },
];

export const DEFAULT_LANGUAGE = "python3";
export const MAX_CODE_LENGTH = 10_000;
export const MAX_STDIN_LENGTH = 5_000;
export const JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute";
