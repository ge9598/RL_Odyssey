# RL Odyssey — Learn Reinforcement Learning in 9th Grade

## Project Overview

**RL Odyssey** is an interactive, gamified web application that teaches reinforcement learning algorithms through an 8-bit pixel-art adventure. The target audience is 9th graders (14-15 years old) with no prior ML knowledge. Every algorithm explanation must use analogies, visual metaphors, and hands-on interaction — never academic jargon.

The core philosophy: **"If a 9th grader can't understand it in 2 minutes, rewrite it."**

---

## 📚 Prerequisites & Onboarding

### What Students Need Before Starting
- **Math**: Basic arithmetic, the concept of "chance" (coin flips, dice rolls), grid coordinates (x, y)
- **No programming required**: All interactive challenges use visual controls, sliders, drag-and-drop — never raw code
- **No ML knowledge required**: Every concept is introduced from scratch with real-world analogies

### Per-Port Concept Primers
Each port may require a concept the player hasn't seen yet. When this happens, a **30-second animated popup primer** appears before the port begins:
- Example: Before Port Reinforce, a primer on "What is probability? Think of it like weather forecast percentages"
- Example: Before Port Deep (DQN), a primer on "What is a neural network? Think of it like a smart pattern-matching machine"
- Primers are skippable for players who already know the concept
- Primers are always re-accessible from the port's menu

---

## 🚢 Chapter 0: Starting Harbor — RL Fundamentals Tutorial

Before choosing any route, every player completes a **5-minute interactive tutorial** at the Starting Harbor. This teaches the core RL loop without naming any algorithm.

### The Tutorial: "Train Your Pixel Pet"
A pixel-art pet (dog/cat/robot, player chooses) is placed in a simple 4x4 grid. There's a treat somewhere on the grid.

**Step 1 — You ARE the pet** (1 min)
Player controls the pet manually. Move around, find the treat. Simple.

**Step 2 — Now you're blindfolded** (1 min)
Screen goes dark. Player must find the treat by memory/guessing. Introduces the idea: "What if you could LEARN which direction is usually good?"

**Step 3 — The learning loop** (2 min)
Introduce the RL cycle with simple labels (no jargon):
- 🐕 **You** (Agent) look around → see **where you are** (State)
- You **choose a direction** (Action)
- The world **gives you feedback** — treat = 😊, wall = 😤, nothing = 😐 (Reward)
- You **remember** this for next time (Learning)
- Repeat!

Player watches the pet gradually learn to find the treat, with a visual "memory map" filling in.

**Step 4 — The big question** (1 min)
"There are MANY ways to teach your pet to learn. Each island in the Sea of Intelligence teaches a different method. Which route will you sail first?"

→ World map opens with route selection.

### Difficulty Indicators on World Map
- 🏝️ Value Archipelago: ⭐ (Recommended first voyage)
- 🌋 Policy Volcanic Isle: ⭐⭐ (Builds on ideas from Value Archipelago)
- ❄️ Continuous Glacier: ⭐⭐⭐ (Most advanced concepts)

When selecting a harder route first, a friendly message appears: *"This route explores advanced ideas. We recommend starting with Value Archipelago — but you're the captain! Ready to set sail?"* — Never hard-blocks.

---

## 🌊 World Design: The Sea of Intelligence

### Narrative Framework

The player is an explorer sailing the **Sea of Intelligence (智慧之海)**. Legend says the secret of the **Optimal Strategy (最优策略)** lies at the end of the sea. From the Starting Harbor, the player chooses different sea routes — each route is an island chain representing a major RL algorithm evolution path.

The world is a **half-circle sea map**. Three island chains are arranged along different routes. All routes converge at a final destination: **Convergence Harbor (融合之港)**. Routes are independent — to switch routes, return to Starting Harbor.

### World Map Structure

```
                    ⚓ Convergence Harbor
                   /        |        \
                  /         |         \
    Value       /   Policy  |  Continuous  \
  Archipelago  /    Volcanic |   Glacier    \
     🏝️      /    Isle 🌋  |    ❄️        \
              /             |              \
             ─────── Starting Harbor 🚢 ───────
```

**MVP World Map**: Static pixel-art PNG image with CSS hotspot overlays for clickable ports. Full animated Canvas map is Phase 2+.

### The Three Routes (三条航线)

#### 🏝️ Route 1: Value Archipelago (价值群岛)
- **Theme**: "Everything Can Be Scored" — learn to evaluate the worth of every choice
- **Visual Style**: Tropical islands, treasure maps, gold coins
- **Core Metaphor**: You're a treasure hunter learning to appraise the value of different paths

**Ports (关卡):**

1. **Port Bandit** — Multi-Armed Bandit
   - Metaphor: A row of slot machines, which one pays out the most?
   - Interaction: Player physically pulls levers, sees rewards, must balance trying new machines vs. sticking with the best one (exploration vs exploitation)
   - Key Concept: Epsilon-greedy, UCB
   - **Quest: "The Gambler's Dilemma"**
     - 5 treasure chests, each with unknown random payout. 100 turns to maximize gold. Twist: chests change payout rates at turn 50 (non-stationary bandit).
     - Pass: Earn more gold than a pure-random strategy
     - Thresholds (calibrate via playtesting): C = 1.1x random, B = 1.5x, A = 2.0x, S = 2.5x+
     - Rewards: 100–500 gold, Card: "Explorer's Instinct"

