import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

const CONFIG = GRID_CONFIGS.feel;
const MAX_MOVES = 30;

export function DuelingDQNFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const envRef = useRef(new GridWorldEnvironment(CONFIG));

  const [playerPos, setPlayerPos] = useState(CONFIG.start);
  const [moveCount, setMoveCount] = useState(0);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [reachedExit, setReachedExit] = useState(false);

  const handleAction = useCallback((action: number) => {
    if (isFinished) return;
    const result = envRef.current.step(playerPos, action);
    setPlayerPos(result.nextState);
    setMoveCount((p) => p + 1);
    if (CONFIG.treasures.includes(result.nextState) && result.reward >= 5) {
      setCollectedTreasures((p) => { const n = new Set(p); n.add(result.nextState); return n; });
    }
    if (result.done) { setIsFinished(true); setReachedExit(true); }
    else if (moveCount + 1 >= MAX_MOVES) setIsFinished(true);
  }, [isFinished, playerPos, moveCount]);

  const handleCellClick = useCallback((cell: number) => {
    if (isFinished) return;
    const [pRow, pCol] = envRef.current.toRC(playerPos);
    const [tRow, tCol] = envRef.current.toRC(cell);
    const dr = tRow - pRow, dc = tCol - pCol;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    let a = -1;
    if (dr === -1) a = 0; else if (dc === 1) a = 1; else if (dr === 1) a = 2; else if (dc === -1) a = 3;
    if (a >= 0) handleAction(a);
  }, [isFinished, playerPos, handleAction]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">{t('duelingdqn.feel.title')}</h3>
        <p className="font-body text-lg text-[#e2e8f0] mt-1">{t('duelingdqn.feel.instruction')}</p>
        <div className="flex gap-4 mt-2">
          <span className="font-pixel text-[11px] text-[#708090]">{t('duelingdqn.feel.movesLeft')}: <span className="text-[#ffd700]">{MAX_MOVES - moveCount}</span></span>
        </div>
      </PixelPanel>

      {/* V/A teaser */}
      <div className="glass-panel pixel-border p-4">
        <p className="font-body text-base text-[#e2e8f0] mb-2">{t('duelingdqn.feel.question')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center glass-panel pixel-border p-2">
            <span className="font-pixel text-[10px] text-[#00d4ff] block">V(s) — State Value</span>
            <span className="font-body text-sm text-[#708090]">{t('duelingdqn.feel.vHint')}</span>
          </div>
          <div className="text-center glass-panel pixel-border p-2">
            <span className="font-pixel text-[10px] text-[#ffd700] block">A(s,a) — Advantage</span>
            <span className="font-body text-sm text-[#708090]">{t('duelingdqn.feel.aHint')}</span>
          </div>
        </div>
      </div>

      <PixelPanel className="!p-2">
        <GridWorld
          rows={CONFIG.rows} cols={CONFIG.cols}
          walls={CONFIG.walls} traps={CONFIG.traps}
          treasures={CONFIG.treasures} exit={CONFIG.exit}
          playerPos={playerPos}
          collectedTreasures={collectedTreasures}
          onCellClick={!isFinished ? handleCellClick : undefined}
          onKeyAction={!isFinished ? handleAction : undefined}
          mode="manual"
        />
      </PixelPanel>

      {isFinished && (
        <PixelPanel variant={reachedExit ? 'gold' : 'default'} className="text-center">
          <p className="font-pixel text-sm mb-2" style={{ color: reachedExit ? '#4ade80' : '#f87171' }}>
            {reachedExit ? t('duelingdqn.feel.escaped') : t('duelingdqn.feel.outOfMoves')}
          </p>
          <p className="font-body text-lg text-[#00d4ff] mb-4">{t('duelingdqn.feel.segue')}</p>
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
