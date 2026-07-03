type AiOrbProps = {
  className?: string;
};

export default function AiOrb({ className = '' }: AiOrbProps) {
  return (
    <div aria-hidden="true" className={`ai-orb relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div className="ai-orb-halo absolute inset-0 rounded-full" />
      <div className="ai-orb-gyro absolute inset-[4%] rounded-full border border-cyan-200/20" />
      <div className="ai-orb-shell absolute inset-[8%] rounded-full border border-cyan-200/30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(34,211,238,0.9)_30%,rgba(59,130,246,0.88)_58%,rgba(10,22,46,0.98)_100%)]" />
      <div className="ai-orb-core absolute inset-[28%] rounded-full border border-white/45 bg-white/18 backdrop-blur-sm" />
      <div className="absolute inset-[42%] rounded-full border border-white/80 bg-white/90" />
    </div>
  );
}