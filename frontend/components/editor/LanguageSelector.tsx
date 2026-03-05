"use client";

import { LANGUAGES } from "@/lib/constants";

interface LanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  value,
  onChange,
  disabled,
}: LanguageSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#44f91f]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {Object.entries(LANGUAGES).map(([key, config]) => (
        <option key={key} value={key} className="bg-[#0d1117] text-white">
          {config.label}
        </option>
      ))}
    </select>
  );
}
