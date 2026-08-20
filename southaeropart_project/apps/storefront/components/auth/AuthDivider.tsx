export function AuthDivider({ text = "OR" }: { text?: string }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[var(--border-color)]" />
      <span className="px-4 text-xs font-heading tracking-[0.2em] text-[var(--text-muted)] uppercase">
        {text}
      </span>
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[var(--border-color)]" />
    </div>
  );
}
