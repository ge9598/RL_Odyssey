/**
 * DQNQuest — "Pixel Arcade Challenge" quest for Port Deep.
 *
 * Flow:
 * 1. Briefing
 * 2. Manual play: player plays Breakout, score saved as benchmark
 * 3. Config: tune learning rate, replay buffer size, training episodes
 * 4. Training: DQN trains, showing progress
 * 5. Results: compare DQN best vs player score, assign bounty rank
 *
 * Thresholds: C = ties player, B = 1.2x, A = 1.5x, S = 2.0x
 * Base gold: 800, Card: neural-navigator
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { PixelBreakout } from '@/environments/PixelBreakout';
import type { BreakoutState } from '@/environments/PixelBreakout';
import { encodeState } from '@/environments/breakoutUtils';
import { DQN } from '@/algorithms/dqn';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import type { BountyRank } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';

interface DQNQuestProps {
  onComplete: (rank: BountyRank, gold: number) => void;
  playerScoreFromFeel?: number;
}

type QuestPhase = 'briefing' | 'manual' | 'config' | 'training' | 'results';

const BASE_GOLD = 800;
const THRESHOLDS = { S: 2.0, A: 1.5, B: 1.2, C: 1.0 };

const GAME_W = 280;
const GAME_H = 350;

function computeRank(playerScore: number, dqnScore: number): BountyRank {
  if (playerScore === 0) return dqnScore > 0 ? 'S' : 'C';
  const ratio = dqnScore / playerScore;
  if (ratio >= THRESHOLDS.S) return 'S';
  if (ratio >= THRESHOLDS.A) return 'A';
  if (ratio >= THRESHOLDS.B) return 'B';
  if (ratio >= THRESHOLDS.C) return 'C';
  return 'C';
}

export function DQNQuest({ onComplete, playerScoreFromFeel }: DQNQuestProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore((s) => s.completeQuest);
  const collectCard = useCardStore((s) => s.collectCard);

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [playerScore, setPlayerScore] = useState(playerScoreFromFeel ?? 0);

  // Config
  const [cfgLr, setCfgLr] = useState(0.005);
  const [cfgBuffer, setCfgBuffer] = useState(2000);
  const [cfgEpisodes, setCfgEpisodes] = useState(50);

  // Training state
  const dqnRef = useRef<DQN | null>(null);
  const [trainingEpisode, setTrainingEpisode] = useState(0);
  const [trainingBest, setTrainingBest] = useState(0);
  const [trainingCurrent, setTrainingCurrent] = useState(0);
  const [trainingLoss, setTrainingLoss] = useState(0);
  const [trainingDone, setTrainingDone] = useState(false);
  const [episodeScores, setEpisodeScores] = useState<number[]>([]);
  const trainingActiveRef = useRef(false);

  // Results
  const [resultRank, setResultRank] = useState<BountyRank>('C');
  const [resultGold, setResultGold] = useState(0);

  // --- Manual play ---
  const handleManualGameOver = useCallback((score: number) => {
    setPlayerScore(score);
    // Short delay before moving to config
    setTimeout(() => setPhase('config'), 1500);
  }, []);

  // --- Training ---
  const startTraining = useCallback(() => {
    setPhase('training');
    setTrainingEpisode(0);
    setTrainingBest(0);
    setTrainingCurrent(0);
    setTrainingLoss(0);
    setTrainingDone(false);
    setEpisodeScores([]);

    const dqn = new DQN(5, 3, 32, Date.now() % 100000);
    dqn.setHyperparameter('learningRate', cfgLr);
    dqn.setHyperparameter('replayBufferSize', cfgBuffer);
    dqnRef.current = dqn;
    trainingActiveRef.current = true;
  }, [cfgLr, cfgBuffer]);

  // Run training episodes in a microtask loop so the UI stays responsive
  useEffect(() => {
    if (phase !== 'training' || !dqnRef.current || trainingDone) return;

    let cancelled = false;
    const dqn = dqnRef.current;

    const runEpisode = () => {
      if (cancelled || !trainingActiveRef.current) return;

      // Simulate one full Breakout episode
      const gameState: BreakoutState = {
        ballX: GAME_W / 2,
        ballY: GAME_H - 50,
        ballVx: 3 * (Math.random() > 0.5 ? 1 : -1),
        ballVy: -3,
        paddleX: GAME_W / 2,
        bricks: Array.from({ length: 3 }, () => new Array(8).fill(true)),
        score: 0,
        lives: 1,
        gameOver: false,
        won: false,
      };

      const paddleW = GAME_W * 0.15;
      const brickW = (GAME_W - 9 * 2) / 8;
      const brickH = 14;
      let steps = 0;
      const maxSteps = 2000;

      while (!gameState.gameOver && steps < maxSteps) {
        steps++;
        const state = encodeState(gameState, GAME_W, GAME_H);
        const result = dqn.step(state);
        const act = result.action;

        // Apply action
        if (act === 0) {
          gameState.paddleX = Math.max(paddleW / 2, gameState.paddleX - 5);
        } else if (act === 2) {
          gameState.paddleX = Math.min(GAME_W - paddleW / 2, gameState.paddleX + 5);
        }

        // Move ball
        gameState.ballX += gameState.ballVx;
        gameState.ballY += gameState.ballVy;

        let reward = 0;

        // Wall collisions
        if (gameState.ballX <= 3) { gameState.ballX = 3; gameState.ballVx = Math.abs(gameState.ballVx); }
        if (gameState.ballX >= GAME_W - 3) { gameState.ballX = GAME_W - 3; gameState.ballVx = -Math.abs(gameState.ballVx); }
        if (gameState.ballY <= 3) { gameState.ballY = 3; gameState.ballVy = Math.abs(gameState.ballVy); }

        // Paddle collision
        const paddleTop = GAME_H - 30;
        if (
          gameState.ballVy > 0 &&
          gameState.ballY + 3 >= paddleTop &&
          gameState.ballY + 3 <= paddleTop + 14 &&
          gameState.ballX >= gameState.paddleX - paddleW / 2 &&
          gameState.ballX <= gameState.paddleX + paddleW / 2
        ) {
          gameState.ballVy = -Math.abs(gameState.ballVy);
          const relHit = (gameState.ballX - gameState.paddleX) / (paddleW / 2);
          gameState.ballVx = relHit * 4.5;
          if (Math.abs(gameState.ballVy) < 1.5) gameState.ballVy = -3;
          reward += 0.1;
        }

        // Ball falls
        if (gameState.ballY > GAME_H) {
          gameState.lives--;
          reward = -1;
          if (gameState.lives <= 0) {
            gameState.gameOver = true;
          }
        }

        // Brick collisions
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 8; c++) {
            if (!gameState.bricks[r][c]) continue;
            const bx = 2 + c * (brickW + 2);
            const by = 40 + r * (brickH + 2);
            if (
              gameState.ballX + 3 >= bx &&
              gameState.ballX - 3 <= bx + brickW &&
              gameState.ballY + 3 >= by &&
              gameState.ballY - 3 <= by + brickH
            ) {
              gameState.bricks[r][c] = false;
              gameState.score++;
              reward += 1;
              gameState.ballVy = -gameState.ballVy;
              break;
            }
          }
        }

        // Check win
        let brickCount = 0;
        for (const row of gameState.bricks) for (const b of row) if (b) brickCount++;
        if (brickCount === 0) {
          gameState.won = true;
          gameState.gameOver = true;
          reward += 5;
        }

        const nextState = encodeState(gameState, GAME_W, GAME_H);
        dqn.update({
          state,
          action: act,
          reward,
          nextState,
          done: gameState.gameOver,
        });
      }

      const epScore = gameState.score;
      setEpisodeScores((prev) => [...prev, epScore]);
      setTrainingCurrent(epScore);
      setTrainingBest((prev) => Math.max(prev, epScore));
      setTrainingEpisode((prev) => {
        const next = prev + 1;
        if (next >= cfgEpisodes) {
          setTrainingDone(true);
          trainingActiveRef.current = false;
        }
        return next;
      });

      const viz = dqn.getVisualizationData();
      setTrainingLoss((viz.data as { loss: number }).loss);
    };

    // Run episodes with yielding to keep UI responsive
    let episodeIdx = 0;
    const runBatch = () => {
      if (cancelled) return;
      const batchEnd = Math.min(episodeIdx + 3, cfgEpisodes);
      for (let i = episodeIdx; i < batchEnd && !cancelled; i++) {
        runEpisode();
      }
      episodeIdx = batchEnd;
      if (episodeIdx < cfgEpisodes && !cancelled) {
        setTimeout(runBatch, 0);
      }
    };
    runBatch();

    return () => {
      cancelled = true;
      trainingActiveRef.current = false;
    };
  }, [phase, trainingDone, cfgEpisodes, cfgLr, cfgBuffer]);

  // --- Results ---
  const showResults = useCallback(() => {
    const rank = computeRank(playerScore, trainingBest);
    const gold = Math.floor(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);
    setResultRank(rank);
    setResultGold(gold);
    setPhase('results');

    completeQuest('deep', rank, BASE_GOLD);
    collectCard('neural-navigator', rank);
  }, [playerScore, trainingBest, completeQuest, collectCard]);

  // --- Phase renders ---

  if (phase === 'briefing') {
    return (
      <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
        <PixelPanel className="text-center">
          <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">
            {t('dqn.quest.title')}
          </h3>
          <p className="font-body text-lg text-[#e2e8f0] mb-4">
            {t('dqn.quest.briefing')}
          </p>
          <div className="flex flex-col gap-2 text-left">
            <p className="font-body text-base text-[#00d4ff]">
              {t('dqn.quest.step1')}
            </p>
            <p className="font-body text-base text-[#fbbf24]">
              {t('dqn.quest.step2')}
            </p>
            <p className="font-body text-base text-[#4ade80]">
              {t('dqn.quest.step3')}
            </p>
          </div>
        </PixelPanel>

        {/* Show thresholds */}
        <PixelPanel title={t('dqn.quest.bountyRanks')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { rank: 'S', mult: '2.0x', color: '#ffd700' },
              { rank: 'A', mult: '1.5x', color: '#00d4ff' },
              { rank: 'B', mult: '1.2x', color: '#4ade80' },
              { rank: 'C', mult: '1.0x', color: '#708090' },
            ].map(({ rank, mult, color }) => (
              <div key={rank} className="flex items-center gap-2">
                <span className="font-pixel text-xs" style={{ color }}>
                  {rank}
                </span>
                <span className="font-body text-sm text-[#e2e8f0]">
                  {t('dqn.quest.beatBy')} {mult}
                </span>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelButton onClick={() => setPhase('manual')} variant="gold" size="lg">
          {t('dqn.quest.startManual')}
        </PixelButton>
      </div>
    );
  }

  if (phase === 'manual') {
    return (
      <div className="flex flex-col items-center gap-4">
        <PixelPanel className="px-4 py-2">
          <span className="font-pixel text-xs text-[#ffd700]">
            {t('dqn.quest.manualPhase')}
          </span>
        </PixelPanel>

        <PixelBreakout
          mode="manual"
          width={GAME_W}
          height={GAME_H}
          onStep={(_s, _r, _d, score) => setPlayerScore(score)}
          onGameOver={handleManualGameOver}
        />

        <p className="font-body text-sm text-[#708090]">
          {t('dqn.feel.controlHint')}
        </p>
      </div>
    );
  }

  if (phase === 'config') {
    return (
      <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
        <PixelPanel className="text-center">
          <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
            {t('dqn.quest.yourBenchmark')}
          </h3>
          <p className="font-body text-3xl text-[#ffd700] glow-gold mb-2">
            {playerScore}
          </p>
          <p className="font-body text-base text-[#e2e8f0]">
            {t('dqn.quest.configIntro')}
          </p>
        </PixelPanel>

        <PixelPanel title={t('dqn.quest.configTitle')} className="w-full">
          <div className="flex flex-col gap-4">
            <PixelSlider
              label={t('dqn.watch.learningRate')}
              value={cfgLr}
              min={0.001}
              max={0.01}
              step={0.001}
              onChange={setCfgLr}
            />
            <PixelSlider
              label={t('dqn.watch.bufferSize')}
              value={cfgBuffer}
              min={500}
              max={5000}
              step={500}
              onChange={setCfgBuffer}
            />
            <PixelSlider
              label={t('dqn.quest.episodes')}
              value={cfgEpisodes}
              min={20}
              max={200}
              step={10}
              onChange={setCfgEpisodes}
            />
          </div>
        </PixelPanel>

        <PixelButton onClick={startTraining} variant="primary" size="lg">
          {t('dqn.quest.startTraining')}
        </PixelButton>
      </div>
    );
  }

  if (phase === 'training') {
    const progress = cfgEpisodes > 0 ? (trainingEpisode / cfgEpisodes) * 100 : 0;

    return (
      <div className="flex flex-col items-center gap-4 max-w-xl mx-auto">
        <PixelPanel className="w-full text-center">
          <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
            {t('dqn.quest.trainingTitle')}
          </h3>

          {/* Progress bar */}
          <div className="w-full h-4 bg-[#1e2448] rounded-sm overflow-hidden mb-3 pixel-border">
            <div
              className="h-full bg-gradient-to-r from-[#00d4ff] to-[#4ade80] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <StatItem label={t('dqn.watch.episode')} value={`${trainingEpisode} / ${cfgEpisodes}`} color="#00d4ff" />
            <StatItem label={t('dqn.quest.currentScore')} value={trainingCurrent} color="#e2e8f0" />
            <StatItem label={t('dqn.quest.bestScore')} value={trainingBest} color="#ffd700" />
            <StatItem label={t('dqn.watch.loss')} value={trainingLoss.toFixed(4)} color="#f87171" />
            <StatItem
              label={t('dqn.quest.playerBenchmark')}
              value={playerScore}
              color="#708090"
            />
            <StatItem
              label={t('dqn.quest.ratio')}
              value={playerScore > 0 ? `${(trainingBest / playerScore).toFixed(2)}x` : '-'}
              color={trainingBest >= playerScore ? '#4ade80' : '#fb923c'}
            />
          </div>
        </PixelPanel>

        {/* Episode score chart */}
        {episodeScores.length > 1 && (
          <PixelPanel title={t('dqn.watch.rewardChart')} className="w-full">
            <MiniChart data={episodeScores} color="#4ade80" height={80} />
          </PixelPanel>
        )}

        {trainingDone && (
          <PixelButton onClick={showResults} variant="gold" size="lg">
            {t('dqn.quest.seeResults')}
          </PixelButton>
        )}
      </div>
    );
  }

  // Results phase
  const rankColors: Record<BountyRank, string> = {
    S: '#ffd700',
    A: '#00d4ff',
    B: '#4ade80',
    C: '#708090',
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
      <PixelPanel className="w-full text-center">
        <h3 className="font-pixel text-lg mb-4" style={{ color: rankColors[resultRank] }}>
          {t(`bounty.rank.${resultRank}`)}
        </h3>

        <div className="flex justify-center gap-8 mb-4">
          <div className="text-center">
            <p className="font-pixel text-[10px] text-[#708090] mb-1">{t('dqn.quest.youScored')}</p>
            <p className="font-body text-2xl text-[#e2e8f0]">{playerScore}</p>
          </div>
          <div className="text-center">
            <p className="font-pixel text-[10px] text-[#708090] mb-1">{t('dqn.quest.dqnScored')}</p>
            <p className="font-body text-2xl text-[#ffd700] glow-gold">{trainingBest}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 items-center mb-4">
          <span className="font-pixel text-xs text-[#ffd700]">+{resultGold}</span>
          <span className="font-body text-sm text-[#e2e8f0]">{t('common.gold')}</span>
        </div>

        <p className="font-body text-base text-[#e2e8f0]">
          {t('dqn.quest.resultMessage')}
        </p>
      </PixelPanel>

      {/* Card earned */}
      <PixelPanel variant="gold" className="text-center">
        <p className="font-pixel text-xs text-[#ffd700] mb-1">{t('dqn.quest.cardEarned')}</p>
        <p className="font-pixel text-sm text-[#e2e8f0]">{t('value.deep.card')}</p>
      </PixelPanel>

      <div className="flex gap-4">
        <PixelButton
          size="sm"
          variant="secondary"
          onClick={() => {
            setPhase('briefing');
            setTrainingDone(false);
            setEpisodeScores([]);
          }}
        >
          {t('common.retry')}
        </PixelButton>
        <PixelButton
          size="md"
          variant="primary"
          onClick={() => onComplete(resultRank, resultGold)}
        >
          {t('common.next')}
        </PixelButton>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-pixel text-[9px] text-[#708090]">{label}</span>
      <span className="font-pixel text-xs" style={{ color }}>{value}</span>
    </div>
  );
}

