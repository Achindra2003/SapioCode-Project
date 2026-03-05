"use client";

interface ProgressCircleProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

export default function ProgressCircle({
    percentage,
    size = 60,
    strokeWidth = 6,
    color = "text-blue-600",
}: ProgressCircleProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    className="text-gray-200"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`${color} transition-all duration-500 ease-in-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <span className="absolute text-xs font-bold">{Math.round(percentage)}%</span>
        </div>
    );
}