2. **Port Q-Table** — Q-Learning
   - Metaphor: Drawing a treasure map — mark how good each spot is
   - Interaction: Grid world where player watches an agent learn, can see the Q-table update in real-time as a heatmap overlay. Player can also play AS the agent to feel the difference between random and learned behavior.
   - Key Concept: Q-value, Bellman equation (explained as "asking your future self for advice")
   - **Quest: "Escape the Cursed Island"**
     - Navigate a grid island with traps, treasure, and a hidden exit. Player controls the agent for 20 moves, then trains Q-Learning.
     - Pass: Q-Learning finds a shorter path than the player's manual attempt
     - Thresholds: C = ties player, B = 20% shorter, A = 40% shorter, S = optimal path found
     - Rewards: 200–800 gold, Card: "The Cartographer"

3. **Port SARSA** — SARSA *(Phase 1.5)*
   - Metaphor: "The cautious explorer" — learns from what it actually does, not what it could do
   - Interaction: Side-by-side comparison with Q-Learning on the same grid near cliffs
   - Key Concept: On-policy vs Off-policy ("learning from your own diary" vs "learning from someone else's diary")
   - **Quest: "Cliffside Race"**
     - Tune SARSA vs Q-Learning side by side on a cliff walk.
     - Pass: SARSA finishes safely while Q-Learning falls off
     - Rewards: 200–600 gold, Card: "The Cautious One"

4. **Port Deep** — DQN (Deep Q-Network)
   - Metaphor: The treasure map becomes too big to draw by hand — train a "pattern recognition assistant" (neural network) to estimate values
   - Interaction: Pixel-art Atari-style mini-game (simple Breakout). Neural network's value predictions overlaid on game screen. Toggle Experience Replay visualization.
   - Key Concept: Neural network as Q-function approximator, Experience Replay ("studying from a shuffled notebook"), Target Network ("having a stable teacher")
   - **Quest: "Pixel Arcade Challenge"**
     - Play Breakout manually to set a high score. Train a DQN agent — tune replay buffer size and learning rate.
     - Pass: DQN beats the player's manual high score
     - Thresholds: C = ties player, B = 1.2x player score, A = 1.5x, S = 2x+
     - Rewards: 500–1500 gold, Card: "Neural Navigator", Ship Part: "Reinforced Hull"

5. **Port Twin** — Double DQN *(Phase 1.5)*
   - Metaphor: "Don't trust a single opinion" — two evaluators to avoid overconfidence
   - Interaction: Visualization of DQN overestimation vs Double DQN correction (bar chart comparison)
   - Key Concept: Overestimation bias, using two networks to keep each other honest
   - **Quest**: Identify which Q-values are overestimated in a rigged demo
   - Rewards: 300–700 gold, Card: "The Skeptic"

6. **Port Duel** — Dueling DQN *(Phase 1.5)*
   - Metaphor: "How good is this place?" vs "How good is this action HERE?"
   - Interaction: Visual network architecture showing split streams, interactive state-value vs advantage-value demo
   - Key Concept: State-value vs Advantage function
   - **Quest**: Separate state-value from advantage in a visual puzzle
   - Rewards: 300–700 gold, Card: "The Analyst"

**🏝️ Island Boss: The Overconfident Oracle** *(Phase 1.5)*
- An NPC with wrong Q-values. Player must identify overestimations (Double DQN), separate state-value from advantage (Dueling DQN), and train a proper agent to beat the Oracle's suggested path.
- Tests: overestimation detection, state-value vs advantage, exploration vs exploitation
- Rewards: 2000 gold, Legendary Card: "Value Master", Ship: "Golden Compass"

**🏝️ MVP Mini-Boss: The Greedy Pirate** *(Phase 1 — MVP)*
- A pirate who ALWAYS picks the highest immediate reward (pure greedy, no learning). Player must demonstrate that their trained Q-Learning/DQN agent outperforms pure greed on a delayed-reward maze.
- Tests: understanding that long-term value beats short-term greed
- Rewards: 1000 gold, Card: "The Patient Strategist"

---

#### 🌋 Route 2: Policy Volcanic Isle (策略火山岛)
- **Theme**: "The Intuition Brigade" — learn to act directly by instinct, no scoring needed
- **Visual Style**: Volcanic terrain, fire/lava, forging weapons
- **Core Metaphor**: You're a martial artist learning fighting moves directly, not analyzing every opponent's stats

**Ports (关卡):**

