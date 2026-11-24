import React, { useEffect, useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';

interface HackingMinigameProps {
  runtime: GameRuntime;
  difficulty: 'standard' | 'bank_vault';
  onResult: (success: boolean, rewardCents: number) => void;
}

const HEX_POOL = ['A7', '3F', 'C9', '1B', 'E4', '5D', '8A', 'F2', '0E', '6C', '9B', '4A'];

export const HackingMinigame: React.FC<HackingMinigameProps> = ({ runtime, difficulty, onResult }) => {
  const targetLen = difficulty === 'bank_vault' ? 4 : 3;
  const [sequence] = useState<string[]>(() => {
    const shuffled = [...HEX_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, targetLen);
  });
  const [grid] = useState<string[]>(() => [...HEX_POOL].sort(() => Math.random() - 0.5));
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'bank_vault' ? 18 : 22);
  const [statusMsg, setStatusMsg] = useState('Match the highlighted sequence in exact order.');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          runtime.police.setWantedStars(Math.max(runtime.registry.state.wantedStars, 2), 'SecuroCrack Alarm Tripped');
          onResult(false, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runtime, onResult]);

  const handlePick = (code: string) => {
    if (code === sequence[step]) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= sequence.length) {
        const reward = difficulty === 'bank_vault' ? 1500000 : 185000;
        const char = runtime.registry.getActiveCharacter();
        char.cashCents += reward;
        runtime.registry.events.emit('economy:transactionCompleted', {
          record: {
            id: `tx_hack_${Date.now()}`,
            timestampGameSec: runtime.registry.clock.gameTime,
            characterId: char.id,
            account: 'cash',
            amountCents: reward,
            balanceAfterCents: char.cashCents,
            trigger: 'fictional_securocrack',
            description: `SecuroCrack ${difficulty} payout`,
          },
        });
        onResult(true, reward);
      } else {
        setStatusMsg(`Node ${nextStep}/${sequence.length} unlocked`);
      }
    } else {
      setStatusMsg('Sequence mismatch! Security alert risk increased.');
      setTimeLeft((t) => Math.max(1, t - 3));
    }
  };

  return (
    <div className="bg-neutral-950 border border-cyan-500/40 rounded-xl p-4 text-neutral-100">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-sm font-bold text-cyan-400">SecuroCrack Terminal ({difficulty})</span>
        <span className="font-mono-tabular text-xs text-amber-400">{timeLeft}s</span>
      </div>

      <div className="mb-3 bg-neutral-900 rounded p-2 border border-white/10">
        <div className="text-[11px] text-neutral-400 mb-1">Target Sequence</div>
        <div className="flex gap-2 font-mono-tabular">
          {sequence.map((tok, i) => (
            <span
              key={tok}
              className={`px-2 py-1 rounded text-xs font-bold ${
                i < step
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : i === step
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400'
                    : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {tok}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {grid.map((cell) => (
          <button
            key={cell}
            type="button"
            onClick={() => handlePick(cell)}
            className="py-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-white/10 font-mono-tabular text-xs font-semibold cursor-pointer"
          >
            {cell}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-neutral-400">{statusMsg}</div>
    </div>
  );
};
