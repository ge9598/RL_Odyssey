import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { TreasureChests } from '@/environments/TreasureChests';
import { BanditEnvironment } from '@/algorithms/bandit';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const NUM_CHESTS = 5;
const MAX_TURNS = 20;
const ANIM_DELAY_MS = 600;

// ─── Component ──────────────────────────────────────────────────────────────

export function BanditFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();

  // Environment — seeded for consistency
  const envRef = useRef(new BanditEnvironment(NUM_CHESTS, 12345));

  // State
  const [turn, setTurn] = useState(0);
  const [totalGold, setTotalGold] = useState(0);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chestRewards, setChestRewards] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestCounts, setChestCounts] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestTotals, setChestTotals] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [bestChestIdx, setBestChestIdx] = useState(-1);

  const handleChestClick = useCallback(
    (index: number) => {
      if (isAnimating || isFinished) return;

      setIsAnimating(true);
      setSelectedChest(index);

      const reward = envRef.current.pull(index);

      // Update state
      setChestRewards((prev) => {
        const next = [...prev];
        next[index] = reward;
        return next;
      });
      setChestCounts((prev) => {
        const next = [...prev];
        next[index] += 1;
        return next;
      });
      setChestTotals((prev) => {
        const next = [...prev];
        next[index] += reward;
        return next;
      });
      setTotalGold((prev) => prev + reward);

      const newTurn = turn + 1;
      setTurn(newTurn);

      // After animation delay, allow next pick
      setTimeout(() => {
        setIsAnimating(false);

        if (newTurn >= MAX_TURNS) {
          // Find the best chest by true mean
          const means = envRef.current.getTrueMeans();
          let bestIdx = 0;
          for (let i = 1; i < means.length; i++) {
            if (means[i] > means[bestIdx]) bestIdx = i;
          }
          setBestChestIdx(bestIdx);
          setIsFinished(true);
        }
      }, ANIM_DELAY_MS);
    },
    [isAnimating, isFinished, turn]
  );

  // Compute average values for display
  const chestValues = chestTotals.map((total, i) =>
    chestCounts[i] > 0 ? total / chestCounts[i] : 0
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {/* Header */}
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
              {t('bandit.feel.title')}
            </h3>
            <p className="font-body text-lg text-[#e2e8f0] mt-1">
              {t('bandit.feel.instruction')}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">
                {t('bandit.feel.turnsLeft')}
              </span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">
                {MAX_TURNS - turn}
              </span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">
                {t('common.gold')}
              </span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">
                {totalGold.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </PixelPanel>

      {/* Chests */}
      <PixelPanel className="!p-2">
        <TreasureChests
          numChests={NUM_CHESTS}
          selectedChest={selectedChest}
          chestRewards={chestRewards}
          chestCounts={chestCounts}
          chestValues={chestValues}
          isAnimating={isAnimating}
          onChestClick={!isFinished ? handleChestClick : undefined}
          mode="manual"
        />
      </PixelPanel>

      {/* Result */}
      {isFinished && (
        <PixelPanel variant="gold" className="text-center">
          <p className="font-pixel text-sm text-[#ffd700] glow-gold mb-2">
            {t('bandit.feel.result', { gold: totalGold.toFixed(1) })}
          </p>
          <p className="font-body text-lg text-[#e2e8f0] mb-4">
            {t('bandit.feel.bestChest', { chest: bestChestIdx + 1 })}
          </p>
          <p className="font-body text-lg text-[#00d4ff] mb-6">
            {t('bandit.feel.segue')}
          </p>
          <div className="flex justify-center gap-4">
            <PixelButton onClick={onComplete}>
              {t('common.next')} →
            </PixelButton>
          </div>
        </PixelPanel>
      )}

      {/* Skip */}
      {!isFinished && onSkip && (
        <div className="text-center">
          <PixelButton size="sm" variant="secondary" onClick={onSkip}>
            {t('common.skip')} →
          </PixelButton>
        </div>
      )}
    </div>
  );
}

/*
 * ── i18n KEYS NEEDED ──
 * bandit.feel.title       = "Feel the Problem"
 * bandit.feel.instruction = "Click a treasure chest to open it! You have 20 turns to earn as much gold as possible."
 * bandit.feel.turnsLeft   = "Turns Left"
 * bandit.feel.result      = "You earned {{gold}} gold!"
 * bandit.feel.bestChest   = "The best chest was #{{chest}}. Did you figure it out?"
 * bandit.feel.segue       = "Now let's see how an algorithm tackles this..."
 *
 * Chinese equivalents:
 * bandit.feel.title       = "感受问题"
 * bandit.feel.instruction = "点击宝箱来打开它！你有20回合来赚取尽可能多的金币。"
 * bandit.feel.turnsLeft   = "剩余回合"
 * bandit.feel.result      = "你赚了 {{gold}} 金币！"
 * bandit.feel.bestChest   = "最好的宝箱是 #{{chest}}。你猜对了吗？"
 * bandit.feel.segue       = "现在让我们看看算法是怎么做的..."
 */