1. **Port Reinforce** — REINFORCE / Vanilla Policy Gradient
   - Metaphor: Learning to throw darts — if it hits bullseye, remember what you did and do more of it
   - Interaction: Dart-throwing mini-game. Policy (probability distribution) shifts visually after good/bad throws. Adjustable learning rate.
   - Key Concept: Policy as probability distribution, reward-weighted learning
   - **Quest: "The Dart Tournament"**
     - Adjust "learning courage" (learning rate). Too high = wild throws, too low = glacial improvement.
     - Pass: Hit 3 bullseyes within 50 throws
     - Thresholds: C = 3 hits, B = 5, A = 8, S = 12+
     - Rewards: 200–700 gold, Card: "Instinct Thrower"

2. **Port Critic** — Actor-Critic
   - Metaphor: A martial artist (Actor) with a coach (Critic). The coach rates performance for faster improvement.
   - Interaction: Split-screen Actor + Critic. Comparison chart with pure REINFORCE showing variance reduction.
   - Key Concept: Variance reduction, baseline, the Actor-Critic dance
   - **Quest: "Master and Apprentice"**
     - Play as Critic (rate Actor's choices), then swap roles. Actor-Critic pair must complete a platformer faster than pure REINFORCE.
     - Pass: Complete the level faster than REINFORCE baseline
     - Rewards: 400–1000 gold, Card: "The Dual Mind"

3. **Port Parallel** — A2C / A3C
   - Metaphor: Training an army of martial artists simultaneously — they share notes to learn faster
   - Interaction: Multiple parallel environments (visual grid). Slider for number of parallel agents.
   - Key Concept: Parallelism, shared parameters, sync vs async updates
   - **Quest: "Army of Clones"**
     - Launch 2, 4, 8 parallel agents on a maze. They share learning.
     - Pass: 8 agents solve the maze in < half the time of 1 agent
     - Rewards: 500–1200 gold, Card: "Hivemind Captain"

4. **Port Proximal** — PPO (Proximal Policy Optimization)
   - Metaphor: "Don't change too much at once" — careful steps so you don't forget what you've learned
   - Interaction: Policy update as "comfort zone" visualization. Clipping mechanism shown as visual boundary. Compare PPO stability vs vanilla PG chaos.
   - Key Concept: Clipping, trust region ("learning speed limit"), why PPO is the most popular algorithm today
   - **Quest: "The Stability Trial"**
     - Train agent on wobbly bridge. Vanilla PG falls repeatedly. Adjust PPO's clipping range.
     - Pass: Cross the bridge 3 times in a row without falling
     - Thresholds: C = 3 crossings, B = 5, A = 8 consecutive, S = 10+ with minimal wobble
     - Rewards: 800–2000 gold, Card: "Steady Hand", Ship Part: "Volcanic Sails"

**🌋 Island Boss: The Chaos Volcano**
- Volcanic eruption where environment changes every N steps. Player selects which algorithm handles each phase: REINFORCE for simple escape, Actor-Critic for faster adaptation, PPO for stability under shifting conditions.
- Tests: knowing when each algorithm shines and when it fails
- Rewards: 2500 gold, Legendary Card: "Policy Master", Ship: "Flame Rudder"

---

#### ❄️ Route 3: Continuous Glacier (连续冰川岛)
- **Theme**: "The World Isn't Black and White" — handle infinite possibilities with continuous actions
- **Visual Style**: Ice, snow, auroras, precision instruments
- **Core Metaphor**: You're piloting a spaceship — you can't just go "left" or "right", you need to control exact thrust and angle

**Ports (关卡):**

1. **Port Deterministic** — DDPG (Deep Deterministic Policy Gradient)
   - Metaphor: A robot arm learning to reach for objects — precise, continuous movements
   - Interaction: 2D pixel robot arm simulator. Visualization of replay buffer and soft target updates.
   - Key Concept: Continuous action spaces, deterministic policy, soft updates ("slowly copying the master's moves")
   - **Quest: "Precision Reach"**
     - Robot arm must stack 3 ice blocks. Discrete actions fail — continuous control required.
     - Pass: Stable stack for 10 seconds
     - Thresholds: C = 3 blocks/5s, B = 3 blocks/10s, A = 4 blocks/10s, S = 5 blocks/10s
     - Rewards: 500–1500 gold, Card: "Precision Engineer"

2. **Port Triple** — TD3 (Twin Delayed DDPG)
   - Metaphor: Three improvements — "trust the pessimist", "don't rush", "add randomness to practice"
   - Interaction: Side-by-side DDPG vs TD3. Toggle each of TD3's three tricks on/off.
   - Key Concept: Twin critics, delayed policy updates, target policy smoothing
   - **Quest: "Triple Upgrade"**
     - DDPG keeps knocking over ice. Enable TD3's tricks one by one to improve.
     - Pass: Enable all 3 and stack 5 blocks
     - Rewards: 700–1800 gold, Card: "The Optimizer"

3. **Port Entropy** — SAC (Soft Actor-Critic)
   - Metaphor: "The curious explorer" — stay creative and explore many good ways, not just one
   - Interaction: Ice maze with 5 exits. SAC finds multiple diverse paths. Entropy/temperature slider.
   - Key Concept: Maximum entropy RL, exploration through randomness, temperature ("curiosity dial")
   - **Quest: "The Curious Pathfinder"**
     - Find ALL 5 exits in the ice maze by tuning temperature.
     - Pass: Discover all 5 paths
     - Thresholds: C = 3 paths, B = 4, A = 5, S = 5 paths found in < 200 episodes
     - Rewards: 1000–2500 gold, Card: "Entropy Master", Ship Part: "Aurora Engine"

**❄️ Island Boss: The Precision Gauntlet**
- Multi-stage obstacle course: Stage 1 = simple reach (DDPG), Stage 2 = reach under noise (TD3), Stage 3 = find multiple solutions through shifting ice (SAC). Player configures the right algorithm + hyperparams per stage.
- Tests: matching algorithm to challenge type
- Rewards: 3000 gold, Legendary Card: "Continuous Master", Ship: "Glacier Anchor"

---

#### ✨ Convergence Harbor (融合之港)
- **Theme**: Where all routes meet — compare, contrast, and look ahead

**Content:**
1. **Algorithm Arena**: Side-by-side comparison of all learned algorithms on the same environment. Player picks any two and watches them compete.
2. **Evolution Tree**: Interactive visualization showing how all algorithms are connected and evolved from each other
3. **Frontier Telescope**: Brief overview of cutting-edge topics (Model-Based RL, Offline RL, Multi-Agent RL, RLHF) as "islands yet to be explored"
4. **Captain's Log**: Summary of everything learned, exportable as a cheat sheet

**⚔️ Final Boss: The Grand Strategist** *(fully specced now, built in Phase 4)*

The Grand Strategist is a shape-shifting challenge environment that morphs through four phases:

- **Phase 1 — Discrete & Simple**: A grid-world treasure hunt. Value methods territory. Player selects from Q-Learning / DQN.
- **Phase 2 — Discrete & High-Dimensional**: A complex pixel game with many possible states. Policy methods territory. Player selects from REINFORCE / PPO.
- **Phase 3 — Continuous**: A physics-based control task. Continuous methods territory. Player selects from DDPG / TD3 / SAC.
- **Phase 4 — The Fusion**: An environment combining all three — discrete choices leading to continuous control with high-dimensional observation. Player assigns the right algorithm family to each sub-problem.

**Victory Condition**: Correctly assign and tune algorithms for all 4 phases. The victory animation reveals: *"The true Optimal Strategy was never a single algorithm — it was knowing which tool to use, and when."*

**Rewards**: 5000 gold, unlock Admiral rank, Legendary Card: "The Grand Strategist", special synthesis view showing ALL algorithms in one connected diagram.

---

## 🎮 Interaction Design

### Three Interaction Modes (per algorithm, choose the most appropriate)

1. **🕹️ Role Play Mode** — Player IS the agent
   - Player makes decisions manually, experiencing the RL problem firsthand
   - THEN sees how the algorithm would solve it
   - Best for: Bandit, Q-Learning, early concepts

2. **🔬 Observatory Mode** — Watch and tweak
   - Algorithm runs automatically, player observes with real-time visualizations
   - Player can adjust hyperparameters (learning rate, epsilon, etc.) via sliders
   - Real-time charts show reward curves, Q-value evolution, loss, etc.
   - Best for: DQN, A2C/A3C, comparison demos

3. **🧩 Pseudocode Challenge Mode** — Understand the algorithm's logic
   - Show the algorithm as simplified pseudocode with key parts blanked out
   - Player drags the correct line/block from multiple options to fill in the blanks
   - NOT full Scratch-style block programming — focused "fill in the blank" challenges
   - Best for: Actor-Critic (connect Actor and Critic), PPO (set up the clipping)

### Each Port (Level) Structure
Every algorithm port follows this flow:
1. **Story Intro** (30 seconds) — Pixel art cutscene, sets up the problem in story terms
2. **Concept Primer** (30 seconds, skippable) — If needed, a quick animated explainer for a prerequisite concept
3. **Feel the Problem** (2 min) — Player tries to solve it manually, experiences why it's hard
4. **Meet the Algorithm** (3 min) — Step-by-step visual explanation with 9th-grade language
5. **Watch It Learn** (2 min) — Observatory mode, real-time training visualization
6. **Quest Challenge** (5 min) — The port's unique quest (see each route's Quest Design above)
7. **Port Summary & Card Reward** (1 min) — Key takeaways, comparison with previous algorithms, collect algorithm card
8. **Unlock Next Port** — Sailing transition animation to next destination

