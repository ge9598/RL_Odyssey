# RL Odyssey — Game Design Document

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

### Difficulty Indicators on World Map
- 🏝️ Value Archipelago: ⭐ (Recommended first voyage)
- 🌋 Policy Volcanic Isle: ⭐⭐ (Builds on ideas from Value Archipelago)
- ❄️ Continuous Glacier: ⭐⭐⭐ (Most advanced concepts)

When selecting a harder route first, a friendly message appears: *"This route explores advanced ideas. We recommend starting with Value Archipelago — but you're the captain! Ready to set sail?"* — Never hard-blocks.

---

## 🏝️ Route 1: Value Archipelago (价值群岛)
- **Theme**: "Everything Can Be Scored" — learn to evaluate the worth of every choice
- **Visual Style**: Tropical islands, treasure maps, gold coins
- **Core Metaphor**: You're a treasure hunter learning to appraise the value of different paths

### Ports

1. **Port Bandit** — Multi-Armed Bandit
   - Metaphor: A row of slot machines, which one pays out the most?
   - Interaction: Player physically pulls levers, sees rewards, must balance trying new machines vs. sticking with the best one (exploration vs exploitation)
   - Key Concept: Epsilon-greedy, UCB

2. **Port Q-Table** — Q-Learning
   - Metaphor: Drawing a treasure map — mark how good each spot is
   - Interaction: Grid world where player watches an agent learn, can see the Q-table update in real-time as a heatmap overlay. Player can also play AS the agent.
   - Key Concept: Q-value, Bellman equation (explained as "asking your future self for advice")

3. **Port SARSA** — SARSA *(Phase 1.5)*
   - Metaphor: "The cautious explorer" — learns from what it actually does, not what it could do
   - Interaction: Side-by-side comparison with Q-Learning on the same grid near cliffs
   - Key Concept: On-policy vs Off-policy ("learning from your own diary" vs "learning from someone else's diary")

4. **Port Deep** — DQN (Deep Q-Network)
   - Metaphor: The treasure map becomes too big to draw by hand — train a "pattern recognition assistant" (neural network) to estimate values
   - Interaction: Pixel-art Atari-style mini-game (simple Breakout). Neural network's value predictions overlaid on game screen. Toggle Experience Replay visualization.
   - Key Concept: Neural network as Q-function approximator, Experience Replay ("studying from a shuffled notebook"), Target Network ("having a stable teacher")

5. **Port Twin** — Double DQN *(Phase 1.5)*
   - Metaphor: "Don't trust a single opinion" — two evaluators to avoid overconfidence
   - Interaction: Visualization of DQN overestimation vs Double DQN correction (bar chart comparison)
   - Key Concept: Overestimation bias, using two networks to keep each other honest

6. **Port Duel** — Dueling DQN *(Phase 1.5)*
   - Metaphor: "How good is this place?" vs "How good is this action HERE?"
   - Interaction: Visual network architecture showing split streams, interactive state-value vs advantage-value demo
   - Key Concept: State-value vs Advantage function

### Value Archipelago Bosses

**🏝️ Island Boss: The Overconfident Oracle** *(Phase 1.5)*
- An NPC with wrong Q-values. Player must identify overestimations (Double DQN), separate state-value from advantage (Dueling DQN), and train a proper agent to beat the Oracle's suggested path.
- Tests: overestimation detection, state-value vs advantage, exploration vs exploitation
- Rewards: 2000 gold, Legendary Card: "Value Master", Ship: "Golden Compass"

**🏝️ MVP Mini-Boss: The Greedy Pirate** *(Phase 1 — MVP)*
- A pirate who ALWAYS picks the highest immediate reward (pure greedy, no learning). Player must demonstrate that their trained Q-Learning/DQN agent outperforms pure greed on a delayed-reward maze.
- Tests: understanding that long-term value beats short-term greed
- Rewards: 1000 gold, Card: "The Patient Strategist"

---

## 🌋 Route 2: Policy Volcanic Isle (策略火山岛)
- **Theme**: "The Intuition Brigade" — learn to act directly by instinct, no scoring needed
- **Visual Style**: Volcanic terrain, fire/lava, forging weapons
- **Core Metaphor**: You're a martial artist learning fighting moves directly, not analyzing every opponent's stats

### Ports

1. **Port Reinforce** — REINFORCE / Vanilla Policy Gradient
   - Metaphor: Learning to throw darts — if it hits bullseye, remember what you did and do more of it
   - Interaction: Dart-throwing mini-game. Policy (probability distribution) shifts visually after good/bad throws. Adjustable learning rate.
   - Key Concept: Policy as probability distribution, reward-weighted learning

