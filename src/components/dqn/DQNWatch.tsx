/**
 * DQNWatch — "Watch It Learn" observatory mode for Port Deep.
 *
 * Breakout game on left, controls + charts on right.
 * Hyperparameter sliders, episode reward chart, loss chart, epsilon decay.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider, SpeedControl } from '@/components/ui';
import { PixelBreakout } from '@/environments/PixelBreakout';
import { DQN } from '@/algorithms/dqn';

interface DQNWatchProps {
  onComplete: () => void;
}

const GAME_W = 280;
const GAME_H = 350;

export function DQNWatch({ onComplete }: DQNWatchProps) {
  const { t } = useTranslation();

  const dqnRef = useRef<DQN>(new DQN(5, 3, 32, 123));
  const prevStateRef = useRef<number[] | null>(null);
  const stepOnceRef = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [episode, setEpisode] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [action, setAction] = useState(1); // stay
  const [showQValues, setShowQValues] = useState(true);
  const [showReplay, setShowReplay] = useState(false);
  const [qValues, setQValues] = useState<number[]>([0, 0, 0]);

  // Viz data
  const [vizData, setVizData] = useState({
    episodeRewards: [] as number[],
    loss: 0,
    epsilon: 1,
    replaySize: 0,
  });

  // Hyperparameters
  const [lr, setLr] = useState(0.005);
  const [epsilon, setEpsilon] = useState(1.0);
  const [bufferSize, setBufferSize] = useState(2000);

  // Replay sample
  const [replaySample, setReplaySample] = useState<
    { reward: number; action: number }[]
  >([]);

  // Apply hyperparameters
  useEffect(() => {
    dqnRef.current.setHyperparameter('learningRate', lr);
  }, [lr]);
  useEffect(() => {
    dqnRef.current.setHyperparameter('epsilon', epsilon);
  }, [epsilon]);
  useEffect(() => {
    dqnRef.current.setHyperparameter('replayBufferSize', bufferSize);
  }, [bufferSize]);

  const handleStep = useCallback(
    (state: number[], reward: number, done: boolean, score: number) => {
      // Support both normal running and single-step mode
      const isStepOnce = stepOnceRef.current;
      if (isStepOnce) stepOnceRef.current = false; // clear immediately to prevent double fire
      if (!isRunning && !isStepOnce) return;

      const dqn = dqnRef.current;

      // Get action from DQN
      const result = dqn.step(state);
      setAction(result.action);

      // Update with experience: use the previous state as the "state before this step"
      // and the current `state` as `nextState`.
      if (prevStateRef.current !== null) {
        dqn.update({
          state: prevStateRef.current,
          action: result.action,
          reward,
          nextState: state,
          done,
        });
      }
      prevStateRef.current = state;

      setCurrentScore(score);
      const q = dqn.getQValues(state);
      setQValues(q);

      if (done) {
        setEpisode((e) => e + 1);
      }

      // Update viz periodically
      const viz = dqn.getVisualizationData();
      const d = viz.data as {
        episodeRewards: number[];
        loss: number;
        epsilon: number;
        replayBufferSize: number;
      };
      setVizData({
        episodeRewards: d.episodeRewards,
        loss: d.loss,
        epsilon: d.epsilon,
        replaySize: d.replayBufferSize,
      });

      // Update replay sample
      if (showReplay) {
        const sample = dqn.getReplaySample(5);
        setReplaySample(sample.map((s) => ({ reward: s.reward, action: s.action })));
      }

      // If this was a single-step, pause again
      if (isStepOnce) setIsRunning(false);
    },
    [isRunning, showReplay],
  );

  const handleToggle = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  const handleSingleStep = useCallback(() => {
    if (isRunning) return; // already running, ignore
    stepOnceRef.current = true;
    setIsRunning(true); // run one tick, then handleStep will pause again
  }, [isRunning]);

  const handleReset = useCallback(() => {
    dqnRef.current = new DQN(5, 3, 32, Date.now() % 100000);
    dqnRef.current.setHyperparameter('learningRate', lr);
    dqnRef.current.setHyperparameter('epsilon', epsilon);
    dqnRef.current.setHyperparameter('replayBufferSize', bufferSize);
    prevStateRef.current = null;
    stepOnceRef.current = false;
    setIsRunning(false);
    setEpisode(0);
    setCurrentScore(0);
    setAction(1);
    setQValues([0, 0, 0]);
    setVizData({ episodeRewards: [], loss: 0, epsilon: 1, replaySize: 0 });
  }, [lr, epsilon, bufferSize]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-5xl">
        {/* Game area */}
        <div className="flex flex-col items-center gap-3">
          <PixelBreakout
            mode="auto"
            action={action}
            width={GAME_W}
            height={GAME_H}
            speed={speed}
            showQValues={showQValues}
            qValues={qValues}
            onStep={handleStep}
            paused={!isRunning}
          />
          <SpeedControl
            speed={speed}
            isRunning={isRunning}
            onSpeedChange={setSpeed}
            onToggle={handleToggle}
            onStep={handleSingleStep}
            onReset={handleReset}
          />
        </div>

        {/* Controls + info */}
        <div className="flex flex-col gap-3 flex-1 min-w-[280px]">
          {/* Stats */}
          <PixelPanel title={t('dqn.watch.stats')}>
            <div className="grid grid-cols-2 gap-2">
              <StatItem label={t('dqn.watch.episode')} value={episode} color="#00d4ff" />
              <StatItem label={t('dqn.watch.score')} value={currentScore} color="#ffd700" />
              <StatItem label={t('dqn.watch.epsilon')} value={vizData.epsilon.toFixed(3)} color="#fb923c" />
              <StatItem label={t('dqn.watch.loss')} value={vizData.loss.toFixed(4)} color="#f87171" />
              <StatItem label={t('dqn.watch.replaySize')} value={vizData.replaySize} color="#4ade80" />
              <StatItem
                label={t('dqn.watch.bestEp')}
                value={vizData.episodeRewards.length > 0
                  ? Math.max(...vizData.episodeRewards).toFixed(0)
                  : '-'}
                color="#ffd700"
              />
            </div>
          </PixelPanel>

          {/* Hyperparameters */}
          <PixelPanel title={t('dqn.watch.hyperparams')}>
            <div className="flex flex-col gap-3">
              <PixelSlider
                label={t('dqn.watch.learningRate')}
                value={lr}
                min={0.001}
                max={0.01}
                step={0.001}
                onChange={setLr}
              />
              <PixelSlider
                label={t('dqn.watch.epsilonSlider')}
                value={epsilon}
                min={0}
                max={1}
                step={0.01}
                onChange={setEpsilon}
              />
              <PixelSlider
                label={t('dqn.watch.bufferSize')}
                value={bufferSize}
                min={100}
                max={5000}
                step={100}
                onChange={setBufferSize}
              />
            </div>
          </PixelPanel>

          {/* Toggles */}
          <div className="flex gap-2">
            <PixelButton
              size="sm"
              variant={showQValues ? 'primary' : 'secondary'}
              onClick={() => setShowQValues((v) => !v)}
            >
              Q-Values {showQValues ? 'ON' : 'OFF'}
            </PixelButton>
            <PixelButton
              size="sm"
              variant={showReplay ? 'primary' : 'secondary'}
              onClick={() => setShowReplay((v) => !v)}
            >
              Replay {showReplay ? 'ON' : 'OFF'}
            </PixelButton>
          </div>

          {/* Replay sample */}
          {showReplay && replaySample.length > 0 && (
            <PixelPanel title={t('dqn.watch.replaySample')}>
              <div className="flex gap-2 flex-wrap">
                {replaySample.map((s, i) => (
                  <div
                    key={i}
                    className="px-2 py-1 rounded-sm text-center"
                    style={{
                      backgroundColor:
                        s.reward > 0
                          ? 'rgba(74,222,128,0.15)'
                          : s.reward < 0
                            ? 'rgba(248,113,113,0.15)'
                            : 'rgba(112,128,144,0.15)',
                    }}
                  >
                    <div className="font-pixel text-[9px] text-[#e2e8f0]">
                      A:{['L', '-', 'R'][s.action]}
                    </div>
                    <div
                      className="font-pixel text-[10px]"
                      style={{
                        color:
                          s.reward > 0 ? '#4ade80' : s.reward < 0 ? '#f87171' : '#708090',
                      }}
                    >
                      R:{s.reward > 0 ? '+' : ''}{s.reward.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </PixelPanel>
          )}
        </div>
      </div>

      {/* Episode reward chart */}
      {vizData.episodeRewards.length > 1 && (
        <PixelPanel title={t('dqn.watch.rewardChart')} className="w-full max-w-5xl">
          <MiniChart
            data={vizData.episodeRewards}
            color="#4ade80"
            height={80}
          />
        </PixelPanel>
      )}

      <PixelButton onClick={onComplete} variant="gold" size="md">
        {t('dqn.watch.continue')}
      </PixelButton>
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
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={0.8}
      />
    </svg>
  );
}

/*
 * i18n keys used:
 *
 * EN:
 * "dqn.watch.stats": "Training Stats"
 * "dqn.watch.episode": "Episode"
 * "dqn.watch.score": "Score"
 * "dqn.watch.epsilon": "Exploration"
 * "dqn.watch.loss": "Loss"
 * "dqn.watch.replaySize": "Replay Buffer"
 * "dqn.watch.bestEp": "Best Episode"
 * "dqn.watch.hyperparams": "Hyperparameters"
 * "dqn.watch.learningRate": "Learning Rate"
 * "dqn.watch.epsilonSlider": "Epsilon (Exploration)"
 * "dqn.watch.bufferSize": "Replay Buffer Size"
 * "dqn.watch.replaySample": "Replay Memories"
 * "dqn.watch.rewardChart": "Episode Rewards"
 * "dqn.watch.continue": "Ready for the Quest!"
 *
 * ZH:
 * "dqn.watch.stats": "训练数据"
 * "dqn.watch.episode": "回合"
 * "dqn.watch.score": "分数"
 * "dqn.watch.epsilon": "探索率"
 * "dqn.watch.loss": "损失"
 * "dqn.watch.replaySize": "经验池"
 * "dqn.watch.bestEp": "最佳回合"
 * "dqn.watch.hyperparams": "超参数"
 * "dqn.watch.learningRate": "学习率"
 * "dqn.watch.epsilonSlider": "Epsilon（探索率）"
 * "dqn.watch.bufferSize": "经验池大小"
 * "dqn.watch.replaySample": "回放记忆"
 * "dqn.watch.rewardChart": "回合奖励"
 * "dqn.watch.continue": "准备好挑战了！"
 */
