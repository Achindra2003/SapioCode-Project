# SapioCode – Intelligent Coding Playground

A minimal but powerful single-user coding playground built with **Next.js App Router**, **Monaco Editor**, **JDoodle API**, and **Google Gemini AI**.

## Features

- 🖊️ **Monaco Editor** — VS Code-quality code editing
- 🌐 **10 Languages** — Python, Java, C, C++, JavaScript, Go, Ruby, Rust, PHP, Kotlin
- ▶️ **Run Code** — Execute via JDoodle API with stdin support
- 🤖 **AI Assistant** — Chat with Gemini AI about your code (explain, debug, optimize)
- 🎯 **Dynamic Questions** — Teacher-loaded problems with per-language starter code
- 🌙 **Dark Theme** — Premium glassmorphism design with smooth animations

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Copy .env.local and fill in your API keys:
#   JDOODLE_CLIENT_ID     — from https://www.jdoodle.com/compiler-api/
#   JDOODLE_CLIENT_SECRET — from https://www.jdoodle.com/compiler-api/
#   AI_API_KEY            — from https://aistudio.google.com/apikey

# 3. Run dev server
npm run dev

# 4. Open http://localhost:3000
```

## Dynamic Questions

Load a specific question by adding `?questionId=<id>` to the URL:

```
http://localhost:3000?questionId=two-sum
http://localhost:3000?questionId=fizzbuzz
```

Available questions are in `lib/questions.json`. Add more to expand the question bank.

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel Dashboard → Settings → Environment Variables.

## JDoodle Free Plan Limits

- 200 credits/day (1 credit = 1 execution)
- 5-second execution timeout
- No persistent storage

## Project Structure

```
app/
├── layout.tsx              ← Root layout
├── page.tsx                ← Main playground
├── globals.css             ← Tailwind + custom styles
├── api/
│   ├── compile/route.ts    ← JDoodle execution
│   ├── assistant/route.ts  ← AI chat (Gemini)
│   └── questions/route.ts  ← Question bank
components/
├── MonacoEditor.tsx        ← Code editor
├── OutputConsole.tsx       ← Execution output
├── AIChatPanel.tsx         ← AI chat panel
└── LanguageSelector.tsx    ← Language dropdown
lib/
├── constants.ts            ← Language map, limits
├── types.ts                ← TypeScript interfaces
├── questions.json          ← Question bank
└── rateLimit.ts            ← Rate limiter
```
