import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { TreasureChests } from '@/environments/TreasureChests';
import { BanditEnvironment } from '@/algorithms/bandit';
import { argmax } from '@/utils/math';
import type { PortStepProps } from '@/config/ports';

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Constants ──────────────────────────────────────────────────────────────
const NUM_CHESTS = 5;
const TOTAL_SLIDES = 6;

// ─── Component ──────────────────────────────────────────────────────────────

export function BanditMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  // Demo env for the "pure greedy fails" animation
  const envRef = useRef(new BanditEnvironment(NUM_CHESTS, 77777));

  // Greedy demo state
  const [greedyCounts, setGreedyCounts] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [greedyValues, setGreedyValues] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [greedyRewards, setGreedyRewards] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [greedySelected, setGreedySelected] = useState<number | null>(null);
  const [greedyStep, setGreedyStep] = useState(0);
  const greedyRunning = useRef(false);
  const greedyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Epsilon demo state
  const [epsilon, setEpsilon] = useState(0.1);

  // Computed epsilon explanation (replaces the effect + state pattern)
  const epsilonDemoText = useMemo(() => {
    const pctExplore = Math.round(epsilon * 100);
    const pctExploit = 100 - pctExplore;
    return t('bandit.meet.epsilonExplain', {
      explore: pctExplore,
      exploit: pctExploit,
    });
  }, [epsilon, t]);

  // Greedy demo runner — resets internal state and runs the demo
  const runGreedyDemo = useCallback(() => {
    if (greedyRunning.current) return;
    greedyRunning.current = true;

    // Reset environment
    envRef.current = new BanditEnvironment(NUM_CHESTS, 77777);
    const env = envRef.current;

    const counts = new Array(NUM_CHESTS).fill(0) as number[];
    const totals = new Array(NUM_CHESTS).fill(0) as number[];
    const values = new Array(NUM_CHESTS).fill(0) as number[];
    let step = 0;

    // Reset displayed state at tick 0
    setGreedyCounts(new Array(NUM_CHESTS).fill(0));
    setGreedyValues(new Array(NUM_CHESTS).fill(0));
    setGreedyRewards(new Array(NUM_CHESTS).fill(0));
    setGreedySelected(null);
    setGreedyStep(0);

    const tick = () => {
      if (step >= 15) {
        greedyRunning.current = false;
        return;
      }

      // Greedy: pick the arm with highest value
      let action: number;
      if (step < NUM_CHESTS) {
        // First round: try each once
        action = step;
      } else {
        action = argmax(values);
      }

      const reward = env.pull(action);
      counts[action] += 1;
      totals[action] += reward;
      values[action] = totals[action] / counts[action];

      setGreedySelected(action);
      setGreedyCounts([...counts]);
      setGreedyValues([...values]);
      setGreedyRewards((prev) => {
        const next = [...prev];
        next[action] = reward;
        return next;
      });
      step += 1;
      setGreedyStep(step);

      greedyTimeout.current = setTimeout(tick, 500);
    };

    // Start with a small delay so the component has rendered
    greedyTimeout.current = setTimeout(tick, 300);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (greedyTimeout.current) clearTimeout(greedyTimeout.current);
      greedyRunning.current = false;
    };
  }, []);

  // Start greedy demo when we reach slide 2
  // The setState calls happen inside setTimeout callbacks (not synchronously in the effect)
  useEffect(() => {
    if (slide === 2) {
      // Stop any existing run
      greedyRunning.current = false;
      if (greedyTimeout.current) clearTimeout(greedyTimeout.current);

      // Kick off the demo via setTimeout so setState is not synchronous in effect
      setTimeout(() => runGreedyDemo(), 0);
    }
  }, [slide, runGreedyDemo]);

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
    // Slide 0: Opening question
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">🎁</div>
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
        {t('bandit.meet.title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto">
        {t('bandit.meet.slide0')}
      </p>
    </PixelPanel>,

    // Slide 1: The greedy approach
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">
        {t('bandit.meet.slide1title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-2">
        {t('bandit.meet.slide1a')}
      </p>
      <p className="font-body text-lg text-[#708090]">
        {t('bandit.meet.slide1b')}
      </p>
    </PixelPanel>,

    // Slide 2: Greedy demo (animated)
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#f87171] mb-2">
        {t('bandit.meet.slide2title')}
      </h3>
      <p className="font-body text-base text-[#e2e8f0] mb-3">
        {t('bandit.meet.slide2desc', { steps: greedyStep })}
      </p>
      <div className="pixel-border rounded p-1">
        <TreasureChests
          numChests={NUM_CHESTS}
          selectedChest={greedySelected}
          chestRewards={greedyRewards}
          chestCounts={greedyCounts}
          chestValues={greedyValues}
          isAnimating={false}
          mode="auto"
          highlightChest={greedySelected ?? undefined}
        />
      </div>
      <p className="font-body text-base text-[#708090] mt-3">
        {t('bandit.meet.slide2note')}
      </p>
    </PixelPanel>,

    // Slide 3: The exploration idea
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">
        {t('bandit.meet.slide3title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-3">
        {t('bandit.meet.slide3a')}
      </p>
      <div className="glass-panel pixel-border p-4 mb-3">
        <p className="font-body text-lg text-[#00d4ff]">
          {t('bandit.meet.slide3b')}
        </p>
      </div>
      <p className="font-body text-base text-[#e2e8f0]">
        {t('bandit.meet.slide3c')}
      </p>
    </PixelPanel>,

    // Slide 4: Interactive epsilon slider
    <PixelPanel key="s4">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
        {t('bandit.meet.slide4title')}
      </h3>
      <p className="font-body text-base text-[#e2e8f0] mb-4">
        {t('bandit.meet.slide4desc')}
      </p>

      <div className="max-w-md mx-auto mb-4">
        <PixelSlider
          label={`Epsilon (\u03B5)`}
          value={epsilon}
          min={0}
          max={1}
          step={0.05}
          onChange={setEpsilon}
          displayValue={`${(epsilon * 100).toFixed(0)}%`}
        />
      </div>

      <div className="flex justify-center gap-4 mb-4">
        {/* Visual bars: explore vs exploit */}
        <div className="flex items-end gap-1 h-20">
          <div className="flex flex-col items-center">
            <div
              className="w-16 bg-gradient-to-t from-[#00d4ff] to-[#33eaff] rounded-t transition-all duration-300"
              style={{ height: `${(1 - epsilon) * 80}px` }}
            />
            <span className="font-pixel text-[10px] text-[#00d4ff] mt-1">
              {t('bandit.meet.exploit')}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-16 bg-gradient-to-t from-[#ffd700] to-[#ffdf33] rounded-t transition-all duration-300"
              style={{ height: `${epsilon * 80}px` }}
            />
            <span className="font-pixel text-[10px] text-[#ffd700] mt-1">
              {t('bandit.meet.explore')}
            </span>
          </div>
        </div>
      </div>

      <p className="font-body text-lg text-[#e2e8f0] text-center">
        {epsilonDemoText}
      </p>

      {epsilon === 0 && (
        <p className="font-body text-base text-[#f87171] text-center mt-2">
          {t('bandit.meet.noExplore')}
        </p>
      )}
      {epsilon === 1 && (
        <p className="font-body text-base text-[#f87171] text-center mt-2">
          {t('bandit.meet.allExplore')}
        </p>
      )}
    </PixelPanel>,

    // Slide 5: Summary
    <PixelPanel key="s5" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">
        {t('bandit.meet.slide5title')}
      </h3>
      <div className="flex flex-col items-center gap-4">
        <p className="font-body text-xl text-[#e2e8f0] text-center max-w-lg">
          {t('bandit.meet.slide5desc')}
        </p>
        <div className="glass-panel pixel-border p-4 max-w-md">
          <p className="font-pixel text-xs text-[#00d4ff] glow-accent text-center">
            {t('bandit.meet.slide5formula')}
          </p>
        </div>
        <p className="font-body text-base text-[#708090] text-center">
          {t('bandit.meet.slide5ready')}
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
 * ── i18n KEYS NEEDED ──
 *
 * English:
 * bandit.meet.title          = "Meet the Algorithm"
 * bandit.meet.slide0         = "You have 5 treasure chests. How would you decide which one to open next?"
 * bandit.meet.slide1title    = "Strategy 1: Always Pick the Best"
 * bandit.meet.slide1a        = "Simple idea: always open the chest that has given the most gold so far."
 * bandit.meet.slide1b        = "But what if you got unlucky on your first try? You might miss the real best chest forever!"
 * bandit.meet.slide2title    = "Watch: Pure Greedy in Action"
 * bandit.meet.slide2desc     = "Step {{steps}}/15 — The greedy strategy only picks what looks best..."
 * bandit.meet.slide2note     = "Notice how it gets stuck on one chest? It never checks if other chests might be better."
 * bandit.meet.slide3title    = "Strategy 2: Explore Sometimes!"
 * bandit.meet.slide3a        = "What if you spent MOST of your turns on the best chest, but SOMETIMES tried a random one?"
 * bandit.meet.slide3b        = "Think of it like this: You usually eat at your favorite restaurant, but once in a while you try a new place. That's how you discovered your favorite in the first place!"
 * bandit.meet.slide3c        = "This balance between 'sticking with what works' and 'trying something new' is called the Exploration vs Exploitation tradeoff."
 * bandit.meet.slide4title    = "The Epsilon Slider"
 * bandit.meet.slide4desc     = "Epsilon controls how often the algorithm explores. Drag the slider to see the balance change:"
 * bandit.meet.exploit        = "Exploit"
 * bandit.meet.explore        = "Explore"
 * bandit.meet.epsilonExplain = "{{exploit}}% of the time: pick the best known chest. {{explore}}% of the time: try a random chest."
 * bandit.meet.noExplore      = "Zero exploration — you might miss the best chest forever!"
 * bandit.meet.allExplore     = "All random — you never use what you've learned!"
 * bandit.meet.slide5title    = "Epsilon-Greedy: Simple but Powerful"
 * bandit.meet.slide5desc     = "This strategy is called epsilon-greedy. With a small epsilon like 10%, you mostly exploit your knowledge but keep discovering."
 * bandit.meet.slide5formula  = "With probability epsilon: explore (random) | Otherwise: exploit (pick best)"
 * bandit.meet.slide5ready    = "Ready to watch the algorithm learn on its own? Let's go!"
 *
 * Chinese:
 * bandit.meet.title          = "认识算法"
 * bandit.meet.slide0         = "你有5个宝箱。你会怎么决定下一个打开哪个？"
 * bandit.meet.slide1title    = "策略1：总是选最好的"
 * bandit.meet.slide1a        = "简单想法：总是打开到目前为止给金币最多的宝箱。"
 * bandit.meet.slide1b        = "但如果你第一次运气不好呢？你可能永远会错过真正最好的宝箱！"
 * bandit.meet.slide2title    = "观察：纯贪心策略的表现"
 * bandit.meet.slide2desc     = "第 {{steps}}/15 步 — 贪心策略只选看起来最好的..."
 * bandit.meet.slide2note     = "注意到它卡在一个宝箱上了吗？它从不检查其他宝箱是否更好。"
 * bandit.meet.slide3title    = "策略2：有时候探索一下！"
 * bandit.meet.slide3a        = "如果你大部分回合选最好的宝箱，但偶尔随机试一个呢？"
 * bandit.meet.slide3b        = "就像这样：你通常去最喜欢的餐厅吃饭，但偶尔会尝试新地方。正是这样你才发现了最爱的餐厅！"
 * bandit.meet.slide3c        = "在「坚持有效的」和「尝试新东西」之间的平衡叫做 探索与利用 的权衡。"
 * bandit.meet.slide4title    = "Epsilon 滑块"
 * bandit.meet.slide4desc     = "Epsilon 控制算法多久探索一次。拖动滑块看看平衡变化："
 * bandit.meet.exploit        = "利用"
 * bandit.meet.explore        = "探索"
 * bandit.meet.epsilonExplain = "{{exploit}}% 的时间：选已知最好的宝箱。{{explore}}% 的时间：随机试一个。"
 * bandit.meet.noExplore      = "零探索——你可能永远错过最好的宝箱！"
 * bandit.meet.allExplore     = "全是随机——你根本没利用学到的知识！"
 * bandit.meet.slide5title    = "Epsilon-贪心：简单但强大"
 * bandit.meet.slide5desc     = "这个策略叫 epsilon-贪心。用一个小的 epsilon 比如 10%，你大部分时间利用已有知识，但保持探索。"
 * bandit.meet.slide5formula  = "以概率 epsilon: 探索（随机） | 否则: 利用（选最好的）"
 * bandit.meet.slide5ready    = "准备好看算法自己学习了吗？走吧！"
 */
