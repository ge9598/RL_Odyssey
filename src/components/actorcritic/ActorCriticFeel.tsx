import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

// Larger grid — player evaluates both good and bad moves manually
const GRID = {
  rows: 4, cols: 5,
  walls: [7, 12],
  traps: [6, 11],
  treasures: [3],
  start: 0, exit: 19,
};
const MAX_MOVES = 25;

export function ActorCriticFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const envRef = useRef(new GridWorldEnvironment(GRID));
  const [playerPos, setPlayerPos] = useState(GRID.start);
  const [moveCount, setMoveCount] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [reachedExit, setReachedExit] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; positive: boolean } | null>(null);
  const [ratingLog, setRatingLog] = useState<Array<{ cell: number; rating: string }>>([]);

  const handleAction = useCallback((action: number) => {
    if (isFinished) return;
    const result = envRef.current.step(playerPos, action);
    const newPos = result.nextState;
    const r = result.reward;
    const prevPos = playerPos;

    setPlayerPos(newPos);
    setMoveCount(m => m + 1);
    setTotalReward(prev => Math.round((prev + r) * 10) / 10);

    // Critic-style feedback: rate this move
    let rating = '';
    if (r >= 5) rating = '⭐⭐⭐ Excellent!';
    else if (r >= 1) rating = '⭐⭐ Good';
    else if (r >= 0) rating = '⭐ Neutral';
    else if (r >= -0.5) rating = '👎 Wasted move';
    else rating = '💀 Bad!';

    setFeedback({ text: rating, positive: r >= 0 });
    setRatingLog(prev => [...prev.slice(-4), { cell: prevPos, rating }]);

    if (GRID.treasures.includes(newPos) && r >= 5)
      setCollectedTreasures(prev => new Set([...prev, newPos]));

    if (result.done) { setIsFinished(true); setReachedExit(true); }
    else if (moveCount + 1 >= MAX_MOVES) setIsFinished(true);
  }, [isFinished, playerPos, moveCount]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#c084fc] glow-accent">{t('actorcritic.feel.title')}</h3>
            <p className="font-body text-lg text-[#e2e8f0] mt-1">{t('actorcritic.feel.instruction')}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('actorcritic.feel.movesLeft')}</span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">{MAX_MOVES - moveCount}</span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('actorcritic.feel.score')}</span>
              <span className={`font-pixel text-base ${totalReward >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {totalReward.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </PixelPanel>

      {/* Critic feedback display */}
      {feedback && (
        <div className={`glass-panel pixel-border p-3 text-center ${feedback.positive ? 'border-[#4ade80]/40' : 'border-[#f87171]/40'}`}>
          <p className="font-pixel text-sm"
            style={{ color: feedback.positive ? '#4ade80' : '#f87171' }}>
            {t('actorcritic.feel.criticSays')} {feedback.text}
          </p>
        </div>
      )}

      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#c084fc]">{t('actorcritic.feel.hint')}</p>
      </div>

      <PixelPanel className="!p-2">
        <GridWorld
          rows={GRID.rows} cols={GRID.cols}
          walls={GRID.walls} traps={GRID.traps}
          treasures={GRID.treasures} exit={GRID.exit}
          playerPos={playerPos}
          collectedTreasures={collectedTreasures}
          onCellClick={!isFinished ? (cell) => {
            const [pr, pc] = [Math.floor(playerPos / GRID.cols), playerPos % GRID.cols];
            const [tr, tc] = [Math.floor(cell / GRID.cols), cell % GRID.cols];
            const dr = tr - pr; const dc = tc - pc;
            if (Math.abs(dr) + Math.abs(dc) !== 1) return;
            handleAction(dr === -1 ? 0 : dc === 1 ? 1 : dr === 1 ? 2 : 3);
          } : undefined}
          onKeyAction={!isFinished ? handleAction : undefined}
          mode="manual"
        />
      </PixelPanel>

      {/* Mini rating log */}
      {ratingLog.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {ratingLog.map((entry, i) => (
            <span key={i} className="font-pixel text-[9px] px-2 py-1 glass-panel pixel-border text-[#e2e8f0]">
              {entry.rating}
            </span>
          ))}
        </div>
      )}

      {isFinished && (
        <PixelPanel variant={reachedExit ? 'gold' : 'default'} className="text-center">
          {reachedExit
            ? <p className="font-pixel text-sm text-[#4ade80] mb-2">{t('actorcritic.feel.escaped', { moves: moveCount })}</p>
            : <p className="font-pixel text-sm text-[#f87171] mb-2">{t('actorcritic.feel.outOfMoves')}</p>
          }
          <p className="font-body text-lg text-[#c084fc] mb-4">{t('actorcritic.feel.segue')}</p>
          <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
        </PixelPanel>
      )}

      {!isFinished && onSkip && (
        <div className="text-center">
          <PixelButton size="sm" variant="secondary" onClick={onSkip}>{t('common.skip')} →</PixelButton>
        </div>
      )}
    </div>
  );
}
