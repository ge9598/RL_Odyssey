# Quest Design — Per-Port Challenges

Each port has a unique quest with specific pass/fail thresholds and bounty rewards. All thresholds are marked "calibrate via playtesting" — final numbers come from real user testing.

---

## 🏝️ Value Archipelago Quests

### Port Bandit — "The Gambler's Dilemma"
- 5 treasure chests, each with unknown random payout. 100 turns to maximize gold.
- **Twist**: Chests change payout rates at turn 50 (non-stationary bandit).
- **Pass**: Earn more gold than a pure-random strategy
- **Thresholds**: C = 1.1x random, B = 1.5x, A = 2.0x, S = 2.5x+
- **Rewards**: 100–500 gold, Card: "Explorer's Instinct"

### Port Q-Table — "Escape the Cursed Island"
- Navigate a grid island with traps, treasure, and a hidden exit. Player controls the agent for 20 moves, then trains Q-Learning.
- **Pass**: Q-Learning finds a shorter path than the player's manual attempt
- **Thresholds**: C = ties player, B = 20% shorter, A = 40% shorter, S = optimal path found
- **Rewards**: 200–800 gold, Card: "The Cartographer"

### Port SARSA — "Cliffside Race" *(Phase 1.5)*
- Tune SARSA vs Q-Learning side by side on a cliff walk.
- **Pass**: SARSA finishes safely while Q-Learning falls off
- **Rewards**: 200–600 gold, Card: "The Cautious One"

### Port Deep — "Pixel Arcade Challenge"
- Play Breakout manually to set a high score. Train a DQN agent — tune replay buffer size and learning rate.
- **Pass**: DQN beats the player's manual high score
- **Thresholds**: C = ties player, B = 1.2x player score, A = 1.5x, S = 2x+
- **Rewards**: 500–1500 gold, Card: "Neural Navigator", Ship Part: "Reinforced Hull"

### Port Twin — "Spot the Overestimation" *(Phase 1.5)*
- Identify which Q-values are overestimated in a rigged demo
- **Rewards**: 300–700 gold, Card: "The Skeptic"

### Port Duel — "Split the Streams" *(Phase 1.5)*
- Separate state-value from advantage in a visual puzzle
- **Rewards**: 300–700 gold, Card: "The Analyst"

---

## 🌋 Policy Volcanic Isle Quests

### Port Reinforce — "The Dart Tournament"
- Adjust "learning courage" (learning rate). Too high = wild throws, too low = glacial improvement.
- **Pass**: Hit 3 bullseyes within 50 throws
- **Thresholds**: C = 3 hits, B = 5, A = 8, S = 12+
- **Rewards**: 200–700 gold, Card: "Instinct Thrower"

### Port Critic — "Master and Apprentice"
- Play as Critic (rate Actor's choices), then swap roles. Actor-Critic pair must complete a platformer faster than pure REINFORCE.
- **Pass**: Complete the level faster than REINFORCE baseline
- **Rewards**: 400–1000 gold, Card: "The Dual Mind"

### Port Parallel — "Army of Clones"
- Launch 2, 4, 8 parallel agents on a maze. They share learning.
- **Pass**: 8 agents solve the maze in < half the time of 1 agent
- **Rewards**: 500–1200 gold, Card: "Hivemind Captain"

### Port Proximal — "The Stability Trial"
- Train agent on wobbly bridge. Vanilla PG falls repeatedly. Adjust PPO's clipping range.
- **Pass**: Cross the bridge 3 times in a row without falling
- **Thresholds**: C = 3 crossings, B = 5, A = 8 consecutive, S = 10+ with minimal wobble
- **Rewards**: 800–2000 gold, Card: "Steady Hand", Ship Part: "Volcanic Sails"

---

## ❄️ Continuous Glacier Quests

### Port Deterministic — "Precision Reach"
- Robot arm must stack 3 ice blocks. Discrete actions fail — continuous control required.
- **Pass**: Stable stack for 10 seconds
- **Thresholds**: C = 3 blocks/5s, B = 3 blocks/10s, A = 4 blocks/10s, S = 5 blocks/10s
- **Rewards**: 500–1500 gold, Card: "Precision Engineer"

### Port Triple — "Triple Upgrade"
- DDPG keeps knocking over ice. Enable TD3's tricks one by one to improve.
- **Pass**: Enable all 3 and stack 5 blocks
- **Rewards**: 700–1800 gold, Card: "The Optimizer"

### Port Entropy — "The Curious Pathfinder"
- Find ALL 5 exits in the ice maze by tuning temperature.
- **Pass**: Discover all 5 paths
- **Thresholds**: C = 3 paths, B = 4, A = 5, S = 5 paths found in < 200 episodes
- **Rewards**: 1000–2500 gold, Card: "Entropy Master", Ship Part: "Aurora Engine"
