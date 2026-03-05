import { Question } from "./types";

export const QUESTIONS: Question[] = [
  // ==================== TOPIC 1: Variables & Basics ====================
  {
    id: "variable-swap",
    title: "Variable Swap",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that takes two numbers and returns them swapped.

**Example:**
- Input: a = 5, b = 10
- Output: (10, 5)`,
    starterCode: {
      python3: `def swap_numbers(a, b):
    # Swap the values of a and b
    # Return a tuple (b, a)
    pass

# Test
if __name__ == "__main__":
    print(swap_numbers(5, 10))`,
      java: `import java.util.*;

public class Main {
    public static int[] swapNumbers(int a, int b) {
        // Swap the values and return as int[] { b, a }
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] r = swapNumbers(5, 10);
        System.out.println("(" + r[0] + ", " + r[1] + ")");
    }
}`,
      cpp17: `#include <iostream>
#include <utility>
using namespace std;

pair<int, int> swap_numbers(int a, int b) {
    // Swap the values and return as pair(b, a)
    return {0, 0};
}

int main() {
    auto r = swap_numbers(5, 10);
    cout << "(" << r.first << ", " << r.second << ")" << endl;
    return 0;
}`,
      nodejs: `function swap_numbers(a, b) {
    // Swap the values and return as [b, a]
    return null;
}

// Test
const r = swap_numbers(5, 10);
console.log("(" + r[0] + ", " + r[1] + ")");`,
    },
    testCases: [
      {
        input: "swap_numbers(5, 10)",
        expectedOutput: "(10, 5)",
        description: "Basic swap",
        javaSnippet: `{ int[] r=swapNumbers(5,10); System.out.println("("+r[0]+", "+r[1]+")"); }`,
        cppSnippet: `{ auto r=swap_numbers(5,10); cout<<"("<<r.first<<", "<<r.second<<")"<<endl; }`,
      },
      {
        input: "swap_numbers(0, 100)",
        expectedOutput: "(100, 0)",
        description: "Zero and positive",
        javaSnippet: `{ int[] r=swapNumbers(0,100); System.out.println("("+r[0]+", "+r[1]+")"); }`,
        cppSnippet: `{ auto r=swap_numbers(0,100); cout<<"("<<r.first<<", "<<r.second<<")"<<endl; }`,
      },
      {
        input: "swap_numbers(-5, -10)",
        expectedOutput: "(-10, -5)",
        description: "Negative numbers",
        javaSnippet: `{ int[] r=swapNumbers(-5,-10); System.out.println("("+r[0]+", "+r[1]+")"); }`,
        cppSnippet: `{ auto r=swap_numbers(-5,-10); cout<<"("<<r.first<<", "<<r.second<<")"<<endl; }`,
      },
    ],
    concepts: ["variables", "assignment", "tuple-unpacking"],
    estimatedTime: 5,
  },
  {
    id: "type-conversion",
    title: "Type Conversion",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that takes a string representation of a number and converts it to an integer, then adds 10.

**Example:**
- Input: "42"
- Output: 52`,
    starterCode: {
      python3: `def convert_and_add(num_str):
    # Convert the string to an integer and add 10
    pass

# Test
if __name__ == "__main__":
    print(convert_and_add("42"))`,
      java: `import java.util.*;

public class Main {
    public static int convertAndAdd(String numStr) {
        // Convert the string to an integer and add 10
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(convertAndAdd("42"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

int convert_and_add(string num_str) {
    // Convert the string to an integer and add 10
    return 0;
}

int main() {
    cout << convert_and_add("42") << endl;
    return 0;
}`,
      nodejs: `function convert_and_add(num_str) {
    // Convert the string to an integer and add 10
    return null;
}

// Test
console.log(convert_and_add("42"));`,
    },
    testCases: [
      {
        input: `convert_and_add("42")`,
        expectedOutput: "52",
        description: "Basic conversion",
        javaSnippet: `System.out.println(convertAndAdd("42"));`,
        cppSnippet: `cout<<convert_and_add("42")<<endl;`,
      },
      {
        input: `convert_and_add("0")`,
        expectedOutput: "10",
        description: "Zero input",
        javaSnippet: `System.out.println(convertAndAdd("0"));`,
        cppSnippet: `cout<<convert_and_add("0")<<endl;`,
      },
      {
        input: `convert_and_add("100")`,
        expectedOutput: "110",
        description: "Larger number",
        javaSnippet: `System.out.println(convertAndAdd("100"));`,
        cppSnippet: `cout<<convert_and_add("100")<<endl;`,
      },
    ],
    concepts: ["type-conversion", "int", "string"],
    estimatedTime: 5,
  },
  {
    id: "get-absolute",
    title: "Absolute Value",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that returns the absolute value of a number. Do not use any built-in abs() or Math.abs() functions — implement the logic yourself.

**Example:**
- Input: -5
- Output: 5`,
    starterCode: {
      python3: `def get_absolute(n):
    # Return the absolute value of n (no abs() allowed)
    pass

# Test
if __name__ == "__main__":
    print(get_absolute(-5))`,
      java: `import java.util.*;

public class Main {
    public static int getAbsolute(int n) {
        // Return the absolute value of n (no Math.abs() allowed)
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(getAbsolute(-5));
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

int get_absolute(int n) {
    // Return the absolute value of n (no abs() allowed)
    return 0;
}

int main() {
    cout << get_absolute(-5) << endl;
    return 0;
}`,
      nodejs: `function get_absolute(n) {
    // Return the absolute value of n (no Math.abs() allowed)
    return null;
}

// Test
console.log(get_absolute(-5));`,
    },
    testCases: [
      {
        input: "get_absolute(-5)",
        expectedOutput: "5",
        description: "Negative number",
        javaSnippet: `System.out.println(getAbsolute(-5));`,
        cppSnippet: `cout<<get_absolute(-5)<<endl;`,
      },
      {
        input: "get_absolute(7)",
        expectedOutput: "7",
        description: "Positive number",
        javaSnippet: `System.out.println(getAbsolute(7));`,
        cppSnippet: `cout<<get_absolute(7)<<endl;`,
      },
      {
        input: "get_absolute(0)",
        expectedOutput: "0",
        description: "Zero",
        javaSnippet: `System.out.println(getAbsolute(0));`,
        cppSnippet: `cout<<get_absolute(0)<<endl;`,
      },
    ],
    concepts: ["conditionals", "arithmetic", "variables"],
    estimatedTime: 5,
  },
  {
    id: "simple-calculator",
    title: "Simple Calculator",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that takes two numbers and an operator (+, -, *, /) and returns the result as a float.

**Example:**
- Input: 5, 3, "+"
- Output: 8.0`,
    starterCode: {
      python3: `def simple_calculator(a, b, operator):
    # Perform the operation and return the result as a float
    pass

# Test
if __name__ == "__main__":
    print(simple_calculator(5, 3, "+"))`,
      java: `import java.util.*;

public class Main {
    public static double simpleCalculator(double a, double b, String operator) {
        // Perform the operation based on the operator
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(simpleCalculator(5, 3, "+"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
#include <cstdio>
using namespace std;

double simple_calculator(double a, double b, string op) {
    // Perform the operation based on the operator
    return 0;
}

int main() {
    printf("%.1f\n", simple_calculator(5, 3, "+"));
    return 0;
}`,
      nodejs: `function simple_calculator(a, b, operator) {
    // Perform the operation based on the operator
    return null;
}

// Test
console.log(simple_calculator(5, 3, "+"));`,
    },
    testCases: [
      {
        input: `simple_calculator(5, 3, "+")`,
        expectedOutput: "8.0",
        description: "Addition",
        javaSnippet: `System.out.println(simpleCalculator(5,3,"+"));`,
        cppSnippet: `printf("%.1f\n", simple_calculator(5,3,"+"));`,
      },
      {
        input: `simple_calculator(10, 4, "-")`,
        expectedOutput: "6.0",
        description: "Subtraction",
        javaSnippet: `System.out.println(simpleCalculator(10,4,"-"));`,
        cppSnippet: `printf("%.1f\n", simple_calculator(10,4,"-"));`,
      },
      {
        input: `simple_calculator(6, 7, "*")`,
        expectedOutput: "42.0",
        description: "Multiplication",
        javaSnippet: `System.out.println(simpleCalculator(6,7,"*"));`,
        cppSnippet: `printf("%.1f\n", simple_calculator(6,7,"*"));`,
      },
    ],
    concepts: ["arithmetic", "operators", "basic-logic"],
    estimatedTime: 10,
  },
  {
    id: "temperature-converter",
    title: "Temperature Converter",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that converts Celsius to Fahrenheit.
Formula: F = (C * 9/5) + 32

**Example:**
- Input: 0 (Celsius)
- Output: 32.0 (Fahrenheit)`,
    starterCode: {
      python3: `def celsius_to_fahrenheit(celsius):
    # Convert Celsius to Fahrenheit
    pass

# Test
if __name__ == "__main__":
    print(celsius_to_fahrenheit(0))`,
      java: `import java.util.*;

public class Main {
    public static double celsiusToFahrenheit(double celsius) {
        // Convert Celsius to Fahrenheit
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(celsiusToFahrenheit(0));
    }
}`,
      cpp17: `#include <iostream>
#include <cstdio>
using namespace std;

double celsius_to_fahrenheit(double celsius) {
    // Convert Celsius to Fahrenheit
    return 0;
}

int main() {
    printf("%.1f\n", celsius_to_fahrenheit(0));
    return 0;
}`,
      nodejs: `function celsius_to_fahrenheit(celsius) {
    // Convert Celsius to Fahrenheit
    return null;
}

// Test
console.log(celsius_to_fahrenheit(0));`,
    },
    testCases: [
      {
        input: "celsius_to_fahrenheit(0)",
        expectedOutput: "32.0",
        description: "Freezing point",
        javaSnippet: `System.out.println(celsiusToFahrenheit(0));`,
        cppSnippet: `printf("%.1f\n", celsius_to_fahrenheit(0));`,
      },
      {
        input: "celsius_to_fahrenheit(100)",
        expectedOutput: "212.0",
        description: "Boiling point",
        javaSnippet: `System.out.println(celsiusToFahrenheit(100));`,
        cppSnippet: `printf("%.1f\n", celsius_to_fahrenheit(100));`,
      },
      {
        input: "celsius_to_fahrenheit(25)",
        expectedOutput: "77.0",
        description: "Room temperature",
        javaSnippet: `System.out.println(celsiusToFahrenheit(25));`,
        cppSnippet: `printf("%.1f\n", celsius_to_fahrenheit(25));`,
      },
    ],
    concepts: ["formula", "arithmetic", "float"],
    estimatedTime: 5,
  },
  {
    id: "bmi-calculator",
    title: "BMI Calculator",
    topicId: "variables-basics",
    difficulty: "easy",
    description: `Write a function that calculates BMI given weight (kg) and height (m).
Formula: BMI = weight / (height * height), rounded to 2 decimal places.

**Example:**
- Input: weight = 70, height = 1.75
- Output: 22.86`,
    starterCode: {
      python3: `def calculate_bmi(weight, height):
    # Calculate BMI and round to 2 decimal places
    pass

# Test
if __name__ == "__main__":
    print(calculate_bmi(70, 1.75))`,
      java: `import java.util.*;

public class Main {
    public static double calculateBmi(double weight, double height) {
        // Calculate BMI rounded to 2 decimal places
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(calculateBmi(70, 1.75));
    }
}`,
      cpp17: `#include <iostream>
#include <cmath>
#include <cstdio>
using namespace std;

double calculate_bmi(double weight, double height) {
    // Calculate BMI rounded to 2 decimal places
    return 0;
}

int main() {
    printf("%.2f\n", calculate_bmi(70, 1.75));
    return 0;
}`,
      nodejs: `function calculate_bmi(weight, height) {
    // Calculate BMI and round to 2 decimal places
    return null;
}

// Test
console.log(calculate_bmi(70, 1.75));`,
    },
    testCases: [
      {
        input: "calculate_bmi(70, 1.75)",
        expectedOutput: "22.86",
        description: "Normal BMI",
        javaSnippet: `System.out.println(calculateBmi(70,1.75));`,
        cppSnippet: `printf("%.2f\n", calculate_bmi(70,1.75));`,
      },
      {
        input: "calculate_bmi(50, 1.60)",
        expectedOutput: "19.53",
        description: "Lower BMI",
        javaSnippet: `System.out.println(calculateBmi(50,1.60));`,
        cppSnippet: `printf("%.2f\n", calculate_bmi(50,1.60));`,
      },
      {
        input: "calculate_bmi(90, 1.80)",
        expectedOutput: "27.78",
        description: "Higher BMI",
        javaSnippet: `System.out.println(calculateBmi(90,1.80));`,
        cppSnippet: `printf("%.2f\n", calculate_bmi(90,1.80));`,
      },
    ],
    concepts: ["formula", "arithmetic", "rounding"],
    estimatedTime: 8,
  },

  // ==================== TOPIC 2: Conditionals ====================
  {
    id: "even-or-odd",
    title: "Even or Odd",
    topicId: "conditionals",
    difficulty: "easy",
    description: `Write a function that determines if a number is even or odd.

**Example:**
- Input: 4
- Output: "Even"`,
    starterCode: {
      python3: `def even_or_odd(n):
    # Return "Even" or "Odd"
    pass

# Test
if __name__ == "__main__":
    print(even_or_odd(4))`,
      java: `import java.util.*;

public class Main {
    public static String evenOrOdd(int n) {
        // Return "Even" or "Odd"
        return "";
    }

    public static void main(String[] args) {
        System.out.println(evenOrOdd(4));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

string even_or_odd(int n) {
    // Return "Even" or "Odd"
    return "";
}

int main() {
    cout << even_or_odd(4) << endl;
    return 0;
}`,
      nodejs: `function even_or_odd(n) {
    // Return "Even" or "Odd"
    return null;
}

// Test
console.log(even_or_odd(4));`,
    },
    testCases: [
      {
        input: "even_or_odd(4)",
        expectedOutput: "Even",
        description: "Even number",
        javaSnippet: `System.out.println(evenOrOdd(4));`,
        cppSnippet: `cout<<even_or_odd(4)<<endl;`,
      },
      {
        input: "even_or_odd(7)",
        expectedOutput: "Odd",
        description: "Odd number",
        javaSnippet: `System.out.println(evenOrOdd(7));`,
        cppSnippet: `cout<<even_or_odd(7)<<endl;`,
      },
      {
        input: "even_or_odd(0)",
        expectedOutput: "Even",
        description: "Zero is even",
        javaSnippet: `System.out.println(evenOrOdd(0));`,
        cppSnippet: `cout<<even_or_odd(0)<<endl;`,
      },
    ],
    concepts: ["conditionals", "modulo", "if-else"],
    estimatedTime: 5,
  },
  {
    id: "grade-calculator",
    title: "Grade Calculator",
    topicId: "conditionals",
    difficulty: "easy",
    description: `Write a function that takes a score (0-100) and returns the letter grade.
- A: 90-100
- B: 80-89
- C: 70-79
- D: 60-69
- F: 0-59

**Example:**
- Input: 85
- Output: "B"`,
    starterCode: {
      python3: `def get_grade(score):
    # Return the letter grade based on score
    pass

# Test
if __name__ == "__main__":
    print(get_grade(85))`,
      java: `import java.util.*;

public class Main {
    public static String getGrade(int score) {
        // Return the letter grade based on score
        return "";
    }

    public static void main(String[] args) {
        System.out.println(getGrade(85));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

string get_grade(int score) {
    // Return the letter grade based on score
    return "";
}

int main() {
    cout << get_grade(85) << endl;
    return 0;
}`,
      nodejs: `function get_grade(score) {
    // Return the letter grade based on score
    return null;
}

// Test
console.log(get_grade(85));`,
    },
    testCases: [
      {
        input: "get_grade(85)",
        expectedOutput: "B",
        description: "B grade",
        javaSnippet: `System.out.println(getGrade(85));`,
        cppSnippet: `cout<<get_grade(85)<<endl;`,
      },
      {
        input: "get_grade(95)",
        expectedOutput: "A",
        description: "A grade",
        javaSnippet: `System.out.println(getGrade(95));`,
        cppSnippet: `cout<<get_grade(95)<<endl;`,
      },
      {
        input: "get_grade(55)",
        expectedOutput: "F",
        description: "F grade",
        javaSnippet: `System.out.println(getGrade(55));`,
        cppSnippet: `cout<<get_grade(55)<<endl;`,
      },
    ],
    concepts: ["conditionals", "if-elif-else", "ranges"],
    estimatedTime: 10,
  },
  {
    id: "leap-year",
    title: "Leap Year Checker",
    topicId: "conditionals",
    difficulty: "medium",
    description: `Write a function to check if a year is a leap year.
A year is a leap year if:
- Divisible by 4 AND
- (Not divisible by 100 OR divisible by 400)

**Example:**
- Input: 2024
- Output: True`,
    starterCode: {
      python3: `def is_leap_year(year):
    # Return True if leap year, False otherwise
    pass

# Test
if __name__ == "__main__":
    print(is_leap_year(2024))`,
      java: `import java.util.*;

public class Main {
    public static boolean isLeapYear(int year) {
        // Return true if leap year, false otherwise
        return false;
    }

    public static void main(String[] args) {
        System.out.println(isLeapYear(2024) ? "True" : "False");
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

bool is_leap_year(int year) {
    // Return true if leap year, false otherwise
    return false;
}

int main() {
    cout << (is_leap_year(2024) ? "True" : "False") << endl;
    return 0;
}`,
      nodejs: `function is_leap_year(year) {
    // Return true if leap year, false otherwise
    return null;
}

// Test
console.log(is_leap_year(2024));`,
    },
    testCases: [
      {
        input: "is_leap_year(2024)",
        expectedOutput: "True",
        description: "Leap year",
        javaSnippet: `System.out.println(isLeapYear(2024)?"True":"False");`,
        cppSnippet: `cout<<(is_leap_year(2024)?"True":"False")<<endl;`,
      },
      {
        input: "is_leap_year(2023)",
        expectedOutput: "False",
        description: "Not leap year",
        javaSnippet: `System.out.println(isLeapYear(2023)?"True":"False");`,
        cppSnippet: `cout<<(is_leap_year(2023)?"True":"False")<<endl;`,
      },
      {
        input: "is_leap_year(2000)",
        expectedOutput: "True",
        description: "Century leap year",
        javaSnippet: `System.out.println(isLeapYear(2000)?"True":"False");`,
        cppSnippet: `cout<<(is_leap_year(2000)?"True":"False")<<endl;`,
      },
    ],
    concepts: ["conditionals", "modulo", "boolean-logic"],
    estimatedTime: 12,
  },
  {
    id: "positive-negative-zero",
    title: "Positive, Negative, or Zero",
    topicId: "conditionals",
    difficulty: "easy",
    description: `Write a function that takes a number and returns "Positive", "Negative", or "Zero".

**Example:**
- Input: 5
- Output: "Positive"`,
    starterCode: {
      python3: `def check_number(n):
    # Return "Positive", "Negative", or "Zero"
    pass

# Test
if __name__ == "__main__":
    print(check_number(5))`,
      java: `import java.util.*;

public class Main {
    public static String checkNumber(int n) {
        // Return "Positive", "Negative", or "Zero"
        return "";
    }

    public static void main(String[] args) {
        System.out.println(checkNumber(5));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

string check_number(int n) {
    // Return "Positive", "Negative", or "Zero"
    return "";
}

int main() {
    cout << check_number(5) << endl;
    return 0;
}`,
      nodejs: `function check_number(n) {
    // Return "Positive", "Negative", or "Zero"
    return null;
}

// Test
console.log(check_number(5));`,
    },
    testCases: [
      {
        input: "check_number(5)",
        expectedOutput: "Positive",
        description: "Positive number",
        javaSnippet: `System.out.println(checkNumber(5));`,
        cppSnippet: `cout<<check_number(5)<<endl;`,
      },
      {
        input: "check_number(-3)",
        expectedOutput: "Negative",
        description: "Negative number",
        javaSnippet: `System.out.println(checkNumber(-3));`,
        cppSnippet: `cout<<check_number(-3)<<endl;`,
      },
      {
        input: "check_number(0)",
        expectedOutput: "Zero",
        description: "Zero",
        javaSnippet: `System.out.println(checkNumber(0));`,
        cppSnippet: `cout<<check_number(0)<<endl;`,
      },
    ],
    concepts: ["conditionals", "if-elif-else"],
    estimatedTime: 5,
  },
  {
    id: "max-of-three",
    title: "Maximum of Three Numbers",
    topicId: "conditionals",
    difficulty: "easy",
    description: `Write a function that finds the maximum of three numbers.

**Example:**
- Input: 5, 9, 3
- Output: 9`,
    starterCode: {
      python3: `def max_of_three(a, b, c):
    # Return the maximum of a, b, c
    pass

# Test
if __name__ == "__main__":
    print(max_of_three(5, 9, 3))`,
      java: `import java.util.*;

public class Main {
    public static int maxOfThree(int a, int b, int c) {
        // Return the maximum of a, b, c
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(maxOfThree(5, 9, 3));
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

int max_of_three(int a, int b, int c) {
    // Return the maximum of a, b, c
    return 0;
}

int main() {
    cout << max_of_three(5, 9, 3) << endl;
    return 0;
}`,
      nodejs: `function max_of_three(a, b, c) {
    // Return the maximum of a, b, c
    return null;
}

// Test
console.log(max_of_three(5, 9, 3));`,
    },
    testCases: [
      {
        input: "max_of_three(5, 9, 3)",
        expectedOutput: "9",
        description: "Max in middle",
        javaSnippet: `System.out.println(maxOfThree(5,9,3));`,
        cppSnippet: `cout<<max_of_three(5,9,3)<<endl;`,
      },
      {
        input: "max_of_three(10, 2, 5)",
        expectedOutput: "10",
        description: "Max first",
        javaSnippet: `System.out.println(maxOfThree(10,2,5));`,
        cppSnippet: `cout<<max_of_three(10,2,5)<<endl;`,
      },
      {
        input: "max_of_three(1, 2, 7)",
        expectedOutput: "7",
        description: "Max last",
        javaSnippet: `System.out.println(maxOfThree(1,2,7));`,
        cppSnippet: `cout<<max_of_three(1,2,7)<<endl;`,
      },
    ],
    concepts: ["conditionals", "comparison"],
    estimatedTime: 8,
  },
  {
    id: "safe-calculator",
    title: "Calculator with Error Handling",
    topicId: "conditionals",
    difficulty: "medium",
    description: `Write a calculator that handles division by zero. Return "Error" if dividing by zero, otherwise return the result as a float.

**Example:**
- Input: 10, 0, "/"
- Output: "Error"`,
    starterCode: {
      python3: `def safe_calculator(a, b, operator):
    # Return "Error" for division by zero, otherwise return float result
    pass

# Test
if __name__ == "__main__":
    print(safe_calculator(10, 0, "/"))`,
      java: `import java.util.*;

public class Main {
    public static String safeCalculator(double a, double b, String operator) {
        // Return "Error" for division by zero, otherwise return the result
        return "";
    }

    public static void main(String[] args) {
        System.out.println(safeCalculator(10, 0, "/"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
#include <cstdio>
using namespace std;

string safe_calculator(double a, double b, string op) {
    // Return "Error" for division by zero, otherwise return the result
    return "";
}

int main() {
    cout << safe_calculator(10, 0, "/") << endl;
    return 0;
}`,
      nodejs: `function safe_calculator(a, b, operator) {
    // Return "Error" for division by zero, otherwise return float result
    return null;
}

// Test
console.log(safe_calculator(10, 0, "/"));`,
    },
    testCases: [
      {
        input: `safe_calculator(10, 0, "/")`,
        expectedOutput: "Error",
        description: "Division by zero",
        javaSnippet: `System.out.println(safeCalculator(10,0,"/"));`,
        cppSnippet: `cout<<safe_calculator(10,0,"/")<<endl;`,
      },
      {
        input: `safe_calculator(10, 2, "/")`,
        expectedOutput: "5.0",
        description: "Normal division",
        javaSnippet: `System.out.println(safeCalculator(10,2,"/"));`,
        cppSnippet: `cout<<safe_calculator(10,2,"/")<<endl;`,
      },
      {
        input: `safe_calculator(8, 3, "*")`,
        expectedOutput: "24.0",
        description: "Multiplication",
        javaSnippet: `System.out.println(safeCalculator(8,3,"*"));`,
        cppSnippet: `cout<<safe_calculator(8,3,"*")<<endl;`,
      },
    ],
    concepts: ["conditionals", "error-handling", "operators"],
    estimatedTime: 12,
  },

  // ==================== TOPIC 3: Loops ====================
  {
    id: "sum-of-n",
    title: "Sum of N Numbers",
    topicId: "loops",
    difficulty: "easy",
    description: `Write a function that calculates the sum of numbers from 1 to n.

**Example:**
- Input: 5
- Output: 15 (1+2+3+4+5)`,
    starterCode: {
      python3: `def sum_to_n(n):
    # Calculate sum from 1 to n using a loop
    pass

# Test
if __name__ == "__main__":
    print(sum_to_n(5))`,
      java: `import java.util.*;

public class Main {
    public static int sumToN(int n) {
        // Calculate sum from 1 to n using a loop
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(sumToN(5));
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

int sum_to_n(int n) {
    // Calculate sum from 1 to n using a loop
    return 0;
}

int main() {
    cout << sum_to_n(5) << endl;
    return 0;
}`,
      nodejs: `function sum_to_n(n) {
    // Calculate sum from 1 to n using a loop
    return null;
}

// Test
console.log(sum_to_n(5));`,
    },
    testCases: [
      {
        input: "sum_to_n(5)",
        expectedOutput: "15",
        description: "Sum 1-5",
        javaSnippet: `System.out.println(sumToN(5));`,
        cppSnippet: `cout<<sum_to_n(5)<<endl;`,
      },
      {
        input: "sum_to_n(10)",
        expectedOutput: "55",
        description: "Sum 1-10",
        javaSnippet: `System.out.println(sumToN(10));`,
        cppSnippet: `cout<<sum_to_n(10)<<endl;`,
      },
      {
        input: "sum_to_n(1)",
        expectedOutput: "1",
        description: "Single number",
        javaSnippet: `System.out.println(sumToN(1));`,
        cppSnippet: `cout<<sum_to_n(1)<<endl;`,
      },
    ],
    concepts: ["loops", "for-loop", "accumulation"],
    estimatedTime: 8,
  },
  {
    id: "multiplication-table",
    title: "Multiplication Table",
    topicId: "loops",
    difficulty: "easy",
    description: `Write a function that returns the multiplication table for a number as a list.
Return [n*1, n*2, ..., n*10]

**Example:**
- Input: 5
- Output: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]`,
    starterCode: {
      python3: `def multiplication_table(n):
    # Return multiplication table as list
    pass

# Test
if __name__ == "__main__":
    print(multiplication_table(5))`,
      java: `import java.util.*;

public class Main {
    public static List<Integer> multiplicationTable(int n) {
        // Return multiplication table as list
        List<Integer> result = new ArrayList<>();
        return result;
    }

    public static void main(String[] args) {
        System.out.println(multiplicationTable(5));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

vector<int> multiplication_table(int n) {
    // Return multiplication table as vector
    vector<int> result;
    return result;
}

int main() {
    vector<int> t = multiplication_table(5);
    cout << "[";
    for (size_t i = 0; i < t.size(); i++) {
        if (i > 0) cout << ", ";
        cout << t[i];
    }
    cout << "]" << endl;
    return 0;
}`,
      nodejs: `function multiplication_table(n) {
    // Return multiplication table as array
    return null;
}

// Test
console.log(multiplication_table(5));`,
    },
    testCases: [
      {
        input: "multiplication_table(5)",
        expectedOutput: "[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]",
        description: "Table of 5",
        javaSnippet: `System.out.println(multiplicationTable(5));`,
        cppSnippet: `{ vector<int> t=multiplication_table(5); cout<<"["; for(size_t i=0;i<t.size();i++){if(i>0)cout<<", ";cout<<t[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "multiplication_table(2)",
        expectedOutput: "[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]",
        description: "Table of 2",
        javaSnippet: `System.out.println(multiplicationTable(2));`,
        cppSnippet: `{ vector<int> t=multiplication_table(2); cout<<"["; for(size_t i=0;i<t.size();i++){if(i>0)cout<<", ";cout<<t[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "multiplication_table(0)",
        expectedOutput: "[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]",
        description: "Table of 0",
        javaSnippet: `System.out.println(multiplicationTable(0));`,
        cppSnippet: `{ vector<int> t=multiplication_table(0); cout<<"["; for(size_t i=0;i<t.size();i++){if(i>0)cout<<", ";cout<<t[i];} cout<<"]"<<endl; }`,
      },
    ],
    concepts: ["loops", "list", "for-loop"],
    estimatedTime: 10,
  },
  {
    id: "factorial",
    title: "Factorial",
    topicId: "loops",
    difficulty: "easy",
    description: `Write a function that calculates the factorial of a number.
Factorial of n = n * (n-1) * (n-2) * ... * 1
Factorial of 0 = 1

**Example:**
- Input: 5
- Output: 120`,
    starterCode: {
      python3: `def factorial(n):
    # Calculate factorial of n using a loop
    pass

# Test
if __name__ == "__main__":
    print(factorial(5))`,
      java: `import java.util.*;

public class Main {
    public static long factorial(int n) {
        // Calculate factorial of n using a loop
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(factorial(5));
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

long long factorial(int n) {
    // Calculate factorial of n using a loop
    return 0;
}

int main() {
    cout << factorial(5) << endl;
    return 0;
}`,
      nodejs: `function factorial(n) {
    // Calculate factorial of n using a loop
    return null;
}

// Test
console.log(factorial(5));`,
    },
    testCases: [
      {
        input: "factorial(5)",
        expectedOutput: "120",
        description: "5!",
        javaSnippet: `System.out.println(factorial(5));`,
        cppSnippet: `cout<<factorial(5)<<endl;`,
      },
      {
        input: "factorial(0)",
        expectedOutput: "1",
        description: "0!",
        javaSnippet: `System.out.println(factorial(0));`,
        cppSnippet: `cout<<factorial(0)<<endl;`,
      },
      {
        input: "factorial(7)",
        expectedOutput: "5040",
        description: "7!",
        javaSnippet: `System.out.println(factorial(7));`,
        cppSnippet: `cout<<factorial(7)<<endl;`,
      },
    ],
    concepts: ["loops", "accumulation", "factorial"],
    estimatedTime: 10,
  },
  {
    id: "fibonacci",
    title: "Fibonacci Sequence",
    topicId: "loops",
    difficulty: "medium",
    description: `Write a function that returns the nth Fibonacci number.
Fibonacci: 0, 1, 1, 2, 3, 5, 8, 13, ...
F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)

**Example:**
- Input: 7
- Output: 13`,
    starterCode: {
      python3: `def fibonacci(n):
    # Return the nth Fibonacci number
    pass

# Test
if __name__ == "__main__":
    print(fibonacci(7))`,
      java: `import java.util.*;

public class Main {
    public static int fibonacci(int n) {
        // Return the nth Fibonacci number
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(fibonacci(7));
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

int fibonacci(int n) {
    // Return the nth Fibonacci number
    return 0;
}

int main() {
    cout << fibonacci(7) << endl;
    return 0;
}`,
      nodejs: `function fibonacci(n) {
    // Return the nth Fibonacci number
    return null;
}

// Test
console.log(fibonacci(7));`,
    },
    testCases: [
      {
        input: "fibonacci(7)",
        expectedOutput: "13",
        description: "7th Fibonacci",
        javaSnippet: `System.out.println(fibonacci(7));`,
        cppSnippet: `cout<<fibonacci(7)<<endl;`,
      },
      {
        input: "fibonacci(0)",
        expectedOutput: "0",
        description: "F(0)",
        javaSnippet: `System.out.println(fibonacci(0));`,
        cppSnippet: `cout<<fibonacci(0)<<endl;`,
      },
      {
        input: "fibonacci(10)",
        expectedOutput: "55",
        description: "10th Fibonacci",
        javaSnippet: `System.out.println(fibonacci(10));`,
        cppSnippet: `cout<<fibonacci(10)<<endl;`,
      },
    ],
    concepts: ["loops", "fibonacci", "sequence"],
    estimatedTime: 15,
  },
  {
    id: "prime-check",
    title: "Prime Number Check",
    topicId: "loops",
    difficulty: "medium",
    description: `Write a function that checks if a number is prime.
A prime number is only divisible by 1 and itself.

**Example:**
- Input: 17
- Output: True`,
    starterCode: {
      python3: `def is_prime(n):
    # Return True if prime, False otherwise
    pass

# Test
if __name__ == "__main__":
    print(is_prime(17))`,
      java: `import java.util.*;

public class Main {
    public static boolean isPrime(int n) {
        // Return true if prime, false otherwise
        return false;
    }

    public static void main(String[] args) {
        System.out.println(isPrime(17) ? "True" : "False");
    }
}`,
      cpp17: `#include <iostream>
using namespace std;

bool is_prime(int n) {
    // Return true if prime, false otherwise
    return false;
}

int main() {
    cout << (is_prime(17) ? "True" : "False") << endl;
    return 0;
}`,
      nodejs: `function is_prime(n) {
    // Return true if prime, false otherwise
    return null;
}

// Test
console.log(is_prime(17));`,
    },
    testCases: [
      {
        input: "is_prime(17)",
        expectedOutput: "True",
        description: "Prime number",
        javaSnippet: `System.out.println(isPrime(17)?"True":"False");`,
        cppSnippet: `cout<<(is_prime(17)?"True":"False")<<endl;`,
      },
      {
        input: "is_prime(4)",
        expectedOutput: "False",
        description: "Not prime",
        javaSnippet: `System.out.println(isPrime(4)?"True":"False");`,
        cppSnippet: `cout<<(is_prime(4)?"True":"False")<<endl;`,
      },
      {
        input: "is_prime(2)",
        expectedOutput: "True",
        description: "Smallest prime",
        javaSnippet: `System.out.println(isPrime(2)?"True":"False");`,
        cppSnippet: `cout<<(is_prime(2)?"True":"False")<<endl;`,
      },
    ],
    concepts: ["loops", "prime", "divisibility"],
    estimatedTime: 15,
  },
  {
    id: "pattern-pyramid",
    title: "Pattern Printing - Pyramid",
    topicId: "loops",
    difficulty: "medium",
    description: `Write a function that returns a pyramid pattern of n rows as a string.

**Example:** n = 3
\`\`\`
  *
 ***
*****
\`\`\``,
    starterCode: {
      python3: `def print_pyramid(n):
    # Build and return pyramid as a newline-joined string
    pass

# Test
if __name__ == "__main__":
    print(print_pyramid(3))`,
      java: `import java.util.*;

public class Main {
    public static String printPyramid(int n) {
        // Build and return pyramid as a newline-joined string
        StringBuilder sb = new StringBuilder();
        return sb.toString();
    }

    public static void main(String[] args) {
        System.out.println(printPyramid(3));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

string print_pyramid(int n) {
    // Build and return pyramid as a newline-joined string
    string result = "";
    return result;
}

int main() {
    cout << print_pyramid(3) << endl;
    return 0;
}`,
      nodejs: `function print_pyramid(n) {
    // Build and return pyramid as a newline-joined string
    return null;
}

// Test
console.log(print_pyramid(3));`,
    },
    testCases: [
      {
        input: "print_pyramid(3)",
        expectedOutput: "  *\n ***\n*****",
        description: "3-row pyramid",
        javaSnippet: `System.out.println(printPyramid(3));`,
        cppSnippet: `cout<<print_pyramid(3)<<endl;`,
      },
      {
        input: "print_pyramid(2)",
        expectedOutput: " *\n***",
        description: "2-row pyramid",
        javaSnippet: `System.out.println(printPyramid(2));`,
        cppSnippet: `cout<<print_pyramid(2)<<endl;`,
      },
      {
        input: "print_pyramid(1)",
        expectedOutput: "*",
        description: "1-row pyramid",
        javaSnippet: `System.out.println(printPyramid(1));`,
        cppSnippet: `cout<<print_pyramid(1)<<endl;`,
      },
    ],
    concepts: ["loops", "nested-loops", "pattern"],
    estimatedTime: 20,
  },

  // ==================== TOPIC 4: Arrays & Lists ====================
  {
    id: "two-sum",
    title: "Two Sum",
    topicId: "arrays",
    difficulty: "easy",
    description: `Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.

**Example:**
- Input: nums = [2, 7, 11, 15], target = 9
- Output: [0, 1]`,
    starterCode: {
      python3: `def two_sum(nums, target):
    # Return indices of two numbers that sum to target
    pass

# Test
if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))`,
      java: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        // Return indices of two numbers that sum to target
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] r = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(r));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

vector<int> two_sum(vector<int> nums, int target) {
    // Return indices of two numbers that sum to target
    return {};
}

int main() {
    vector<int> r = two_sum({2, 7, 11, 15}, 9);
    cout << "[" << r[0] << ", " << r[1] << "]" << endl;
    return 0;
}`,
      nodejs: `function two_sum(nums, target) {
    // Return indices of two numbers that sum to target
    return null;
}

// Test
console.log(two_sum([2, 7, 11, 15], 9));`,
    },
    testCases: [
      {
        input: "two_sum([2, 7, 11, 15], 9)",
        expectedOutput: "[0, 1]",
        description: "Basic case",
        javaSnippet: `{ int[] r=twoSum(new int[]{2,7,11,15},9); System.out.println(Arrays.toString(r)); }`,
        cppSnippet: `{ auto r=two_sum({2,7,11,15},9); cout<<"["<<r[0]<<", "<<r[1]<<"]"<<endl; }`,
      },
      {
        input: "two_sum([3, 2, 4], 6)",
        expectedOutput: "[1, 2]",
        description: "Middle elements",
        javaSnippet: `{ int[] r=twoSum(new int[]{3,2,4},6); System.out.println(Arrays.toString(r)); }`,
        cppSnippet: `{ auto r=two_sum({3,2,4},6); cout<<"["<<r[0]<<", "<<r[1]<<"]"<<endl; }`,
      },
      {
        input: "two_sum([3, 3], 6)",
        expectedOutput: "[0, 1]",
        description: "Same values",
        javaSnippet: `{ int[] r=twoSum(new int[]{3,3},6); System.out.println(Arrays.toString(r)); }`,
        cppSnippet: `{ auto r=two_sum({3,3},6); cout<<"["<<r[0]<<", "<<r[1]<<"]"<<endl; }`,
      },
    ],
    concepts: ["arrays", "hash-map", "two-pointers"],
    estimatedTime: 15,
  },
  {
    id: "reverse-array",
    title: "Reverse Array",
    topicId: "arrays",
    difficulty: "easy",
    description: `Write a function that reverses an array and returns it.

**Example:**
- Input: [1, 2, 3, 4, 5]
- Output: [5, 4, 3, 2, 1]`,
    starterCode: {
      python3: `def reverse_array(arr):
    # Return the reversed array
    pass

# Test
if __name__ == "__main__":
    print(reverse_array([1, 2, 3, 4, 5]))`,
      java: `import java.util.*;

public class Main {
    public static List<Integer> reverseArray(List<Integer> arr) {
        // Return the reversed list
        return arr;
    }

    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5));
        System.out.println(reverseArray(list));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

vector<int> reverse_array(vector<int> arr) {
    // Return the reversed vector
    return arr;
}

int main() {
    vector<int> r = reverse_array({1, 2, 3, 4, 5});
    cout << "[";
    for (size_t i = 0; i < r.size(); i++) {
        if (i > 0) cout << ", ";
        cout << r[i];
    }
    cout << "]" << endl;
    return 0;
}`,
      nodejs: `function reverse_array(arr) {
    // Return the reversed array
    return null;
}

// Test
console.log(reverse_array([1, 2, 3, 4, 5]));`,
    },
    testCases: [
      {
        input: "reverse_array([1, 2, 3, 4, 5])",
        expectedOutput: "[5, 4, 3, 2, 1]",
        description: "Basic reverse",
        javaSnippet: `{ List<Integer> r=reverseArray(new ArrayList<>(Arrays.asList(1,2,3,4,5))); System.out.println(r); }`,
        cppSnippet: `{ auto r=reverse_array({1,2,3,4,5}); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "reverse_array([1])",
        expectedOutput: "[1]",
        description: "Single element",
        javaSnippet: `{ List<Integer> r=reverseArray(new ArrayList<>(Arrays.asList(1))); System.out.println(r); }`,
        cppSnippet: `{ auto r=reverse_array({1}); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "reverse_array([])",
        expectedOutput: "[]",
        description: "Empty array",
        javaSnippet: `{ List<Integer> r=reverseArray(new ArrayList<>()); System.out.println(r); }`,
        cppSnippet: `{ auto r=reverse_array({}); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
    ],
    concepts: ["arrays", "two-pointers", "in-place"],
    estimatedTime: 8,
  },
  {
    id: "find-maximum",
    title: "Find Maximum",
    topicId: "arrays",
    difficulty: "easy",
    description: `Write a function to find the maximum element in an array.

**Example:**
- Input: [3, 7, 2, 9, 1]
- Output: 9`,
    starterCode: {
      python3: `def find_max(arr):
    # Return the maximum element
    pass

# Test
if __name__ == "__main__":
    print(find_max([3, 7, 2, 9, 1]))`,
      java: `import java.util.*;

public class Main {
    public static int findMax(int[] arr) {
        // Return the maximum element
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(findMax(new int[]{3, 7, 2, 9, 1}));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

int find_max(vector<int> arr) {
    // Return the maximum element
    return 0;
}

int main() {
    cout << find_max({3, 7, 2, 9, 1}) << endl;
    return 0;
}`,
      nodejs: `function find_max(arr) {
    // Return the maximum element
    return null;
}

// Test
console.log(find_max([3, 7, 2, 9, 1]));`,
    },
    testCases: [
      {
        input: "find_max([3, 7, 2, 9, 1])",
        expectedOutput: "9",
        description: "Find max",
        javaSnippet: `System.out.println(findMax(new int[]{3,7,2,9,1}));`,
        cppSnippet: `cout<<find_max({3,7,2,9,1})<<endl;`,
      },
      {
        input: "find_max([1, 2, 3])",
        expectedOutput: "3",
        description: "Max at end",
        javaSnippet: `System.out.println(findMax(new int[]{1,2,3}));`,
        cppSnippet: `cout<<find_max({1,2,3})<<endl;`,
      },
      {
        input: "find_max([-5, -2, -8])",
        expectedOutput: "-2",
        description: "Negative numbers",
        javaSnippet: `System.out.println(findMax(new int[]{-5,-2,-8}));`,
        cppSnippet: `cout<<find_max({-5,-2,-8})<<endl;`,
      },
    ],
    concepts: ["arrays", "iteration", "comparison"],
    estimatedTime: 8,
  },
  {
    id: "remove-duplicates",
    title: "Remove Duplicates",
    topicId: "arrays",
    difficulty: "medium",
    description: `Write a function that removes duplicates from a sorted array and returns the count of unique elements.

**Example:**
- Input: [1, 1, 2, 2, 3]
- Output: 3`,
    starterCode: {
      python3: `def remove_duplicates(arr):
    # Return count of unique elements
    pass

# Test
if __name__ == "__main__":
    print(remove_duplicates([1, 1, 2, 2, 3]))`,
      java: `import java.util.*;

public class Main {
    public static int removeDuplicates(int[] arr) {
        // Return count of unique elements
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(removeDuplicates(new int[]{1, 1, 2, 2, 3}));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

int remove_duplicates(vector<int> arr) {
    // Return count of unique elements
    return 0;
}

int main() {
    cout << remove_duplicates({1, 1, 2, 2, 3}) << endl;
    return 0;
}`,
      nodejs: `function remove_duplicates(arr) {
    // Return count of unique elements
    return null;
}

// Test
console.log(remove_duplicates([1, 1, 2, 2, 3]));`,
    },
    testCases: [
      {
        input: "remove_duplicates([1, 1, 2, 2, 3])",
        expectedOutput: "3",
        description: "Basic case",
        javaSnippet: `System.out.println(removeDuplicates(new int[]{1,1,2,2,3}));`,
        cppSnippet: `cout<<remove_duplicates({1,1,2,2,3})<<endl;`,
      },
      {
        input: "remove_duplicates([1, 1, 1])",
        expectedOutput: "1",
        description: "All duplicates",
        javaSnippet: `System.out.println(removeDuplicates(new int[]{1,1,1}));`,
        cppSnippet: `cout<<remove_duplicates({1,1,1})<<endl;`,
      },
      {
        input: "remove_duplicates([1, 2, 3])",
        expectedOutput: "3",
        description: "No duplicates",
        javaSnippet: `System.out.println(removeDuplicates(new int[]{1,2,3}));`,
        cppSnippet: `cout<<remove_duplicates({1,2,3})<<endl;`,
      },
    ],
    concepts: ["arrays", "two-pointers", "in-place"],
    estimatedTime: 15,
  },
  {
    id: "array-rotation",
    title: "Array Rotation",
    topicId: "arrays",
    difficulty: "medium",
    description: `Write a function that rotates an array to the right by k steps.

**Example:**
- Input: [1, 2, 3, 4, 5], k = 2
- Output: [4, 5, 1, 2, 3]`,
    starterCode: {
      python3: `def rotate_array(arr, k):
    # Rotate array right by k steps and return it
    pass

# Test
if __name__ == "__main__":
    print(rotate_array([1, 2, 3, 4, 5], 2))`,
      java: `import java.util.*;

public class Main {
    public static List<Integer> rotateArray(List<Integer> arr, int k) {
        // Rotate array right by k steps and return it
        return arr;
    }

    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5));
        System.out.println(rotateArray(list, 2));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

vector<int> rotate_array(vector<int> arr, int k) {
    // Rotate array right by k steps and return it
    return arr;
}

int main() {
    vector<int> r = rotate_array({1, 2, 3, 4, 5}, 2);
    cout << "[";
    for (size_t i = 0; i < r.size(); i++) {
        if (i > 0) cout << ", ";
        cout << r[i];
    }
    cout << "]" << endl;
    return 0;
}`,
      nodejs: `function rotate_array(arr, k) {
    // Rotate array right by k steps and return it
    return null;
}

// Test
console.log(rotate_array([1, 2, 3, 4, 5], 2));`,
    },
    testCases: [
      {
        input: "rotate_array([1, 2, 3, 4, 5], 2)",
        expectedOutput: "[4, 5, 1, 2, 3]",
        description: "Rotate by 2",
        javaSnippet: `{ List<Integer> r=rotateArray(new ArrayList<>(Arrays.asList(1,2,3,4,5)),2); System.out.println(r); }`,
        cppSnippet: `{ auto r=rotate_array({1,2,3,4,5},2); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "rotate_array([1, 2, 3], 1)",
        expectedOutput: "[3, 1, 2]",
        description: "Rotate by 1",
        javaSnippet: `{ List<Integer> r=rotateArray(new ArrayList<>(Arrays.asList(1,2,3)),1); System.out.println(r); }`,
        cppSnippet: `{ auto r=rotate_array({1,2,3},1); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
      {
        input: "rotate_array([1, 2], 3)",
        expectedOutput: "[2, 1]",
        description: "k > length",
        javaSnippet: `{ List<Integer> r=rotateArray(new ArrayList<>(Arrays.asList(1,2)),3); System.out.println(r); }`,
        cppSnippet: `{ auto r=rotate_array({1,2},3); cout<<"["; for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<"]"<<endl; }`,
      },
    ],
    concepts: ["arrays", "rotation", "modulo"],
    estimatedTime: 15,
  },
  {
    id: "second-largest",
    title: "Second Largest Element",
    topicId: "arrays",
    difficulty: "medium",
    description: `Write a function to find the second largest element in an array.

**Example:**
- Input: [5, 2, 8, 1, 9]
- Output: 8`,
    starterCode: {
      python3: `def second_largest(arr):
    # Return the second largest element
    pass

# Test
if __name__ == "__main__":
    print(second_largest([5, 2, 8, 1, 9]))`,
      java: `import java.util.*;

public class Main {
    public static int secondLargest(int[] arr) {
        // Return the second largest element
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(secondLargest(new int[]{5, 2, 8, 1, 9}));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
using namespace std;

int second_largest(vector<int> arr) {
    // Return the second largest element
    return 0;
}

int main() {
    cout << second_largest({5, 2, 8, 1, 9}) << endl;
    return 0;
}`,
      nodejs: `function second_largest(arr) {
    // Return the second largest element
    return null;
}

// Test
console.log(second_largest([5, 2, 8, 1, 9]));`,
    },
    testCases: [
      {
        input: "second_largest([5, 2, 8, 1, 9])",
        expectedOutput: "8",
        description: "Find second largest",
        javaSnippet: `System.out.println(secondLargest(new int[]{5,2,8,1,9}));`,
        cppSnippet: `cout<<second_largest({5,2,8,1,9})<<endl;`,
      },
      {
        input: "second_largest([1, 2, 3, 4, 5])",
        expectedOutput: "4",
        description: "Sorted array",
        javaSnippet: `System.out.println(secondLargest(new int[]{1,2,3,4,5}));`,
        cppSnippet: `cout<<second_largest({1,2,3,4,5})<<endl;`,
      },
      {
        input: "second_largest([7, 7, 5, 5])",
        expectedOutput: "5",
        description: "With duplicates",
        javaSnippet: `System.out.println(secondLargest(new int[]{7,7,5,5}));`,
        cppSnippet: `cout<<second_largest({7,7,5,5})<<endl;`,
      },
    ],
    concepts: ["arrays", "iteration", "tracking"],
    estimatedTime: 12,
  },

  // ==================== TOPIC 5: Strings ====================
  {
    id: "palindrome-check",
    title: "Palindrome Check",
    topicId: "strings",
    difficulty: "easy",
    description: `Write a function that checks if a string is a palindrome (reads the same forwards and backwards).

**Example:**
- Input: "racecar"
- Output: True`,
    starterCode: {
      python3: `def is_palindrome(s):
    # Return True if palindrome, False otherwise
    pass

# Test
if __name__ == "__main__":
    print(is_palindrome("racecar"))`,
      java: `import java.util.*;

public class Main {
    public static boolean isPalindrome(String s) {
        // Return true if palindrome, false otherwise
        return false;
    }

    public static void main(String[] args) {
        System.out.println(isPalindrome("racecar") ? "True" : "False");
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

bool is_palindrome(string s) {
    // Return true if palindrome, false otherwise
    return false;
}

int main() {
    cout << (is_palindrome("racecar") ? "True" : "False") << endl;
    return 0;
}`,
      nodejs: `function is_palindrome(s) {
    // Return true if palindrome, false otherwise
    return null;
}

// Test
console.log(is_palindrome("racecar"));`,
    },
    testCases: [
      {
        input: `is_palindrome("racecar")`,
        expectedOutput: "True",
        description: "Palindrome",
        javaSnippet: `System.out.println(isPalindrome("racecar")?"True":"False");`,
        cppSnippet: `cout<<(is_palindrome("racecar")?"True":"False")<<endl;`,
      },
      {
        input: `is_palindrome("hello")`,
        expectedOutput: "False",
        description: "Not palindrome",
        javaSnippet: `System.out.println(isPalindrome("hello")?"True":"False");`,
        cppSnippet: `cout<<(is_palindrome("hello")?"True":"False")<<endl;`,
      },
      {
        input: `is_palindrome("a")`,
        expectedOutput: "True",
        description: "Single char",
        javaSnippet: `System.out.println(isPalindrome("a")?"True":"False");`,
        cppSnippet: `cout<<(is_palindrome("a")?"True":"False")<<endl;`,
      },
    ],
    concepts: ["strings", "two-pointers", "palindrome"],
    estimatedTime: 10,
  },
  {
    id: "reverse-string",
    title: "Reverse String",
    topicId: "strings",
    difficulty: "easy",
    description: `Write a function that reverses a string.

**Example:**
- Input: "hello"
- Output: "olleh"`,
    starterCode: {
      python3: `def reverse_string(s):
    # Return the reversed string
    pass

# Test
if __name__ == "__main__":
    print(reverse_string("hello"))`,
      java: `import java.util.*;

public class Main {
    public static String reverseString(String s) {
        // Return the reversed string
        return "";
    }

    public static void main(String[] args) {
        System.out.println(reverseString("hello"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

string reverse_string(string s) {
    // Return the reversed string
    return "";
}

int main() {
    cout << reverse_string("hello") << endl;
    return 0;
}`,
      nodejs: `function reverse_string(s) {
    // Return the reversed string
    return null;
}

// Test
console.log(reverse_string("hello"));`,
    },
    testCases: [
      {
        input: `reverse_string("hello")`,
        expectedOutput: "olleh",
        description: "Basic reverse",
        javaSnippet: `System.out.println(reverseString("hello"));`,
        cppSnippet: `cout<<reverse_string("hello")<<endl;`,
      },
      {
        input: `reverse_string("a")`,
        expectedOutput: "a",
        description: "Single char",
        javaSnippet: `System.out.println(reverseString("a"));`,
        cppSnippet: `cout<<reverse_string("a")<<endl;`,
      },
      {
        input: `reverse_string("")`,
        expectedOutput: "",
        description: "Empty string",
        javaSnippet: `System.out.println(reverseString(""));`,
        cppSnippet: `cout<<reverse_string("")<<endl;`,
      },
    ],
    concepts: ["strings", "two-pointers", "reversal"],
    estimatedTime: 5,
  },
  {
    id: "count-vowels",
    title: "Count Vowels",
    topicId: "strings",
    difficulty: "easy",
    description: `Write a function that counts the number of vowels in a string.
Vowels: a, e, i, o, u (both lowercase and uppercase)

**Example:**
- Input: "Hello World"
- Output: 3`,
    starterCode: {
      python3: `def count_vowels(s):
    # Return the count of vowels
    pass

# Test
if __name__ == "__main__":
    print(count_vowels("Hello World"))`,
      java: `import java.util.*;

public class Main {
    public static int countVowels(String s) {
        // Return the count of vowels
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(countVowels("Hello World"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

int count_vowels(string s) {
    // Return the count of vowels
    return 0;
}

int main() {
    cout << count_vowels("Hello World") << endl;
    return 0;
}`,
      nodejs: `function count_vowels(s) {
    // Return the count of vowels
    return null;
}

// Test
console.log(count_vowels("Hello World"));`,
    },
    testCases: [
      {
        input: `count_vowels("Hello World")`,
        expectedOutput: "3",
        description: "Basic count",
        javaSnippet: `System.out.println(countVowels("Hello World"));`,
        cppSnippet: `cout<<count_vowels("Hello World")<<endl;`,
      },
      {
        input: `count_vowels("AEIOU")`,
        expectedOutput: "5",
        description: "All uppercase vowels",
        javaSnippet: `System.out.println(countVowels("AEIOU"));`,
        cppSnippet: `cout<<count_vowels("AEIOU")<<endl;`,
      },
      {
        input: `count_vowels("xyz")`,
        expectedOutput: "0",
        description: "No vowels",
        javaSnippet: `System.out.println(countVowels("xyz"));`,
        cppSnippet: `cout<<count_vowels("xyz")<<endl;`,
      },
    ],
    concepts: ["strings", "iteration", "counting"],
    estimatedTime: 8,
  },
  {
    id: "anagram-check",
    title: "Anagram Check",
    topicId: "strings",
    difficulty: "medium",
    description: `Write a function that checks if two strings are anagrams of each other.
Anagrams have the same characters in different order.

**Example:**
- Input: "listen", "silent"
- Output: True`,
    starterCode: {
      python3: `def is_anagram(s1, s2):
    # Return True if anagrams, False otherwise
    pass

# Test
if __name__ == "__main__":
    print(is_anagram("listen", "silent"))`,
      java: `import java.util.*;

public class Main {
    public static boolean isAnagram(String s1, String s2) {
        // Return true if anagrams, false otherwise
        return false;
    }

    public static void main(String[] args) {
        System.out.println(isAnagram("listen", "silent") ? "True" : "False");
    }
}`,
      cpp17: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

bool is_anagram(string s1, string s2) {
    // Return true if anagrams, false otherwise
    return false;
}

int main() {
    cout << (is_anagram("listen", "silent") ? "True" : "False") << endl;
    return 0;
}`,
      nodejs: `function is_anagram(s1, s2) {
    // Return true if anagrams, false otherwise
    return null;
}

// Test
console.log(is_anagram("listen", "silent"));`,
    },
    testCases: [
      {
        input: `is_anagram("listen", "silent")`,
        expectedOutput: "True",
        description: "Anagrams",
        javaSnippet: `System.out.println(isAnagram("listen","silent")?"True":"False");`,
        cppSnippet: `cout<<(is_anagram("listen","silent")?"True":"False")<<endl;`,
      },
      {
        input: `is_anagram("hello", "world")`,
        expectedOutput: "False",
        description: "Not anagrams",
        javaSnippet: `System.out.println(isAnagram("hello","world")?"True":"False");`,
        cppSnippet: `cout<<(is_anagram("hello","world")?"True":"False")<<endl;`,
      },
      {
        input: `is_anagram("rat", "tar")`,
        expectedOutput: "True",
        description: "Simple anagrams",
        javaSnippet: `System.out.println(isAnagram("rat","tar")?"True":"False");`,
        cppSnippet: `cout<<(is_anagram("rat","tar")?"True":"False")<<endl;`,
      },
    ],
    concepts: ["strings", "sorting", "hash-map"],
    estimatedTime: 12,
  },
  {
    id: "string-compression",
    title: "String Compression",
    topicId: "strings",
    difficulty: "medium",
    description: `Write a function that performs basic string compression using character counts.
If the compressed string is not smaller than the original, return the original.

**Example:**
- Input: "aaabbc"
- Output: "a3b2c1"`,
    starterCode: {
      python3: `def compress_string(s):
    # Return compressed string, or original if not smaller
    pass

# Test
if __name__ == "__main__":
    print(compress_string("aaabbc"))`,
      java: `import java.util.*;

public class Main {
    public static String compressString(String s) {
        // Return compressed string, or original if not smaller
        return "";
    }

    public static void main(String[] args) {
        System.out.println(compressString("aaabbc"));
    }
}`,
      cpp17: `#include <iostream>
#include <string>
using namespace std;

string compress_string(string s) {
    // Return compressed string, or original if not smaller
    return "";
}

int main() {
    cout << compress_string("aaabbc") << endl;
    return 0;
}`,
      nodejs: `function compress_string(s) {
    // Return compressed string, or original if not smaller
    return null;
}

// Test
console.log(compress_string("aaabbc"));`,
    },
    testCases: [
      {
        input: `compress_string("aaabbc")`,
        expectedOutput: "a3b2c1",
        description: "Basic compression",
        javaSnippet: `System.out.println(compressString("aaabbc"));`,
        cppSnippet: `cout<<compress_string("aaabbc")<<endl;`,
      },
      {
        input: `compress_string("abc")`,
        expectedOutput: "abc",
        description: "No compression benefit",
        javaSnippet: `System.out.println(compressString("abc"));`,
        cppSnippet: `cout<<compress_string("abc")<<endl;`,
      },
      {
        input: `compress_string("aaaaaa")`,
        expectedOutput: "a6",
        description: "Single char repeated",
        javaSnippet: `System.out.println(compressString("aaaaaa"));`,
        cppSnippet: `cout<<compress_string("aaaaaa")<<endl;`,
      },
    ],
    concepts: ["strings", "iteration", "counting"],
    estimatedTime: 15,
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    topicId: "strings",
    difficulty: "easy",
    description: `Write a function that returns FizzBuzz sequence from 1 to n as a list.
- If divisible by 3: "Fizz"
- If divisible by 5: "Buzz"
- If divisible by both: "FizzBuzz"
- Otherwise: the number as string

**Example:**
- Input: 5
- Output: ["1", "2", "Fizz", "4", "Buzz"]`,
    starterCode: {
      python3: `def fizzbuzz(n):
    # Return FizzBuzz sequence as a list of strings
    pass

# Test
if __name__ == "__main__":
    print(fizzbuzz(5))`,
      java: `import java.util.*;

public class Main {
    public static List<String> fizzbuzz(int n) {
        // Return FizzBuzz sequence as a list of strings
        List<String> result = new ArrayList<>();
        return result;
    }

    public static void main(String[] args) {
        System.out.println(String.join(", ", fizzbuzz(5)));
    }
}`,
      cpp17: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

vector<string> fizzbuzz(int n) {
    // Return FizzBuzz sequence as a vector of strings
    vector<string> result;
    return result;
}

int main() {
    vector<string> r = fizzbuzz(5);
    for (size_t i = 0; i < r.size(); i++) {
        if (i > 0) cout << ", ";
        cout << r[i];
    }
    cout << endl;
    return 0;
}`,
      nodejs: `function fizzbuzz(n) {
    // Return FizzBuzz sequence as an array of strings
    return null;
}

// Test
console.log(fizzbuzz(5).join(", "));`,
    },
    testCases: [
      {
        input: `", ".join(fizzbuzz(5))`,
        expectedOutput: "1, 2, Fizz, 4, Buzz",
        description: "First 5 elements",
        javaSnippet: `System.out.println(String.join(", ", fizzbuzz(5)));`,
        cppSnippet: `{ auto r=fizzbuzz(5); for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<endl; }`,
      },
      {
        input: `fizzbuzz(15)[14]`,
        expectedOutput: "FizzBuzz",
        description: "FizzBuzz at 15",
        javaSnippet: `{ List<String> r=fizzbuzz(15); System.out.println(r.get(r.size()-1)); }`,
        cppSnippet: `{ auto r=fizzbuzz(15); cout<<r.back()<<endl; }`,
      },
      {
        input: `", ".join(fizzbuzz(3))`,
        expectedOutput: "1, 2, Fizz",
        description: "First 3 elements",
        javaSnippet: `System.out.println(String.join(", ", fizzbuzz(3)));`,
        cppSnippet: `{ auto r=fizzbuzz(3); for(size_t i=0;i<r.size();i++){if(i>0)cout<<", ";cout<<r[i];} cout<<endl; }`,
      },
    ],
    concepts: ["conditionals", "modulo", "iteration"],
    estimatedTime: 10,
  },
];

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return QUESTIONS.filter((q) => q.topicId === topicId);
}