### Session Design
- **Mid-port checkpoints**: Each of the 8 steps above is a save point. Leaving mid-port and returning resumes at the last completed step.
- **"Previously on..." recap**: When resuming a port, a 15-second pixel animation recaps completed steps.
- **Skip option**: Advanced users can skip steps 1-4 (story/primer/feel/explain) and jump straight to the quest via a "Skip to Challenge" button.
- **Estimated time per port**: 10-15 minutes for full experience, 5-7 minutes with skips.

---

## 💰 Bounty & Reward System

### Gold (金币)
Earned from quests. Amount scales with performance (bounty rank multiplier). Gold is **cosmetic-only** — never gates learning content.

**Gold Shop (items are purely cosmetic):**
- Ship cosmetics: sails, figureheads, hull colors (visible on world map)
- Crew members: NPC pixel companions displayed on your ship
- Map decorations: reveal fog-of-war illustrations on unexplored parts of the sea map

**Retries are ALWAYS free.** A student can replay any quest unlimited times to improve their bounty rank. Learning from mistakes should never cost anything.

### Bounty Rank (悬赏等级)
Every quest rates performance with a bounty tier:

| Rank | Bounty Tier | Gold Multiplier | Meaning |
|------|-------------|-----------------|---------|
| S | Legendary | 3x gold | Optimal or near-optimal solution |
| A | High | 2x gold | Strong performance, good parameter tuning |
| B | Standard | 1x gold | Passed the quest, basic understanding |
| C | Rookie | 0.5x gold | Barely passed, consider retrying |

