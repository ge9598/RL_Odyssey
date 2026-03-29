import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_SLIDES = 6;
const MINI_CONFIG = GRID_CONFIGS.miniDemo;

// ─── Component ──────────────────────────────────────────────────────────────

export function QTableMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  // Interactive demo state for slide 3 (mini 3x3 grid Q-learning step-by-step)
  const demoEnvRef = useRef(new GridWorldEnvironment(MINI_CONFIG));
  const demoAgentRef = useRef(new QLearningAlgorithm(MINI_CONFIG.rows * MINI_CONFIG.cols, 4, 88888));
  const [demoQTable, setDemoQTable] = useState<number[][]>(
    Array.from({ length: 9 }, () => [0, 0, 0, 0]),
  );
  const [demoPlayerPos, setDemoPlayerPos] = useState(MINI_CONFIG.start);
  const [demoStep, setDemoStep] = useState(0);
  const [demoEpisode, setDemoEpisode] = useState(0);
  const demoRunning = useRef(false);
  const demoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Learning rate slider for slide 4
  const [demoLR, setDemoLR] = useState(0.1);
  const [lrDemoValues, setLrDemoValues] = useState<[number, number, number]>([0, 0, 0]);

  // Run the mini demo step-by-step
  const runMiniDemo = useCallback(() => {
    if (demoRunning.current) return;
    demoRunning.current = true;

    // Reset
    const env = new GridWorldEnvironment(MINI_CONFIG);
    demoEnvRef.current = env;
    const agent = new QLearningAlgorithm(9, 4, 88888);
    agent.setHyperparameter('learningRate', 0.3);
    agent.setHyperparameter('epsilon', 0.3);
    demoAgentRef.current = agent;

    let state = env.reset();
    let step = 0;
    let episode = 0;

    setDemoPlayerPos(state);
    setDemoStep(0);
    setDemoEpisode(0);
    setDemoQTable(Array.from({ length: 9 }, () => [0, 0, 0, 0]));

    const tick = () => {
      if (!demoRunning.current || step > 60) {
        demoRunning.current = false;
        return;
      }

      const { action } = agent.step(state);
      const result = env.step(state, action);
      agent.update({
        state,
        action,
        reward: result.reward,
        nextState: result.nextState,
        done: result.done,
      });

      state = result.nextState;
      step += 1;
      setDemoPlayerPos(state);
      setDemoStep(step);

      // Update displayed Q-table
      const viz = agent.getVisualizationData();
      const qt = viz.data as { qTable: number[][] };
      setDemoQTable(qt.qTable.map((row) => [...row]));

      if (result.done) {
        // Reset for next episode
        state = env.reset();
        episode += 1;
        setDemoEpisode(episode);
        setDemoPlayerPos(state);
        agent.startEpisode();
      }

      demoTimeout.current = setTimeout(tick, 350);
    };

    demoTimeout.current = setTimeout(tick, 300);
  }, []);

  // Start demo when slide 3 is reached
  useEffect(() => {
    if (slide === 3) {
      demoRunning.current = false;
      if (demoTimeout.current) clearTimeout(demoTimeout.current);
      setTimeout(() => runMiniDemo(), 0);
    }
    return () => {
      if (slide !== 3) {
        demoRunning.current = false;
        if (demoTimeout.current) clearTimeout(demoTimeout.current);
      }
    };
  }, [slide, runMiniDemo]);

  // Learning rate demo for slide 4
  useEffect(() => {
    if (slide !== 4) return;

    // Show how different learning rates update a value:
    // Old Q = 2.0, reward = 5.0, target (R + gamma*maxQ') = 5.0 + 0.95*0 = 5.0
    const oldQ = 2.0;
    const target = 5.0;
    const lr = demoLR;
    const newQ = oldQ + lr * (target - oldQ);
    const change = newQ - oldQ;
    setLrDemoValues([
      Math.round(oldQ * 100) / 100,
      Math.round(change * 100) / 100,
      Math.round(newQ * 100) / 100,
    ]);
  }, [slide, demoLR]);

  // Cleanup
  useEffect(() => {
    return () => {
      demoRunning.current = false;
      if (demoTimeout.current) clearTimeout(demoTimeout.current);
    };
  }, []);

  const nextSlide = () => {
    if (slide < TOTAL_SLIDES - 1) {
      setSlide((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (slide > 0) setSlide((s) => s - 1);
  };

  // ─── Slide content ──────────────────────────────────────────────────────

  const slides = [
    // Slide 0: Opening
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">{'🗺️'}</div>
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
        {t('qtable.meet.title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto">
        {t('qtable.meet.slide0')}
      </p>
    </PixelPanel>,

    // Slide 1: Q-table concept
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">
        {t('qtable.meet.slide1title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">
        {t('qtable.meet.slide1a')}
      </p>

      {/* Visual Q-table representation */}
      <div className="glass-panel pixel-border p-4 mb-4 overflow-x-auto">
        <table className="mx-auto font-body text-sm">
          <thead>
            <tr>
              <th className="px-3 py-1 text-[#708090]">{t('qtable.meet.tablePosition')}</th>
              <th className="px-3 py-1 text-[#00d4ff]">{t('qtable.meet.tableUp')}</th>
              <th className="px-3 py-1 text-[#00d4ff]">{t('qtable.meet.tableRight')}</th>
              <th className="px-3 py-1 text-[#00d4ff]">{t('qtable.meet.tableDown')}</th>
              <th className="px-3 py-1 text-[#00d4ff]">{t('qtable.meet.tableLeft')}</th>
            </tr>
          </thead>
          <tbody>
            {['(0,0)', '(0,1)', '(1,0)', '...'].map((pos, i) => (
              <tr key={i}>
                <td className="px-3 py-1 text-[#e2e8f0]">{pos}</td>
                {i < 3 ? (
                  <>
                    <td className="px-3 py-1 text-[#4ade80]">{(Math.random() * 5).toFixed(1)}</td>
                    <td className="px-3 py-1 text-[#ffd700]">{(Math.random() * 8).toFixed(1)}</td>
                    <td className="px-3 py-1 text-[#f87171]">{(-Math.random() * 3).toFixed(1)}</td>
                    <td className="px-3 py-1 text-[#4ade80]">{(Math.random() * 4).toFixed(1)}</td>
                  </>
                ) : (
                  <td colSpan={4} className="px-3 py-1 text-[#708090] text-center">...</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-base text-[#708090]">
        {t('qtable.meet.slide1b')}
      </p>
    </PixelPanel>,

    // Slide 2: Bellman idea
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">
        {t('qtable.meet.slide2title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">
        {t('qtable.meet.slide2a')}
      </p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-body text-lg text-[#00d4ff] text-center">
          {t('qtable.meet.slide2b')}
        </p>
      </div>
      <p className="font-body text-base text-[#e2e8f0] mb-3">
        {t('qtable.meet.slide2c')}
      </p>
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-xs text-[#ffd700] glow-gold text-center">
          Q(here, go right) = reward now + best future from there
        </p>
      </div>
    </PixelPanel>,

    // Slide 3: Interactive mini demo
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-2">
        {t('qtable.meet.slide3title')}
      </h3>
      <p className="font-body text-base text-[#e2e8f0] mb-3">
        {t('qtable.meet.slide3desc', { step: demoStep, episode: demoEpisode })}
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <div className="flex-shrink-0">
          <GridWorld
            rows={MINI_CONFIG.rows}
            cols={MINI_CONFIG.cols}
            walls={MINI_CONFIG.walls}
            traps={MINI_CONFIG.traps}
            treasures={MINI_CONFIG.treasures}
            exit={MINI_CONFIG.exit}
            playerPos={demoPlayerPos}
            qValues={demoQTable}
            showHeatmap
            showArrows
            mode="auto"
          />
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] mt-3 text-center">
        {t('qtable.meet.slide3note')}
      </p>
    </PixelPanel>,

    // Slide 4: Learning rate slider
    <PixelPanel key="s4">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
        {t('qtable.meet.slide4title')}
      </h3>
      <p className="font-body text-base text-[#e2e8f0] mb-4">
        {t('qtable.meet.slide4desc')}
      </p>

      <div className="max-w-md mx-auto mb-4">
        <PixelSlider
          label={t('qtable.meet.learningRate')}
          value={demoLR}
          min={0.01}
          max={1.0}
          step={0.01}
          onChange={setDemoLR}
          displayValue={`${(demoLR * 100).toFixed(0)}%`}
        />
      </div>

      {/* Visual update demo */}
      <div className="glass-panel pixel-border p-4 max-w-md mx-auto mb-4">
        <div className="flex items-center justify-between text-center gap-3">
          <div>
            <span className="font-pixel text-[10px] text-[#708090] block">{t('qtable.meet.oldValue')}</span>
            <span className="font-pixel text-sm text-[#e2e8f0]">{lrDemoValues[0]}</span>
          </div>
          <div className="font-pixel text-lg text-[#ffd700]">+</div>
          <div>
            <span className="font-pixel text-[10px] text-[#708090] block">{t('qtable.meet.change')}</span>
            <span className={`font-pixel text-sm ${lrDemoValues[1] >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
              {lrDemoValues[1] >= 0 ? '+' : ''}{lrDemoValues[1]}
            </span>
          </div>
          <div className="font-pixel text-lg text-[#ffd700]">=</div>
          <div>
            <span className="font-pixel text-[10px] text-[#708090] block">{t('qtable.meet.newValue')}</span>
            <span className="font-pixel text-sm text-[#00d4ff] glow-accent">{lrDemoValues[2]}</span>
          </div>
        </div>
      </div>

      <p className="font-body text-base text-[#e2e8f0] text-center">
        {demoLR < 0.1
          ? t('qtable.meet.lrLow')
          : demoLR > 0.7
            ? t('qtable.meet.lrHigh')
            : t('qtable.meet.lrMedium')}
      </p>
    </PixelPanel>,

    // Slide 5: Summary
    <PixelPanel key="s5" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">
        {t('qtable.meet.slide5title')}
      </h3>
      <div className="flex flex-col items-center gap-4">
        <p className="font-body text-xl text-[#e2e8f0] text-center max-w-lg">
          {t('qtable.meet.slide5desc')}
        </p>
        <div className="glass-panel pixel-border p-4 max-w-md">
          <p className="font-pixel text-xs text-[#00d4ff] glow-accent text-center">
            Q(s, a) += lr * (reward + gamma * max Q(s', a') - Q(s, a))
          </p>
        </div>
        <p className="font-body text-base text-[#708090] text-center">
          {t('qtable.meet.slide5ready')}
        </p>
      </div>
    </PixelPanel>,
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i === slide
                ? 'bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                : i < slide
                  ? 'bg-[#00d4ff]/40'
                  : 'bg-[#1e2448]'
            }`}
          />
        ))}
      </div>

      {/* Current slide */}
      {slides[slide]}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <PixelButton
          size="sm"
          variant="secondary"
          onClick={prevSlide}
          disabled={slide === 0}
        >
          ← {t('common.back')}
        </PixelButton>

        <div className="flex gap-3">
          {onSkip && (
            <PixelButton size="sm" variant="secondary" onClick={onSkip}>
              {t('common.skip')}
            </PixelButton>
          )}
          <PixelButton onClick={nextSlide}>
            {t('common.next')} →
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

/*
 * -- i18n KEYS NEEDED --
 *
 * English:
 * qtable.meet.title          = "Meet Q-Learning"
 * qtable.meet.slide0         = "What if you could draw a map of how good each direction is at every spot? That's exactly what Q-Learning does!"
 * qtable.meet.slide1title    = "The Q-Table: Your Treasure Map"
 * qtable.meet.slide1a        = "Imagine a big spreadsheet. Each row is a position on the grid. Each column is a direction (up, right, down, left). The numbers inside are scores — how good is it to go that direction from that spot?"
 * qtable.meet.slide1b        = "At the start, all scores are 0 — the agent knows nothing. As it explores, the scores fill in based on experience."
 * qtable.meet.tablePosition  = "Position"
 * qtable.meet.tableUp        = "Up"
 * qtable.meet.tableRight     = "Right"
 * qtable.meet.tableDown      = "Down"
 * qtable.meet.tableLeft      = "Left"
 * qtable.meet.slide2title    = "Ask Your Future Self for Advice"
 * qtable.meet.slide2a        = "Here's the clever part: when you get a reward, don't just update THIS spot. Also peek at the next spot and ask: 'What's the best thing I can do from there?'"
 * qtable.meet.slide2b        = "It's like asking a friend who already explored ahead: 'Hey, if I go right, what's the best score I can get from there?'"
 * qtable.meet.slide2c        = "This is called the Bellman equation — a fancy name for a simple idea:"
 * qtable.meet.slide3title    = "Watch It Learn Step by Step"
 * qtable.meet.slide3desc     = "Step {{step}} | Episode {{episode}} — Watch the Q-values (colors) update in real-time on this tiny 3x3 grid!"
 * qtable.meet.slide3note     = "Warm colors = high value, cool colors = low value. Arrows show the best action per cell."
 * qtable.meet.slide4title    = "How Fast Should It Learn?"
 * qtable.meet.slide4desc     = "The learning rate controls how much each experience changes the Q-table. Too fast = chaotic. Too slow = takes forever."
 * qtable.meet.learningRate   = "Learning Rate (alpha)"
 * qtable.meet.oldValue       = "Old Q"
 * qtable.meet.change         = "Change"
 * qtable.meet.newValue       = "New Q"
 * qtable.meet.lrLow          = "Very cautious! Each experience barely changes the map. Stable, but slow to learn."
 * qtable.meet.lrHigh         = "Very aggressive! The map swings wildly with each experience. Fast but chaotic."
 * qtable.meet.lrMedium       = "A nice balance. The map updates steadily without overreacting."
 * qtable.meet.slide5title    = "Q-Learning: Build a Complete Treasure Map!"
 * qtable.meet.slide5desc     = "Q-Learning builds a complete map of the best moves. Given enough exploration, it finds the optimal path through any grid world."
 * qtable.meet.slide5ready    = "Ready to watch Q-Learning tackle a real maze? Let's go!"
 *
 * Chinese:
 * qtable.meet.title          = "认识 Q-Learning"
 * qtable.meet.slide0         = "如果你能画一张地图，标注每个位置每个方向有多好呢？这正是 Q-Learning 做的事！"
 * qtable.meet.slide1title    = "Q 表：你的寻宝图"
 * qtable.meet.slide1a        = "想象一个大表格。每一行是网格上的一个位置。每一列是一个方向（上、右、下、左）。里面的数字是分数——从那个位置走那个方向有多好？"
 * qtable.meet.slide1b        = "一开始所有分数都是 0——智能体什么都不知道。随着探索，分数会根据经验逐渐填上。"
 * qtable.meet.tablePosition  = "位置"
 * qtable.meet.tableUp        = "上"
 * qtable.meet.tableRight     = "右"
 * qtable.meet.tableDown      = "下"
 * qtable.meet.tableLeft      = "左"
 * qtable.meet.slide2title    = "向未来的自己求助"
 * qtable.meet.slide2a        = "聪明之处在于：当你获得奖励时，不只是更新当前位置。还要看看下一个位置，问：'从那里我能做的最好是什么？'"
 * qtable.meet.slide2b        = "就像问一个已经探索过前方的朋友：'嘿，如果我往右走，从那里我能得到的最好分数是多少？'"
 * qtable.meet.slide2c        = "这叫贝尔曼方程——一个简单想法的花哨名字："
 * qtable.meet.slide3title    = "一步一步看它学习"
 * qtable.meet.slide3desc     = "第 {{step}} 步 | 第 {{episode}} 轮——在这个小小的 3x3 网格上实时观察 Q 值（颜色）更新！"
 * qtable.meet.slide3note     = "暖色 = 高价值，冷色 = 低价值。箭头表示每个格子的最佳动作。"
 * qtable.meet.slide4title    = "学得多快合适？"
 * qtable.meet.slide4desc     = "学习率控制每次经验对 Q 表的改变幅度。太快 = 混乱。太慢 = 太花时间。"
 * qtable.meet.learningRate   = "学习率 (alpha)"
 * qtable.meet.oldValue       = "旧 Q 值"
 * qtable.meet.change         = "变化"
 * qtable.meet.newValue       = "新 Q 值"
 * qtable.meet.lrLow          = "非常谨慎！每次经验几乎不改变地图。稳定但学得慢。"
 * qtable.meet.lrHigh         = "非常激进！地图每次经验都剧烈变化。快但混乱。"
 * qtable.meet.lrMedium       = "不错的平衡。地图稳步更新，不会过度反应。"
 * qtable.meet.slide5title    = "Q-Learning：构建一张完整的寻宝图！"
 * qtable.meet.slide5desc     = "Q-Learning 构建一张完整的最佳路径地图。只要有足够的探索，它能找到任何网格世界的最优路径。"
 * qtable.meet.slide5ready    = "准备好看 Q-Learning 挑战真正的迷宫了吗？走吧！"
 */