2. **Port Critic** — Actor-Critic
   - Metaphor: A martial artist (Actor) with a coach (Critic). The coach rates performance for faster improvement.
   - Interaction: Split-screen Actor + Critic. Comparison chart with pure REINFORCE showing variance reduction.
   - Key Concept: Variance reduction, baseline, the Actor-Critic dance

3. **Port Parallel** — A2C / A3C
   - Metaphor: Training an army of martial artists simultaneously — they share notes to learn faster
   - Interaction: Multiple parallel environments (visual grid). Slider for number of parallel agents.
   - Key Concept: Parallelism, shared parameters, sync vs async updates

4. **Port Proximal** — PPO (Proximal Policy Optimization)
   - Metaphor: "Don't change too much at once" — careful steps so you don't forget what you've learned
   - Interaction: Policy update as "comfort zone" visualization. Clipping mechanism shown as visual boundary. Compare PPO stability vs vanilla PG chaos.
   - Key Concept: Clipping, trust region ("learning speed limit"), why PPO is the most popular algorithm today

### Policy Volcanic Isle Boss

**🌋 Island Boss: The Chaos Volcano**
- Volcanic eruption where environment changes every N steps. Player selects which algorithm handles each phase: REINFORCE for simple escape, Actor-Critic for faster adaptation, PPO for stability under shifting conditions.
- Tests: knowing when each algorithm shines and when it fails
- Rewards: 2500 gold, Legendary Card: "Policy Master", Ship: "Flame Rudder"

---

## ❄️ Route 3: Continuous Glacier (连续冰川岛)
- **Theme**: "The World Isn't Black and White" — handle infinite possibilities with continuous actions
- **Visual Style**: Ice, snow, auroras, precision instruments
- **Core Metaphor**: You're piloting a spaceship — you can't just go "left" or "right", you need to control exact thrust and angle

### Ports

1. **Port Deterministic** — DDPG (Deep Deterministic Policy Gradient)
   - Metaphor: A robot arm learning to reach for objects — precise, continuous movements
   - Interaction: 2D pixel robot arm simulator. Visualization of replay buffer and soft target updates.
   - Key Concept: Continuous action spaces, deterministic policy, soft updates ("slowly copying the master's moves")

2. **Port Triple** — TD3 (Twin Delayed DDPG)
   - Metaphor: Three improvements — "trust the pessimist", "don't rush", "add randomness to practice"
   - Interaction: Side-by-side DDPG vs TD3. Toggle each of TD3's three tricks on/off.
   - Key Concept: Twin critics, delayed policy updates, target policy smoothing

3. **Port Entropy** — SAC (Soft Actor-Critic)
   - Metaphor: "The curious explorer" — stay creative and explore many good ways, not just one
   - Interaction: Ice maze with 5 exits. SAC finds multiple diverse paths. Entropy/temperature slider.
   - Key Concept: Maximum entropy RL, exploration through randomness, temperature ("curiosity dial")

### Continuous Glacier Boss

**❄️ Island Boss: The Precision Gauntlet**
- Multi-stage obstacle course: Stage 1 = simple reach (DDPG), Stage 2 = reach under noise (TD3), Stage 3 = find multiple solutions through shifting ice (SAC). Player configures the right algorithm + hyperparams per stage.
- Tests: matching algorithm to challenge type
- Rewards: 3000 gold, Legendary Card: "Continuous Master", Ship: "Glacier Anchor"

---

## ✨ Convergence Harbor (融合之港)
- **Theme**: Where all routes meet — compare, contrast, and look ahead

**Content:**
1. **Algorithm Arena**: Side-by-side comparison of all learned algorithms on the same environment. Player picks any two and watches them compete.
2. **Evolution Tree**: Interactive visualization showing how all algorithms are connected and evolved from each other
3. **Frontier Telescope**: Brief overview of cutting-edge topics (Model-Based RL, Offline RL, Multi-Agent RL, RLHF) as "islands yet to be explored"
4. **Captain's Log**: Summary of everything learned, exportable as a cheat sheet

### Final Boss: The Grand Strategist *(Phase 4)*

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
6. **Quest Challenge** (5 min) — The port's unique quest (see Quest Design doc)
7. **Port Summary & Card Reward** (1 min) — Key takeaways, comparison with previous algorithms, collect algorithm card
8. **Unlock Next Port** — Sailing transition animation to next destination

### Session Design
- **Mid-port checkpoints**: Each of the 8 steps above is a save point. Leaving mid-port and returning resumes at the last completed step.
- **"Previously on..." recap**: When resuming a port, a 15-second pixel animation recaps completed steps.
- **Skip option**: Advanced users can skip steps 1-4 (story/primer/feel/explain) and jump straight to the quest via a "Skip to Challenge" button.
- **Estimated time per port**: 10-15 minutes for full experience, 5-7 minutes with skips.
