import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

// Simple 3×4 grid: player tries to reach exit manually
const GRID = {
  rows: 3, cols: 4,
  walls: [], traps: [5],
  treasures: [2],
  start: 0, exit: 11,
};
const MAX_MOVES = 20;

// Action symbols for the UI
const ACTION_LABELS = ['⬆️', '➡️', '⬇️', '⬅️'];

export function ReinforceFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const envRef = useRef(new GridWorldEnvironment(GRID));
  const [playerPos, setPlayerPos] = useState(GRID.start);
  const [moveCount, setMoveCount] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [reachedExit, setReachedExit] = useState(false);
  const [lastRewardText, setLastRewardText] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  const handleAction = useCallback((action: number) => {
    if (isFinished) return;
    const result = envRef.current.step(playerPos, action);
    const newPos = result.nextState;
    const r = result.reward;

    setPlayerPos(newPos);
    setMoveCount(m => m + 1);
    setTotalReward(prev => Math.round((prev + r) * 10) / 10);
    setActionLog(prev => [...prev.slice(-4), `${ACTION_LABELS[action]} → ${r > 0 ? '+' + r : r}`]);

    if (r >= 5) setLastRewardText('🎯 +' + r);
    else if (r < -0.3) setLastRewardText('💀 ' + r);
    else setLastRewardText('');

    if (GRID.treasures.includes(newPos) && r >= 5)
      setCollectedTreasures(prev => new Set([...prev, newPos]));

    if (result.done) { setIsFinished(true); setReachedExit(true); }
    else if (moveCount + 1 >= MAX_MOVES) setIsFinished(true);
  }, [isFinished, playerPos, moveCount]);

  const handleReset = () => {
    envRef.current = new GridWorldEnvironment(GRID);
    setPlayerPos(GRID.start);
    setMoveCount(0);
    setTotalReward(0);
    setCollectedTreasures(new Set());
    setIsFinished(false);
    setReachedExit(false);
    setLastRewardText('');
    setActionLog([]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#f97316] glow-accent">{t('reinforce.feel.title')}</h3>
            <p className="font-body text-lg text-[#e2e8f0] mt-1">{t('reinforce.feel.instruction')}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('reinforce.feel.movesLeft')}</span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">{MAX_MOVES - moveCount}</span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('reinforce.feel.reward')}</span>
              <span className={`font-pixel text-base ${totalReward >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {totalReward.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        {lastRewardText && (
          <div className="mt-2 text-center">
            <span className="font-pixel text-xs text-[#ffd700] glow-gold">{lastRewardText}</span>
          </div>
        )}
      </PixelPanel>

      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#f97316]">{t('reinforce.feel.hint')}</p>
      </div>

      <div className="flex gap-2 justify-center flex-wrap font-pixel text-[10px]">
        <span className="text-[#00d4ff]">P = {t('reinforce.feel.legendPlayer')}</span>
        <span className="text-[#4ade80]">F = {t('reinforce.feel.legendExit')}</span>
        <span className="text-[#ffd700]">$ = {t('reinforce.feel.legendTreasure')}</span>
        <span className="text-[#f87171]">X = {t('reinforce.feel.legendTrap')}</span>
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
            const a = dr === -1 ? 0 : dc === 1 ? 1 : dr === 1 ? 2 : 3;
            handleAction(a);
          } : undefined}
          onKeyAction={!isFinished ? handleAction : undefined}
          mode="manual"
        />
      </PixelPanel>

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {actionLog.map((entry, i) => (
            <span key={i} className="font-pixel text-[10px] px-2 py-1 glass-panel pixel-border text-[#e2e8f0]">
              {entry}
            </span>
          ))}
        </div>
      )}

      {!isFinished && (
        <p className="text-center font-body text-sm text-[#708090]">{t('reinforce.feel.controls')}</p>
      )}

      {isFinished && (
        <PixelPanel variant={reachedExit ? 'gold' : 'default'} className="text-center">
          {reachedExit ? (
            <p className="font-pixel text-sm text-[#4ade80] mb-2">{t('reinforce.feel.escaped', { moves: moveCount })}</p>
          ) : (
            <p className="font-pixel text-sm text-[#f87171] mb-2">{t('reinforce.feel.outOfMoves')}</p>
          )}
          <p className="font-body text-lg text-[#f97316] mb-4">{t('reinforce.feel.segue')}</p>
          <div className="flex gap-3 justify-center">
            <PixelButton variant="secondary" onClick={handleReset}>{t('common.retry')}</PixelButton>
            <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
          </div>
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
