/**
 * DQNMeet — "Meet the Algorithm" step for Port Deep.
 *
 * A 6-slide explanation of DQN concepts using 9th-grade-friendly language
 * and visual metaphors.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';

interface DQNMeetProps {
  onComplete: () => void;
}

const TOTAL_SLIDES = 6;

function NeuralNetworkDiagram() {
  // Simple SVG diagram of input -> hidden -> output
  return (
    <svg
      viewBox="0 0 300 160"
      className="w-full max-w-sm mx-auto"
      role="img"
      aria-label="Neural network diagram: input layer with 5 nodes, hidden layer with 4 nodes, output layer with 3 nodes"
    >
      {/* Input layer */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 20 + i * 28;
        return (
          <g key={`in-${i}`}>
            {/* Connections to hidden */}
            {[0, 1, 2, 3].map((j) => (
              <line
                key={`c1-${i}-${j}`}
                x1={50}
                y1={y}
                x2={150}
                y2={25 + j * 36}
                stroke="rgba(0,212,255,0.2)"
                strokeWidth={1}
              />
            ))}
            <circle cx={50} cy={y} r={8} fill="#00d4ff" opacity={0.8} />
          </g>
        );
      })}

      {/* Hidden layer */}
      {[0, 1, 2, 3].map((j) => {
        const y = 25 + j * 36;
        return (
          <g key={`hid-${j}`}>
            {/* Connections to output */}
            {[0, 1, 2].map((k) => (
              <line
                key={`c2-${j}-${k}`}
                x1={150}
                y1={y}
                x2={250}
                y2={35 + k * 42}
                stroke="rgba(255,215,0,0.2)"
                strokeWidth={1}
              />
            ))}
            <circle cx={150} cy={y} r={8} fill="#fbbf24" opacity={0.8} />
          </g>
        );
      })}

      {/* Output layer */}
      {[0, 1, 2].map((k) => {
        const y = 35 + k * 42;
        const labels = ['Left', 'Stay', 'Right'];
        return (
          <g key={`out-${k}`}>
            <circle cx={250} cy={y} r={8} fill="#4ade80" opacity={0.8} />
            <text x={270} y={y + 4} fill="#e2e8f0" fontSize={10} fontFamily="monospace">
              {labels[k]}
            </text>
          </g>
        );
      })}

      {/* Labels */}
      <text x={50} y={158} fill="#00d4ff" fontSize={9} textAnchor="middle" fontFamily="monospace">
        Input
      </text>
      <text x={150} y={158} fill="#fbbf24" fontSize={9} textAnchor="middle" fontFamily="monospace">
        Hidden
      </text>
      <text x={250} y={158} fill="#4ade80" fontSize={9} textAnchor="middle" fontFamily="monospace">
        Q-Values
      </text>
    </svg>
  );
}

