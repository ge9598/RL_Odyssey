/**
 * DQNFeel — "Feel the Problem" step for Port Deep.
 *
 * Player plays Breakout manually for 60 seconds or until game over.
 * Their score is recorded and used as the benchmark in the Quest.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { PixelBreakout } from '@/environments/PixelBreakout';

interface DQNFeelProps {
  onComplete: (playerScore: number) => void;
}

export function DQNFeel({ onComplete }: DQNFeelProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<number | null>(null);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setPhase('done');
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startPlaying = useCallback(() => {
    setPhase('playing');
    setTimeLeft(60);
    setScore(0);
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  // Track score from steps
  const handleStep = useCallback(
    (_state: number[], _reward: number, _done: boolean, currentScore: number) => {
      setScore(currentScore);
    },
    [],
  );

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center gap-6">
        <PixelPanel className="max-w-xl text-center">
          <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-4">
            {t('dqn.feel.title')}
          </h3>
          <p className="font-body text-lg text-[#e2e8f0] mb-4">
            {t('dqn.feel.intro')}
          </p>
          <p className="font-body text-base text-[#708090]">
            {t('dqn.feel.controls')}
          </p>
        </PixelPanel>
        <PixelButton onClick={startPlaying} variant="gold" size="lg">
          {t('dqn.feel.startButton')}
        </PixelButton>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-6">
        <PixelPanel className="max-w-xl text-center">
          <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-4">
            {t('dqn.feel.resultTitle')}
          </h3>
          <p className="font-body text-3xl text-[#00d4ff] mb-4 glow-accent">
            {t('dqn.feel.yourScore')}: <span className="text-[#ffd700] glow-gold">{score}</span>
          </p>
          <p className="font-body text-lg text-[#e2e8f0]">
            {t('dqn.feel.resultMessage')}
          </p>
        </PixelPanel>
        <PixelButton onClick={() => onComplete(score)} variant="primary" size="lg">
          {t('common.next')}
        </PixelButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <PixelPanel className="px-4 py-2">
          <span className="font-pixel text-xs text-[#ffd700]">
            {t('dqn.feel.score')}: {score}
          </span>
        </PixelPanel>
        <PixelPanel className="px-4 py-2">
          <span className="font-pixel text-xs text-[#00d4ff]">
            {t('dqn.feel.time')}: {timeLeft}s
          </span>
        </PixelPanel>
      </div>

      <PixelBreakout
        mode="manual"
        width={320}
        height={400}
        onStep={handleStep}
        onGameOver={handleGameOver}
      />

      <p className="font-body text-sm text-[#708090]">
        {t('dqn.feel.controlHint')}
      </p>
    </div>
  );
}

/*
 * i18n keys used:
 *
 * EN:
 * "dqn.feel.title": "Feel the Problem"
 * "dqn.feel.intro": "Try to break all the bricks! Use the paddle to bounce the ball. Can you clear the board?"
 * "dqn.feel.controls": "Use arrow keys or move your mouse to control the paddle."
 * "dqn.feel.startButton": "Start Playing!"
 * "dqn.feel.score": "Score"
 * "dqn.feel.time": "Time"
 * "dqn.feel.controlHint": "Arrow keys or mouse to move paddle"
 * "dqn.feel.resultTitle": "Nice Try!"
 * "dqn.feel.yourScore": "Your Score"
 * "dqn.feel.resultMessage": "Now let's see if a neural network can learn to beat you!"
 *
 * ZH:
 * "dqn.feel.title": "感受问题"
 * "dqn.feel.intro": "试试打碎所有砖块！用挡板弹球。你能清空整个板吗？"
 * "dqn.feel.controls": "用方向键或鼠标来控制挡板。"
 * "dqn.feel.startButton": "开始游戏！"
 * "dqn.feel.score": "分数"
 * "dqn.feel.time": "时间"
 * "dqn.feel.controlHint": "方向键或鼠标移动挡板"
 * "dqn.feel.resultTitle": "不错的尝试！"
 * "dqn.feel.yourScore": "你的分数"
 * "dqn.feel.resultMessage": "现在让我们看看神经网络能不能学会打败你！"
 */
