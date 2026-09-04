import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] relative overflow-x-hidden overflow-y-auto">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="font-heading text-[25vw] font-bold tracking-[0.2em] text-white/[0.015] uppercase whitespace-nowrap">
          SOUTH
        </span>
      </div>

      {/* Subtle diagonal lines pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.05) 40px,
            rgba(255,255,255,0.05) 41px
          )`,
        }}
      />

      {/* Top accent line */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-red)] to-transparent" />

      {/* Header with back link */}
      <header className="relative z-10 container-main py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to store
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center relative z-10 px-4 pb-12">
        {children}
      </main>

      {/* Bottom accent line */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} South Aero Performance. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
