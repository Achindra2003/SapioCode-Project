/**
 * Shared SapioCode logo icon — used on login, register, and anywhere the brand mark appears.
 */
export default function SapioLogo({ size = 24 }: { size?: number }) {
  return (
    <div
      className="rounded-xl bg-[#44f91f]/10 border border-[#44f91f]/30 flex items-center justify-center shadow-[0_0_20px_rgba(68,249,31,0.15)]"
      style={{ width: size + 20, height: size + 20 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#44f91f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <polyline points="7 10 10 13 17 8" />
      </svg>
    </div>
  );
}
