"use client";

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressCircle({
  percentage,
  size = 80,
  strokeWidth = 6,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 75) return "#44f91f";
    if (percentage >= 50) return "#f59e0b";
    return "#6b7280";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{ filter: percentage >= 75 ? "drop-shadow(0 0 4px rgba(68, 249, 31, 0.4))" : "none" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-300">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