function ReplayBufferDiagram() {
  // Visual of shuffled memory cards
  const memories = [
    { emoji: '😊', label: '+1', bg: '#4ade80' },
    { emoji: '😤', label: '-1', bg: '#f87171' },
    { emoji: '😊', label: '+1', bg: '#4ade80' },
    { emoji: '😐', label: '0', bg: '#708090' },
    { emoji: '😊', label: '+2', bg: '#ffd700' },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2 items-center">
        {memories.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center w-12 h-16 rounded-sm pixel-border text-center"
            style={{
              backgroundColor: `${m.bg}22`,
              transform: `rotate(${(i - 2) * 5}deg)`,
            }}
          >
            <span className="text-lg">{m.emoji}</span>
            <span className="font-pixel text-[9px]" style={{ color: m.bg }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <div className="font-pixel text-xs text-[#708090]">
        Shuffled memories
      </div>
    </div>
  );
}

function TargetNetworkDiagram() {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-sm pixel-border flex items-center justify-center bg-[rgba(0,212,255,0.1)]">
          <span className="text-2xl">🎓</span>
        </div>
        <span className="font-pixel text-[10px] text-[#00d4ff]">Student</span>
        <span className="font-body text-xs text-[#708090]">Updates every step</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel text-lg text-[#ffd700]">--&gt;</span>
        <span className="font-pixel text-[8px] text-[#708090]">copies every N steps</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-sm pixel-border-gold flex items-center justify-center bg-[rgba(255,215,0,0.1)]">
          <span className="text-2xl">🧑‍🏫</span>
        </div>
        <span className="font-pixel text-[10px] text-[#ffd700]">Teacher</span>
        <span className="font-body text-xs text-[#708090]">Stays stable</span>
      </div>
    </div>
  );
}

export function DQNMeet({ onComplete }: DQNMeetProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  const nextSlide = useCallback(() => {
    if (slide < TOTAL_SLIDES - 1) {
      setSlide((s) => s + 1);
    } else {
      onComplete();
    }
  }, [slide, onComplete]);

  const prevSlide = useCallback(() => {
    setSlide((s) => Math.max(0, s - 1));
  }, []);

  const slides = [
    // Slide 0: The Q-table is too big
    {
      titleKey: 'dqn.meet.slide1.title',
      contentKey: 'dqn.meet.slide1.content',
      visual: (
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-6 gap-[2px]">
            {Array.from({ length: 48 }).map((_, i) => {
              // Deterministic pseudo-random opacity based on index
              const opacity = 0.1 + ((i * 7 + 3) % 10) * 0.05;
              return (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: `rgba(0,212,255,${opacity})`,
                  }}
                />
              );
            })}
          </div>
          <div className="font-pixel text-xs text-[#f87171]">
            {t('dqn.meet.slide1.tooBig')}
          </div>
        </div>
      ),
    },
    // Slide 1: Neural network intro
    {
      titleKey: 'dqn.meet.slide2.title',
      contentKey: 'dqn.meet.slide2.content',
      visual: <NeuralNetworkDiagram />,
    },
    // Slide 2: Experience Replay
    {
      titleKey: 'dqn.meet.slide3.title',
      contentKey: 'dqn.meet.slide3.content',
      visual: <ReplayBufferDiagram />,
    },
    // Slide 3: Target Network
    {
      titleKey: 'dqn.meet.slide4.title',
      contentKey: 'dqn.meet.slide4.content',
      visual: <TargetNetworkDiagram />,
    },
    // Slide 4: How it all works together
    {
      titleKey: 'dqn.meet.slide5.title',
      contentKey: 'dqn.meet.slide5.content',
      visual: (
        <div className="flex flex-col items-center gap-2">
          {[
            { step: '1', text: t('dqn.meet.slide5.step1'), color: '#00d4ff' },
            { step: '2', text: t('dqn.meet.slide5.step2'), color: '#fbbf24' },
            { step: '3', text: t('dqn.meet.slide5.step3'), color: '#4ade80' },
            { step: '4', text: t('dqn.meet.slide5.step4'), color: '#ffd700' },
          ].map(({ step, text, color }) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-pixel text-[10px]"
                style={{ backgroundColor: `${color}33`, color }}
              >
                {step}
              </div>
              <span className="font-body text-base text-[#e2e8f0]">{text}</span>
            </div>
          ))}
        </div>
      ),
    },
    // Slide 5: Summary
    {
      titleKey: 'dqn.meet.slide6.title',
      contentKey: 'dqn.meet.slide6.content',
      visual: (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {[
            { label: 'Q-Learning', icon: '🗺️', color: '#00d4ff' },
            { label: 'Neural Net', icon: '🧠', color: '#fbbf24' },
            { label: 'Replay', icon: '📓', color: '#4ade80' },
            { label: 'Target Net', icon: '🧑‍🏫', color: '#ffd700' },
          ].map(({ label, icon, color }) => (
            <PixelPanel key={label} className="px-3 py-2 text-center">
              <span className="text-xl block">{icon}</span>
              <span className="font-pixel text-[9px] block mt-1" style={{ color }}>
                {label}
              </span>
            </PixelPanel>
          ))}
        </div>
      ),
    },
  ];

  const currentSlide = slides[slide];

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
      {/* Progress dots */}
      <div className="flex gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === slide
                ? 'bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                : i < slide
                  ? 'bg-[#4ade80]'
                  : 'bg-[#1e2448]'
            }`}
          />
        ))}
      </div>

      <PixelPanel className="w-full min-h-[340px] flex flex-col justify-between">
        <div>
          <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-4 text-center">
            {t(currentSlide.titleKey)}
          </h3>
          <p className="font-body text-lg text-[#e2e8f0] mb-6 text-center leading-relaxed">
            {t(currentSlide.contentKey)}
          </p>
        </div>

        <div className="flex justify-center my-4">{currentSlide.visual}</div>

        <div className="flex items-center justify-between mt-4">
          <span className="font-pixel text-[10px] text-[#708090]">
            {slide + 1} / {TOTAL_SLIDES}
          </span>
        </div>
      </PixelPanel>

      <div className="flex gap-4">
        <PixelButton
          size="sm"
          variant="secondary"
          onClick={prevSlide}
          disabled={slide === 0}
        >
          {t('common.back')}
        </PixelButton>
        <PixelButton size="md" variant="primary" onClick={nextSlide}>
          {slide < TOTAL_SLIDES - 1 ? t('common.next') : t('dqn.meet.letsWatch')}
        </PixelButton>
      </div>
    </div>
  );
}

/*
 * i18n keys used:
 *
 * EN:
 * "dqn.meet.letsWatch": "Let's Watch It Learn!"
 * "dqn.meet.slide1.title": "The Map Is Too Big!"
 * "dqn.meet.slide1.content": "Remember Q-Learning's treasure map? For a pixel game, the map would need MILLIONS of entries — one for every possible screen. We can't draw that by hand!"
 * "dqn.meet.slide1.tooBig": "Millions of cells... impossible!"
 * "dqn.meet.slide2.title": "Meet the Pattern Matcher"
 * "dqn.meet.slide2.content": "Instead of a giant table, we use a neural network — a pattern-matching machine. Give it the game screen, and it tells you how good each action is. It's like having a smart assistant who can read any map!"
 * "dqn.meet.slide3.title": "Studying from a Shuffled Notebook"
 * "dqn.meet.slide3.content": "You know how shuffling flashcards helps you study better? The AI keeps a notebook of memories and studies them in random order. This is called Experience Replay — it prevents the AI from only remembering the last thing that happened."
 * "dqn.meet.slide4.title": "Having a Stable Teacher"
 * "dqn.meet.slide4.content": "Imagine if your teacher's answers changed every second — confusing, right? DQN keeps a stable 'teacher' network that only updates occasionally. The 'student' learns fast, then the teacher slowly catches up."
 * "dqn.meet.slide5.title": "How It All Works Together"
 * "dqn.meet.slide5.content": "DQN combines four ideas into one powerful learner:"
 * "dqn.meet.slide5.step1": "Play the game and remember what happened"
 * "dqn.meet.slide5.step2": "Shuffle memories and study a random batch"
 * "dqn.meet.slide5.step3": "Use the neural network to predict Q-values"
 * "dqn.meet.slide5.step4": "Periodically copy to the stable teacher"
 * "dqn.meet.slide6.title": "DQN = Q-Learning + Brain Power"
 * "dqn.meet.slide6.content": "Deep Q-Network takes Q-Learning's idea of 'scoring every action' and supercharges it with a neural network, shuffled studying, and a stable teacher. Let's see it in action!"
 *
 * ZH:
 * "dqn.meet.letsWatch": "来看它学习吧！"
 * "dqn.meet.slide1.title": "地图太大了！"
 * "dqn.meet.slide1.content": "还记得Q学习的寻宝图吗？对于一个像素游戏，这张图需要数百万个格子——每个可能的画面一个。我们不可能手工画出来！"
 * "dqn.meet.slide1.tooBig": "数百万个格子...不可能！"
 * "dqn.meet.slide2.title": "认识模式匹配器"
 * "dqn.meet.slide2.content": "我们用一个神经网络代替巨大的表格——一台模式匹配机器。给它游戏画面，它就告诉你每个动作有多好。就像有一个能看懂任何地图的聪明助手！"
 * "dqn.meet.slide3.title": "从打乱的笔记本中学习"
 * "dqn.meet.slide3.content": "你知道打乱闪卡能帮你更好地复习吗？AI保留一本记忆笔记本，随机顺序复习。这叫做经验回放——它防止AI只记住最后发生的事。"
 * "dqn.meet.slide4.title": "有一个稳定的老师"
 * "dqn.meet.slide4.content": "想象你的老师每秒都在变——很混乱，对吧？DQN保留一个稳定的'老师'网络，只偶尔更新。'学生'快速学习，然后老师慢慢跟上。"
 * "dqn.meet.slide5.title": "如何配合工作"
 * "dqn.meet.slide5.content": "DQN把四个想法组合成一个强大的学习者："
 * "dqn.meet.slide5.step1": "玩游戏，记住发生了什么"
 * "dqn.meet.slide5.step2": "打乱记忆，随机抽取一批学习"
 * "dqn.meet.slide5.step3": "用神经网络预测Q值"
 * "dqn.meet.slide5.step4": "定期复制给稳定的老师"
 * "dqn.meet.slide6.title": "DQN = Q学习 + 大脑升级"
 * "dqn.meet.slide6.content": "深度Q网络用Q学习'给每个动作打分'的思路，加上神经网络、随机复习和稳定老师来增强它。来看看它的表现吧！"
 */