Threshold ranges are specified per quest (see Quest Design in each route above). All thresholds are marked "calibrate via playtesting" — final numbers come from real user testing.

### Navigator Rank (航海士段位)
Total accumulated bounty gold determines the player's rank:

| Total Gold | Rank | Title |
|------------|------|-------|
| 0 – 2,000 | Rank 1 | Apprentice Sailor (见习水手) |
| 2,001 – 8,000 | Rank 2 | Navigator (航海士) |
| 8,001 – 20,000 | Rank 3 | First Mate (大副) |
| 20,001 – 40,000 | Rank 4 | Captain (船长) |
| 40,001+ | Rank 5 | Admiral of Intelligence (智慧提督) |

### Algorithm Cards (算法卡牌)
Each quest rewards a **collectible trading card**. Cards are designed as character profiles, NOT textbook entries:

**Card Front (always visible):**
- Pixel art portrait of the algorithm personified (e.g., Q-Learning as a cartographer with a map, PPO as a cautious tightrope walker)
- "Personality traits" — 2-3 strengths and 2-3 weaknesses in plain language
- "Signature move" — the core idea in one sentence
- Power radar chart: 5 axes — Sample Efficiency, Stability, Scalability, Simplicity, Flexibility (each rated 1-5)

**Card Back (optional flip for curious students):**
- Key formula (simplified notation)
- "Evolution line" — what algorithm came before and after
- Real-world application example

Collecting ALL cards on an island unlocks a **Synthesis Card** showing how the island's algorithms connect and evolve.

---

## 🖼️ Visual Design System

### HD Pixel Art Style (Celeste / Stardew Valley tier)

