import { useEffect, useState } from 'react';

interface Props {
  date: string | null;
  compact?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CountdownTimer({ date, compact = false }: Props) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!date) return;

    const calc = () => {
      const diff = new Date(date).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [date]);

  if (compact) {
    return (
      <span className="font-mono text-orange-400 text-xs">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hrs', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
      ].map(({ label, value }) => (
        <div key={label} className="text-center">
          <div className="text-lg font-bold text-orange-400 font-mono">{pad(value)}</div>
          <div className="text-[10px] text-gray-500">{label}</div>
        </div>
      ))}
    </div>
  );
}
