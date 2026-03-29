import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// Cliff-walk style grid: 4 rows × 8 cols
// Safe path goes along row 0 (long but safe)
// Risky path goes along row 3 (shorter but passes cliffs)
const CLIFF_CONFIG = {
  rows: 4,
  cols: 8,
  walls: [9, 10, 17, 18],          // a couple interior walls
  traps: [25, 26, 27, 28, 29, 30], // cliff cells along row 3 cols 1-6
  treasures: [3],                    // small treasure on safe path
  start: 0,                          // top-left
  exit: 31,                          // bottom-right
};

const MAX_MOVES = 40;

export function SARSAFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const envRef = useRef(new GridWorldEnvironment(CLIFF_CONFIG));

  const [playerPos, setPlayerPos] = useState(CLIFF_CONFIG.start);
  const [moveCount, setMoveCount] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [_path, setPath] = useState<number[]>([CLIFF_CONFIG.start]);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [reachedExit, setReachedExit] = useState(false);
  const [hitCliff, setHitCliff] = useState(false);
  const [lastRewardText, setLastRewardText] = useState('');

  const handleAction = useCallback((action: number) => {
    if (isFinished) return;
    const result = envRef.current.step(playerPos, action);
    const newPos = result.nextState;

    setPlayerPos(newPos);
    setMoveCount((prev) => prev + 1);
    setTotalReward((prev) => Math.round((prev + result.reward) * 10) / 10);
    setPath((prev) => [...prev, newPos]);

    if (result.reward >= 5) {
      setLastRewardText('+5 Treasure!');
    } else if (result.reward <= -5) {
      setLastRewardText('-5 Cliff!');
      setHitCliff(true);
    } else if (result.reward <= -0.2) {
      setLastRewardText('Bonk!');
    } else {
      setLastRewardText('');
    }

    if (CLIFF_CONFIG.treasures.includes(newPos) && result.reward >= 5) {
      setCollectedTreasures((prev) => {
        const next = new Set(prev);
        next.add(newPos);
        return next;
      });
    }

    if (result.done) {
      setIsFinished(true);
      setReachedExit(true);
    } else if (moveCount + 1 >= MAX_MOVES) {
      setIsFinished(true);
    }
  }, [isFinished, playerPos, moveCount]);

  const handleCellClick = useCallback((cellIndex: number) => {
    if (isFinished) return;
    const [pRow, pCol] = envRef.current.toRC(playerPos);
    const [tRow, tCol] = envRef.current.toRC(cellIndex);
    const dr = tRow - pRow;
    const dc = tCol - pCol;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    let action = -1;
    if (dr === -1) action = 0;
    else if (dc === 1) action = 1;
    else if (dr === 1) action = 2;
    else if (dc === -1) action = 3;
    if (action >= 0) handleAction(action);
  }, [isFinished, playerPos, handleAction]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
              {t('sarsa.feel.title')}
            </h3>
            <p className="font-body text-lg text-[#e2e8f0] mt-1">
              {t('sarsa.feel.instruction')}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('sarsa.feel.movesLeft')}</span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">{MAX_MOVES - moveCount}</span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">{t('sarsa.feel.reward')}</span>
              <span className={`font-pixel text-base ${totalReward >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {totalReward.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        {lastRewardText && (
          <div className="mt-2 text-center">
            <span className={`font-pixel text-xs ${
              lastRewardText.includes('+') ? 'text-[#ffd700] glow-gold' : 'text-[#f87171]'
            }`}>{lastRewardText}</span>
          </div>
        )}
      </PixelPanel>

      {/* Hint banner */}
      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#ffd700]">
          {t('sarsa.feel.hint')}
        </p>
      </div>

      <div className="flex justify-center gap-4 flex-wrap text-[10px] font-pixel">
        <span className="text-[#00d4ff]">{t('sarsa.feel.legendPlayer')}</span>
        <span className="text-[#4ade80]">F = {t('sarsa.feel.legendExit')}</span>
        <span className="text-[#ffd700]">$ = {t('sarsa.feel.legendTreasure')}</span>
        <span className="text-[#f87171]">X = {t('sarsa.feel.legendCliff')}</span>
      </div>

      <PixelPanel className="!p-2">
        <GridWorld
          rows={CLIFF_CONFIG.rows}
          cols={CLIFF_CONFIG.cols}
          walls={CLIFF_CONFIG.walls}
          traps={CLIFF_CONFIG.traps}
          treasures={CLIFF_CONFIG.treasures}
          exit={CLIFF_CONFIG.exit}
          playerPos={playerPos}
          collectedTreasures={collectedTreasures}
          onCellClick={!isFinished ? handleCellClick : undefined}
          onKeyAction={!isFinished ? handleAction : undefined}
          mode="manual"
        />
      </PixelPanel>

      {!isFinished && (
        <p className="text-center font-body text-sm text-[#708090]">
          {t('sarsa.feel.controls')}
        </p>
      )}

      {isFinished && (
        <PixelPanel variant={reachedExit ? 'gold' : 'default'} className="text-center">
          {reachedExit ? (
            <p className="font-pixel text-sm text-[#4ade80] mb-2">
              {t('sarsa.feel.escaped', { moves: moveCount })}
            </p>
          ) : (
            <p className="font-pixel text-sm text-[#f87171] mb-2">
              {t('sarsa.feel.outOfMoves')}
            </p>
          )}
          {hitCliff && (
            <p className="font-body text-base text-[#f87171] mb-2">
              {t('sarsa.feel.hitCliff')}
            </p>
          )}
          <p className="font-body text-lg text-[#00d4ff] mb-4">
            {t('sarsa.feel.segue')}
          </p>
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