- **Resolution**: HD Pixel aesthetic — more refined than NES 8-bit, with richer detail and modern polish
- **Base tile size**: 48×48 pixels (characters, items, UI elements). Display at 96×96 with `image-rendering: pixelated` in CSS.
- **Color Palette**: Rich palette, 32+ colors per island theme, subtle gradients allowed:
  - Value Archipelago: Tropical — turquoise, gold, sandy beige, palm green (+ gradient variants)
  - Policy Volcanic Isle: Volcanic — deep red, orange, charcoal, molten gold (+ ember glows)
  - Continuous Glacier: Arctic — ice blue, white, aurora green/purple, steel gray (+ ice shimmer)
  - Convergence Harbor: All palettes merge — golden sunrise, deep navy (+ prismatic effects)
  - UI Chrome: Dark navy background (#0a0e27) with subtle radial gradients, accent color glows per island
- **Typography (bilingual EN + CN)**:
  - Headings (EN): "Silkscreen" — clean pixel font, less chunky than Press Start 2P
  - Headings (CN): "ZCOOL QingKe HuangYou" — playful rounded Chinese font, blends with pixel aesthetic
  - Body (EN): "VT323" — terminal-feel pixel font for explanatory text
  - Body (CN): "Noto Sans SC" — clean, highly readable Chinese body text
  - Font stacks: `--font-pixel: "Silkscreen", "ZCOOL QingKe HuangYou", system-ui, sans-serif`
  - Font stacks: `--font-body: "VT323", "Noto Sans SC", system-ui, sans-serif`
  - Math/Code: Monospace pixel font
- **Modern CSS Effects** (HD Pixel polish):
  - Subtle glow effects on accent elements (text-shadow, box-shadow with color)
  - Glassmorphism-lite panels (semi-transparent backgrounds + backdrop-blur)
  - Gradient backgrounds (radial, linear) for depth
  - Smooth transitions and hover states
  - Float/wave/shimmer animations for visual life
- **Animations**:
  - Sprite-based character animations (idle, walking, sailing)
  - Particle effects for rewards, level-ups, transitions
  - Smooth CSS transitions for UI panels, modals, tooltips
  - Canvas-based animations for algorithm visualizations (training curves, Q-tables, etc.)
  - CSS keyframe animations: float, wave, shimmer, gradient-shift

### Pixel Art Asset Pipeline
- **Base tile size**: 48×48 pixels (up from 16×16). Display at 96×96 with `image-rendering: pixelated`.
- **Sprite sheet format**: TexturePacker JSON Array export (or manually organized PNG grid)
- **Character animation frames**: Idle: 4 frames, Walk: 6 frames, Sail: 4 frames, Celebrate: 6 frames
- **Tools**: Aseprite for sprite creation, TexturePacker for sheet export, Piskel (free alternative)
- **Upscale method**: CSS `image-rendering: pixelated` (Chrome/Edge) + `image-rendering: crisp-edges` (Firefox). Never use anti-aliasing on pixel art.
- **Asset naming convention**: `{island}_{entity}_{action}_{frame}.png` — e.g., `value_player_walk_03.png`

### UI Layout
- **World Map** (main navigation): MVP = static pixel-art PNG with CSS hotspot overlays. Phase 2+ = animated Canvas map.
- **Port View** (algorithm level): Split layout —
  - Left/Top: Interactive environment / game area
  - Right/Bottom: Explanation panel with step-by-step walkthrough
  - Bottom bar: Hyperparameter controls (sliders), progress indicator
- **Responsive**: Desktop-first, but tablet-friendly. Minimum width: 1024px for full experience. Mobile gets a simplified "story mode" with less interaction.

### Sound Design (optional, Phase 2+)
- 8-bit chiptune background music per island
- SFX for interactions: lever pulls, rewards, level-ups, sailing
- Mute button always visible

---

## 🌐 Internationalization (i18n)

### Bilingual: English + Chinese

- All UI text, algorithm explanations, story dialogue, and tooltips available in both languages
- Language toggle in top-right corner, pixel-art flag icons (🇺🇸 / 🇨🇳)
- Implementation: JSON-based i18n files, one per language
  ```
  /src/i18n/en.json
  /src/i18n/zh.json
  ```
- Algorithm names shown in both: "Q-Learning (Q学习)"
- Math formulas are language-agnostic, only surrounding explanation text changes
- Default language: auto-detect from browser, fallback to English

---

## 🛠️ Technical Architecture

### Tech Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + custom pixel-art CSS utilities
- **State Management**: Zustand (lightweight, sufficient for game state)
- **Routing**: React Router v6
- **Visualization**: HTML5 Canvas (for game environments & algorithm visualizations) + SVG (for charts and diagrams)
- **Animation**: CSS animations + requestAnimationFrame for Canvas
- **i18n**: react-i18next
- **Deployment**: Vercel (free tier, zero-config)

### Project Structure
```
rl-odyssey/
├── public/
│   ├── assets/
│   │   ├── sprites/          # Pixel art sprite sheets
│   │   ├── maps/             # World map tiles / static map PNG
│   │   ├── cards/            # Algorithm card art
│   │   ├── audio/            # Chiptune music & SFX (Phase 2)
│   │   └── fonts/            # Pixel fonts
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ui/               # Reusable UI (Button, Slider, Panel, Modal, Tooltip, Card)
│   │   ├── map/              # World map, island navigation, hotspots
│   │   ├── port/             # Port (level) layout, flow controller, recap
│   │   ├── quest/            # Quest framework, pass/fail evaluation, bounty display
│   │   ├── boss/             # Boss battle framework
│   │   └── visualizations/   # Reusable viz (QTableHeatmap, RewardChart, NetworkDiagram, PolicyDistribution, RadarChart)
│   ├── algorithms/           # Pure TS implementations of RL algorithms
│   │   ├── bandit.ts
│   │   ├── qlearning.ts
│   │   ├── sarsa.ts
│   │   ├── dqn.ts
│   │   ├── doubleDqn.ts
│   │   ├── duelingDqn.ts
│   │   ├── reinforce.ts
│   │   ├── actorCritic.ts
│   │   ├── a2c.ts
│   │   ├── ppo.ts
│   │   ├── ddpg.ts
│   │   ├── td3.ts
│   │   └── sac.ts
│   ├── nn/                   # Hand-coded tiny neural network
│   │   ├── SimpleNN.ts       # Forward pass, backprop, gradient descent
│   │   ├── layers.ts         # Dense layer, activation functions (ReLU, sigmoid, tanh)
│   │   └── optimizer.ts      # SGD, Adam (simplified)
│   ├── environments/         # Interactive environments for each algorithm
│   │   ├── TreasureChests.tsx # Bandit
│   │   ├── GridWorld.tsx      # Q-Learning, SARSA, DQN (reusable with different configs)
│   │   ├── PixelBreakout.tsx  # DQN
│   │   ├── DartThrow.tsx      # REINFORCE
│   │   ├── Platformer.tsx     # Actor-Critic
│   │   ├── ParallelMaze.tsx   # A2C/A3C
│   │   ├── WobblyBridge.tsx   # PPO
│   │   ├── RobotArm.tsx       # DDPG, TD3
│   │   ├── IceMaze.tsx        # SAC
│   │   └── shared/            # Shared environment utilities
│   ├── islands/              # Island-specific pages and content
│   │   ├── tutorial/         # Chapter 0: Starting Harbor tutorial
│   │   ├── value/            # Value Archipelago ports + boss
│   │   ├── policy/           # Policy Volcanic Isle ports + boss
│   │   ├── continuous/       # Continuous Glacier ports + boss
│   │   └── convergence/      # Convergence Harbor + Grand Strategist
│   ├── rewards/              # Reward system
│   │   ├── bountySystem.ts   # Rank calculation, gold multipliers
│   │   ├── cardCollection.ts # Card unlock, synthesis card logic
│   │   ├── shopItems.ts      # Cosmetic items and prices
│   │   └── navigatorRank.ts  # Rank progression logic
│   ├── i18n/
│   │   ├── en.json
│   │   └── zh.json
│   ├── stores/               # Zustand stores
│   │   ├── gameStore.ts      # Progress, unlocked ports, current location, gold, rank
│   │   ├── algorithmStore.ts # Per-algorithm state (hyperparams, training state)
│   │   └── cardStore.ts      # Collected cards, synthesis progress
│   ├── hooks/
│   │   ├── useAlgorithm.ts   # Hook to run any algorithm with visualization callbacks
│   │   ├── useCanvas.ts      # Canvas rendering hook (React-Canvas bridge)
│   │   ├── useQuest.ts       # Quest evaluation, bounty calculation
│   │   └── useI18n.ts        # i18n helpers
│   ├── utils/
│   │   ├── math.ts           # Linear algebra, probability helpers
│   │   ├── pixelRenderer.ts  # Pixel art rendering utilities
│   │   ├── animation.ts      # Animation frame management
│   │   ├── seededRandom.ts   # Deterministic RNG for reproducible demos
│   │   └── saveManager.ts    # localStorage + JSON export/import
│   ├── styles/
│   │   ├── pixel.css         # Pixel art CSS utilities (borders, shadows, fonts, image-rendering)
│   │   └── themes/           # Per-island color themes
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md                 # This file
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### Canvas-React Integration Pattern
Canvas components are **leaf nodes** in the React tree. React owns all state via Zustand. The data flow is strictly one-directional:

```
Zustand Store → React Component (props) → Canvas Renderer (reads only)
     ↑                                            |
     └────── User Input (sliders, buttons) ────────┘
```

- Canvas components receive state as props and render via `useEffect` + `requestAnimationFrame`
- Canvas **never** modifies application state — it only reads and renders
- DOM sliders/buttons dispatch actions to Zustand stores
- Canvas click/touch events are captured and forwarded to React event handlers, which then update Zustand
- Use `useCanvas` hook to manage the Canvas lifecycle (create, resize, destroy)

### Algorithm Implementation Guidelines

All RL algorithms run **in the browser** using TypeScript. They are simplified for educational purposes:

- **SimpleNN for DQN+**: DQN and later algorithms use a hand-coded tiny neural network (`src/nn/SimpleNN.ts`) — a real 2-layer net with forward pass, backprop, and gradient descent, implemented in ~150 lines of TypeScript. No TensorFlow.js dependency. This runs on small state spaces (grid worlds, simple games) but teaches the real concept. Phase 3 can introduce TensorFlow.js for larger demos.
- **Step-by-step execution**: Every algorithm must support a `step()` function that advances one timestep, returning enough data to visualize the update (old Q-values, new Q-values, reward, state, action, etc.)
- **Speed control**: All training loops must be pausable, steppable (one step at a time), and speed-adjustable (1x, 2x, 5x, 10x, Max)
- **Deterministic replay**: Seed-based random number generation (`seededRandom.ts`) so demos are reproducible
- **State serialization**: Algorithm state can be saved/loaded (for "resume" functionality)

### Algorithm Interface (shared across all)
```typescript
interface RLAlgorithm<S, A> {
  name: string;
  reset(): void;
  step(state: S): { action: A; metadata: StepMetadata };
  update(experience: Experience<S, A>): UpdateMetadata;
  getVisualizationData(): VisualizationData;
  getHyperparameters(): HyperParameter[];
  setHyperparameter(key: string, value: number): void;
}
```

### Save System
- **Primary**: `localStorage` for automatic progress saving (game state, unlocked ports, gold, cards, current port step)
- **Export/Import**: JSON file download/upload for cross-device transfer. Accessible from Settings menu. Includes full game state.
- **Per-port checkpoints**: Each step within a port is a save point. Resuming shows a 15-second recap.

---

## 📋 Development Phases

### Phase 1 — MVP: Value Archipelago Core (~80-100 hours)
**Goal**: Playable first island with 3 algorithms + world map + tutorial + mini-boss

**Deliverables**:
1. ✅ Chapter 0: Starting Harbor tutorial ("Train Your Pixel Pet")
2. ✅ World Map (static PNG with CSS hotspots, 3 islands visible, only Value accessible)
3. ✅ Port Bandit (Multi-Armed Bandit — full port with quest)
4. ✅ Port Q-Table (Q-Learning — full port with quest)
5. ✅ Port Deep (DQN — full port with quest, using SimpleNN)
6. ✅ Mini-Boss: The Greedy Pirate
7. ✅ Bounty system, gold, navigator rank (Rank 1-3 achievable)
8. ✅ Algorithm card collection (3 cards + 1 mini-boss card)
9. ✅ Bilingual support (EN/ZH) for all above
10. ✅ Progress saving (localStorage + JSON export/import)
11. ✅ Responsive layout (desktop + tablet)

### Phase 1.5 — Complete Value Archipelago (~40-50 hours)
- Add SARSA, Double DQN, Dueling DQN ports with quests
- Full Island Boss: The Overconfident Oracle
- 6 additional algorithm cards + 1 boss card + synthesis card
- Polish animations, sailing transitions, recap system

### Phase 2 — Policy Volcanic Isle (~80-100 hours)
- REINFORCE, Actor-Critic, A2C/A3C, PPO — all with quests
- New environments: Dart-throwing, Platformer, Parallel Maze, Wobbly Bridge
- Island Boss: The Chaos Volcano
- Policy visualization components (probability distributions, parallel training view)
- Animated world map (replace static PNG with Canvas)

### Phase 3 — Continuous Glacier (~80-100 hours)
- DDPG, TD3, SAC — all with quests
- Continuous action space environments (Robot arm, Ice maze)
- Island Boss: The Precision Gauntlet
- Introduce TensorFlow.js for larger-scale neural network demos (optional)

### Phase 4 — Convergence Harbor + Polish (~60-80 hours)
- Algorithm Arena (head-to-head comparisons)
- Evolution Tree interactive visualization
- Frontier Telescope (future RL topics)
- **Final Boss: The Grand Strategist** (4-phase shape-shifting challenge)
- Sound design, chiptune music
- Mobile optimization
- Performance optimization, loading screens
- Ship cosmetic shop fully populated

### Scope Reduction Strategies (if time is tight)
- **Cut first**: Sound design, mobile optimization, animated world map
- **Simplify**: Reduce quest complexity (fewer thresholds, simpler pass conditions)
- **Defer**: Synthesis cards, ship cosmetics, crew members → Phase 4+
- **Reuse**: GridWorld environment can serve Bandit, Q-Learning, SARSA, DQN, and boss fights with different configs

---

## ✍️ Writing Guidelines for Explanations

### Language Rules
1. **No jargon without metaphor**: Every technical term must be introduced with a real-world analogy first
2. **Progressive disclosure**: Start with the simplest version, add complexity only when asked
3. **Active voice**: "The agent explores" not "Exploration is performed by the agent"
4. **Conversational**: Write like you're explaining to a curious friend, not lecturing
5. **Visual-first**: If it can be shown, don't just tell. Pair every concept with a visualization.

### Example Explanations (tone reference)

**Q-Learning for 9th graders:**
> "Imagine you're new in school and trying to find the best lunch spot. Every day, you try a different route. When you find the cafeteria is great on Taco Tuesday, you mentally note: 'Going left at the hallway → cafeteria = awesome.' Over time, you build a mental map of which choices lead to the best outcomes. That mental map? That's a Q-table."

**Experience Replay for 9th graders:**
> "You know how when studying for a test, it's better to shuffle your flashcards instead of going in order? Experience Replay is exactly that — the AI shuffles its memories before studying them, so it learns better patterns instead of just remembering the last thing that happened."

**PPO Clipping for 9th graders:**
> "Imagine learning to skateboard. If your coach says 'lean forward more,' you shouldn't suddenly lean ALL the way forward — you'd fall! PPO is like a coach that says 'improve, but not too much at once.' It puts guardrails on how big each learning step can be."

---

## 🎯 Design Principles

1. **Fun First**: If it's not fun, no one will learn. Every screen should have something to click, drag, or watch.
2. **Show, Don't Tell**: Algorithms should be SEEN working, not just described. Visualizations are the primary teaching tool.
3. **Fail Safely**: Let players experiment freely. Wrong answers lead to learning moments, not dead ends. **Retries are always free.**
4. **Honest Simplification**: We simplify for understanding, but never lie. If we omit complexity, we acknowledge it: "In the real version, there's more to this — but the core idea is what you just saw."
5. **Pixel Perfect**: The 8-bit aesthetic isn't just decoration — it makes complex concepts feel approachable and game-like.
6. **Respect the Learner**: Never punish curiosity. Never gate learning behind currency. Never make a student feel dumb for not knowing something.

---

## 🚧 Important Constraints

- **Pure frontend**: No backend server. All computation runs in the browser.
- **No heavy ML libraries for MVP**: No TensorFlow.js in Phase 1-2. Hand-written SimpleNN in TypeScript. TF.js optional from Phase 3.
- **Performance**: Algorithm visualizations must run at 60fps. Use Canvas for heavy rendering, DOM for UI.
- **Bundle size**: Keep under 2MB for initial load. Lazy-load island assets per route.
- **Accessibility**: All interactive elements must be keyboard-navigable. High contrast mode available.
- **No copyrighted content**: Original pixel art, original story, original music. No references to specific anime/games/media by name.
- **Free retries**: Never charge in-game currency for replaying content. Gold is cosmetic-only.
