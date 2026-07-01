import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Mission = {
  text: string;
  reward: string;
  time: string;
};

const missions: Mission[] = [
  {
    text: "Review today's top opportunity",
    reward: "+40 XP",
    time: "3 min",
  },
  {
    text: "Check one expiring airdrop",
    reward: "+50 XP",
    time: "Today",
  },
  {
    text: "Review one Watch List project",
    reward: "+30 XP",
    time: "5 min",
  },
  {
    text: "Browse trending airdrops",
    reward: "+25 XP",
    time: "2 min",
  },
  {
    text: "Update your tracked tasks",
    reward: "+35 XP",
    time: "Ongoing",
  },
];

export default function DashboardEngagementPanel() {
  const [completed, setCompleted] = useState<number[]>([]);
  const [showStreak, setShowStreak] = useState(false);
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    const savedStreak = Number(localStorage.getItem("ag_streak") || 7);
    setStreak(savedStreak);
  }, []);

  const completedCount = completed.length;
  const xp = completedCount * 40;

  function toggleMission(index: number) {
    setCompleted((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  }

  function claimStreak() {
    const next = streak + 1;
    setStreak(next);
    localStorage.setItem("ag_streak", String(next));
    setShowStreak(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Good evening, Hunter 👋
          </h1>
          <p className="text-lg text-purple-400">
            Union leads today — 1 verified opportunity expiring soon 🔥
          </p>
        </div>

        <button
          onClick={() => setShowStreak(true)}
          className="text-right hover:scale-105 transition"
        >
          <div className="text-4xl">🔥 {streak}</div>
          <div className="text-xs text-orange-400">Day Streak</div>
        </button>
      </div>

      <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-indigo-950 to-purple-950 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            🚀 Today&apos;s Missions
          </h2>
          <div className="text-sm text-purple-400">
            {completedCount}/{missions.length} completed • +{xp} XP
          </div>
        </div>

        <div className="space-y-4">
          {missions.map((mission, index) => {
            const done = completed.includes(index);

            return (
              <button
                key={mission.text}
                onClick={() => toggleMission(index)}
                className="flex w-full items-center gap-4 rounded-2xl bg-black/30 p-4 text-left hover:bg-white/5 transition"
              >
                <div
                  className={`h-6 w-6 rounded-md border flex items-center justify-center ${
                    done
                      ? "bg-purple-500 border-purple-400 text-white"
                      : "border-purple-400/50"
                  }`}
                >
                  {done ? "✓" : ""}
                </div>

                <div className="flex-1">
                  <div className="font-medium text-white">{mission.text}</div>
                  <div className="text-xs text-emerald-400">
                    {mission.reward} • {mission.time}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-emerald-400 bg-gradient-to-br from-emerald-900 to-teal-900 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <h3 className="text-2xl font-bold text-white">Union</h3>
              <p className="text-emerald-300 font-medium">
                99% AI Confidence • High Reward
              </p>
            </div>
          </div>

          <Link
            to="/airdrop/union"
            className="mt-10 block w-full rounded-2xl bg-white py-4 text-center font-semibold text-emerald-950 hover:bg-emerald-100 transition"
          >
            Start This Quest →
          </Link>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-amber-400/30 bg-zinc-900 p-6 text-center">
          <div className="mb-2 text-sm tracking-widest text-amber-400">
            ESTIMATED POTENTIAL
          </div>

          <div className="text-5xl font-bold text-white">$0–$2,847</div>

          <div className="mt-1 text-lg text-emerald-400">
            Based on tracked opportunities
          </div>

          <div className="mt-4 text-xs text-zinc-400">
            Speculative estimate only. Airdrops are not guaranteed. Actual
            rewards may be zero. Always do your own research.
          </div>
        </div>
      </div>

      {showStreak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="max-w-sm rounded-3xl border border-purple-400 bg-gradient-to-br from-purple-900 to-violet-900 p-10 text-center shadow-2xl">
            <div className="mb-4 text-7xl">🔥</div>

            <h2 className="mb-2 text-4xl font-bold text-white">
              Day {streak} Streak!
            </h2>

            <p className="mb-8 text-purple-200">
              +50 XP earned. You&apos;re building momentum.
            </p>

            <button
              onClick={claimStreak}
              className="rounded-2xl bg-white px-10 py-4 text-lg font-bold text-purple-900 hover:scale-105 transition"
            >
              Claim Reward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}