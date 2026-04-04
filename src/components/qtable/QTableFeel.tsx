import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_MOVES = 30;
const CONFIG = GRID_CONFIGS.feel;

// ─── Component ──────────────────────────────────────────────────────────────

export function QTableFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();

  // Environment
  const envRef = useRef(new GridWorldEnvironment(CONFIG));

  // State
  const [playerPos, setPlayerPos] = useState(CONFIG.start);
  const [moveCount, setMoveCount] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [path, setPath] = useState<number[]>([CONFIG.start]);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [reachedExit, setReachedExit] = useState(false);
  const [lastRewardText, setLastRewardText] = useState('');

  const handleAction = useCallback((action: number) => {
    if (isFinished) return;

    const result = envRef.current.step(playerPos, action);
    const newPos = result.nextState;

    setPlayerPos(newPos);
    setMoveCount((prev) => prev + 1);
    setTotalReward((prev) => Math.round((prev + result.reward) * 10) / 10);
    setPath((prev) => [...prev, newPos]);

    // Show reward feedback
    if (result.reward >= 5) {
      setLastRewardText('+5 Treasure!');
    } else if (result.reward <= -5) {
      setLastRewardText('-5 Trap!');
    } else if (result.reward <= -0.2) {
      setLastRewardText('Bonk! Wall');
    } else {
      setLastRewardText('');
    }

    // Track collected treasures
    if (CONFIG.treasures.includes(newPos) && result.reward >= 5) {
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

    // Determine which action moves toward the clicked cell
    const [pRow, pCol] = envRef.current.toRC(playerPos);
    const [tRow, tCol] = envRef.current.toRC(cellIndex);
    const dr = tRow - pRow;
    const dc = tCol - pCol;

    // Only allow adjacent cell clicks
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;

    let action = -1;
    if (dr === -1) action = 0; // up
    else if (dc === 1) action = 1;  // right
    else if (dr === 1) action = 2;  // down
    else if (dc === -1) action = 3; // left

    if (action >= 0) handleAction(action);
  }, [isFinished, playerPos, handleAction]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {/* Header */}
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
              {t('qtable.feel.title')}
            </h3>
            <p className="font-body text-lg text-[#e2e8f0] mt-1">
              {t('qtable.feel.instruction')}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">
                {t('qtable.feel.movesLeft')}
              </span>
              <span className="font-pixel text-base text-[#ffd700] glow-gold">
                {MAX_MOVES - moveCount}
              </span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[11px] text-[#708090] block">
                {t('qtable.feel.reward')}
              </span>
              <span className={`font-pixel text-base ${totalReward >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {totalReward.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        {lastRewardText && (
          <div className="mt-2 text-center">
            <span className={`font-pixel text-xs ${
              lastRewardText.includes('+') ? 'text-[#ffd700] glow-gold' :
              lastRewardText.includes('-') ? 'text-[#f87171]' : 'text-[#708090]'
            }`}>
              {lastRewardText}
            </span>
          </div>
        )}
      </PixelPanel>

      {/* Legend */}
      <div className="flex justify-center gap-4 flex-wrap">
        <span className="font-pixel text-[10px] text-[#00d4ff]">
          {t('qtable.feel.legendPlayer')}
        </span>
        <span className="font-pixel text-[10px] text-[#4ade80]">
          F = {t('qtable.feel.legendExit')}
        </span>
        <span className="font-pixel text-[10px] text-[#ffd700]">
          $ = {t('qtable.feel.legendTreasure')}
        </span>
        <span className="font-pixel text-[10px] text-[#f87171]">
          X = {t('qtable.feel.legendTrap')}
        </span>
        <span className="font-pixel text-[10px] text-[#708090]">
          {t('qtable.feel.legendWall')}
        </span>
      </div>

      {/* Grid */}
      <PixelPanel className="!p-2">
        <GridWorld
          rows={CONFIG.rows}
          cols={CONFIG.cols}
          walls={CONFIG.walls}
          traps={CONFIG.traps}
          treasures={CONFIG.treasures}
          exit={CONFIG.exit}
          playerPos={playerPos}
          collectedTreasures={collectedTreasures}
          onCellClick={!isFinished ? handleCellClick : undefined}
          onKeyAction={!isFinished ? handleAction : undefined}
          mode="manual"
        />
      </PixelPanel>

      {/* Controls hint */}
      {!isFinished && (
        <div className="text-center">
          <p className="font-body text-sm text-[#708090]">
            {t('qtable.feel.controls')}
          </p>
        </div>
      )}

      {/* Result */}
      {isFinished && (
        <PixelPanel variant={reachedExit ? 'gold' : 'default'} className="text-center">
          {reachedExit ? (
            <>
              <p className="font-pixel text-sm text-[#4ade80] mb-2">
                {t('qtable.feel.escaped', { moves: moveCount })}
              </p>
              <p className="font-body text-lg text-[#ffd700] glow-gold mb-4">
                {t('qtable.feel.pathLength', { length: path.length - 1 })}
              </p>
            </>
          ) : (
            <>
              <p className="font-pixel text-sm text-[#f87171] mb-2">
                {t('qtable.feel.outOfMoves')}
              </p>
              <p className="font-body text-lg text-[#e2e8f0] mb-4">
                {t('qtable.feel.didntEscape')}
              </p>
            </>
          )}
          <p className="font-body text-lg text-[#00d4ff] mb-6">
            {t('qtable.feel.segue')}
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
 * -- i18n KEYS NEEDED --
 *
 * English:
 * qtable.feel.title       = "Feel the Problem"
 * qtable.feel.instruction = "Navigate the grid to find the exit! Use arrow keys, WASD, or click adjacent cells."
 * qtable.feel.movesLeft   = "Moves Left"
 * qtable.feel.reward      = "Reward"
 * qtable.feel.controls    = "Arrow keys / WASD to move, or click an adjacent cell"
 * qtable.feel.legendPlayer   = "You (cyan dot)"
 * qtable.feel.legendExit     = "Exit"
 * qtable.feel.legendTreasure = "Treasure (+5)"
 * qtable.feel.legendTrap     = "Trap (-5)"
 * qtable.feel.legendWall     = "Gray = Wall"
 * qtable.feel.escaped     = "You escaped in {{moves}} moves!"
 * qtable.feel.pathLength  = "Your path was {{length}} steps long."
 * qtable.feel.outOfMoves  = "Out of moves!"
 * qtable.feel.didntEscape = "You couldn't find the exit in time. Navigating a maze is harder than it looks!"
 * qtable.feel.segue       = "What if an algorithm could learn the best path by trying thousands of times? Let's meet Q-Learning..."
 *
 * Chinese:
 * qtable.feel.title       = "感受问题"
 * qtable.feel.instruction = "在网格中找到出口！用方向键、WASD或点击相邻格子。"
 * qtable.feel.movesLeft   = "剩余步数"
 * qtable.feel.reward      = "奖励"
 * qtable.feel.controls    = "方向键 / WASD 移动，或点击相邻格子"
 * qtable.feel.legendPlayer   = "你（青色圆点）"
 * qtable.feel.legendExit     = "出口"
 * qtable.feel.legendTreasure = "宝藏（+5）"
 * qtable.feel.legendTrap     = "陷阱（-5）"
 * qtable.feel.legendWall     = "灰色 = 墙壁"
 * qtable.feel.escaped     = "你用了 {{moves}} 步逃出来了！"
 * qtable.feel.pathLength  = "你的路径长 {{length}} 步。"
 * qtable.feel.outOfMoves  = "步数用完了！"
 * qtable.feel.didntEscape = "你没能在规定步数内找到出口。迷宫导航比看起来难！"
 * qtable.feel.segue       = "如果一个算法能通过成千上万次尝试来学习最佳路径呢？让我们认识 Q-Learning..."
 */
