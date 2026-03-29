interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
}

const ProgressRing = ({ percent, size = 48, stroke = 4 }: ProgressRingProps) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 75 ? "hsl(142, 71%, 45%)" : percent >= 40 ? "hsl(38, 92%, 50%)" : "hsl(var(--primary))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-display font-bold">
        {Math.round(percent)}%
      </span>
    </div>
  );
};

export default ProgressRing;
