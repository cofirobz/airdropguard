type AiOrbProps = {
  className?: string;
};

export default function AiOrb({ className = '' }: AiOrbProps) {
  return (
    <div aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-md animate-pulse" />
      <div className="absolute inset-[8%] rounded-full border border-cyan-200/30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(34,211,238,0.88)_32%,rgba(59,130,246,0.88)_62%,rgba(5,8,22,0.98)_100%)] shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
      <div className="absolute inset-[28%] rounded-full border border-white/40 bg-white/20 backdrop-blur-sm" />
      <div className="absolute inset-[42%] rounded-full border border-white/75 bg-white/85" />
    </div>
  );
}