function MiniChart({ data, color, height }: { data: number[]; color: string; height: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 600;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />
    </svg>
  );
}

/*
 * i18n keys used:
 *
 * EN:
 * "dqn.quest.title": "Pixel Arcade Challenge"
 * "dqn.quest.briefing": "Beat your own high score with AI! First, play Breakout yourself. Then, configure and train a DQN agent to beat you."
 * "dqn.quest.step1": "1. Play Breakout manually — set your benchmark"
 * "dqn.quest.step2": "2. Configure the DQN — tune learning rate & memory"
 * "dqn.quest.step3": "3. Train and watch — can the AI beat your score?"
 * "dqn.quest.bountyRanks": "Bounty Ranks"
 * "dqn.quest.beatBy": "Beat your score by"
 * "dqn.quest.startManual": "Start Manual Play"
 * "dqn.quest.manualPhase": "Your Turn — Set a High Score!"
 * "dqn.quest.yourBenchmark": "Your Benchmark Score"
 * "dqn.quest.configIntro": "Now configure the DQN agent. Choose your hyperparameters wisely!"
 * "dqn.quest.configTitle": "Configure Your DQN"
 * "dqn.quest.episodes": "Training Episodes"
 * "dqn.quest.startTraining": "Start Training!"
 * "dqn.quest.trainingTitle": "Training in Progress..."
 * "dqn.quest.currentScore": "Current Score"
 * "dqn.quest.bestScore": "Best Score"
 * "dqn.quest.playerBenchmark": "Your Score"
 * "dqn.quest.ratio": "AI / You"
 * "dqn.quest.seeResults": "See Results!"
 * "dqn.quest.youScored": "You Scored"
 * "dqn.quest.dqnScored": "DQN Scored"
 * "dqn.quest.cardEarned": "Card Earned!"
 * "dqn.quest.resultMessage": "DQN combines a neural network with shuffled studying and a stable teacher to master games that are too complex for a simple table!"
 *
 * ZH:
 * "dqn.quest.title": "像素街机挑战"
 * "dqn.quest.briefing": "用AI打败你自己的最高分！先自己玩打砖块，然后配置训练一个DQN智能体来打败你。"
 * "dqn.quest.step1": "1. 手动玩打砖块——设定你的基准"
 * "dqn.quest.step2": "2. 配置DQN——调整学习率和记忆"
 * "dqn.quest.step3": "3. 训练和观察——AI能打败你的分数吗？"
 * "dqn.quest.bountyRanks": "悬赏等级"
 * "dqn.quest.beatBy": "超过你的分数"
 * "dqn.quest.startManual": "开始手动游戏"
 * "dqn.quest.manualPhase": "你的回合——创造最高分！"
 * "dqn.quest.yourBenchmark": "你的基准分数"
 * "dqn.quest.configIntro": "现在配置DQN智能体。明智地选择超参数！"
 * "dqn.quest.configTitle": "配置你的DQN"
 * "dqn.quest.episodes": "训练回合数"
 * "dqn.quest.startTraining": "开始训练！"
 * "dqn.quest.trainingTitle": "训练进行中..."
 * "dqn.quest.currentScore": "当前分数"
 * "dqn.quest.bestScore": "最高分"
 * "dqn.quest.playerBenchmark": "你的分数"
 * "dqn.quest.ratio": "AI / 你"
 * "dqn.quest.seeResults": "查看结果！"
 * "dqn.quest.youScored": "你的得分"
 * "dqn.quest.dqnScored": "DQN得分"
 * "dqn.quest.cardEarned": "获得卡牌！"
 * "dqn.quest.resultMessage": "DQN把神经网络和打乱复习、稳定老师结合在一起，掌握那些简单表格搞不定的复杂游戏！"
 */
