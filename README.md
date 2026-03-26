# RL Odyssey ⚓ — 用游戏学强化学习

<p align="center">
  <strong>An 8-bit pixel-art adventure that teaches Reinforcement Learning algorithms to anyone.</strong>
</p>

<p align="center">
  <em>"If a 9th grader can't understand it in 2 minutes, rewrite it."</em>
</p>

---

## About This Project

**RL Odyssey** is an interactive, gamified web application that teaches reinforcement learning (RL) algorithms through an 8-bit pixel-art sea adventure. Players sail through the **Sea of Intelligence**, visiting island chains where each port introduces a different RL algorithm — from Multi-Armed Bandits all the way to PPO and SAC.

This is a **learning project**. The author built it as a way to deeply study every major reinforcement learning algorithm by implementing them from scratch in TypeScript — no TensorFlow, no PyTorch, just raw math running in the browser. If you want to truly understand an algorithm, there's no better way than to build it yourself, make it visual, and then explain it to a 14-year-old.

The entire project was developed with the assistance of **AI (Claude)**, demonstrating how human creativity and AI collaboration can produce ambitious educational tools. Every algorithm implementation, every visualization, and every explanation was crafted through this partnership — but every design decision and learning insight came from the human side.

---

## How It Works

### The World

You are an explorer sailing the **Sea of Intelligence (智慧之海)**. Three island chains stretch across the sea, each teaching a different family of RL algorithms:

| Route | Island | Algorithms | Theme |
|-------|--------|-----------|-------|
| 🏝️ | **Value Archipelago** | Multi-Armed Bandit → Q-Learning → DQN | "Everything can be scored" |
| 🌋 | **Policy Volcanic Isle** | REINFORCE → Actor-Critic → PPO | "Learn to act by instinct" |
| ❄️ | **Continuous Glacier** | DDPG → TD3 → SAC | "The world isn't black and white" |

All routes converge at **Convergence Harbor**, where you compare algorithms head-to-head and face the final boss.

### At Each Port

Every algorithm port follows the same flow:

1. **Story Intro** — A pixel-art cutscene sets up the problem
2. **Feel the Problem** — You try to solve it manually and experience why it's hard
3. **Meet the Algorithm** — Step-by-step visual explanation with real-world analogies
4. **Watch It Learn** — Real-time training visualization with adjustable hyperparameters
5. **Quest Challenge** — A unique challenge to test your understanding
6. **Card Reward** — Collect an algorithm trading card with stats and personality traits

### Reward System

- **Gold**: Earned from quests, purely cosmetic — never gates learning content
- **Bounty Ranks**: S / A / B / C performance tiers with gold multipliers
- **Navigator Ranks**: From Apprentice Sailor to Admiral of Intelligence
- **Algorithm Cards**: Collectible cards that personify each algorithm
- **Retries are always free** — learning from mistakes should never cost anything

---

## What I Learned

Building this project was my way of deeply studying reinforcement learning. Here are the algorithms I implemented from scratch:

### Value-Based Methods
- **Multi-Armed Bandit** — Epsilon-greedy and UCB exploration strategies
- **Q-Learning** — Tabular off-policy learning with the Bellman equation
- **DQN** — Neural network function approximation with experience replay and target networks

### Policy-Based Methods (Phase 2)
- **REINFORCE** — Vanilla policy gradient with reward-weighted updates
- **Actor-Critic** — Variance reduction through value baselines
- **A2C/A3C** — Parallel training with shared parameters
- **PPO** — Clipped surrogate objective for stable updates

### Continuous Control (Phase 3)
- **DDPG** — Deterministic policy gradient for continuous actions
- **TD3** — Twin critics, delayed updates, and target smoothing
- **SAC** — Maximum entropy reinforcement learning

Every algorithm runs entirely in the browser using a **hand-written neural network** (~150 lines of TypeScript) — real forward pass, backpropagation, and gradient descent. No ML library dependencies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + custom pixel-art utilities |
| State | Zustand |
| Routing | React Router v6 |
| Visualization | HTML5 Canvas + SVG |
| i18n | react-i18next (English + Chinese) |
| Neural Networks | Hand-written SimpleNN in TypeScript |
| Deployment | Vercel |

**Key constraint**: Pure frontend, no backend. All RL computation runs in the browser.

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/rl-odyssey.git
cd rl-odyssey

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Development Phases

- [x] **Phase 1 (MVP)** — Value Archipelago: Tutorial + Bandit + Q-Learning + DQN + Mini-Boss
- [ ] **Phase 1.5** — Complete Value Archipelago: SARSA + Double DQN + Dueling DQN + Full Boss
- [ ] **Phase 2** — Policy Volcanic Isle: REINFORCE + Actor-Critic + A2C + PPO
- [ ] **Phase 3** — Continuous Glacier: DDPG + TD3 + SAC
- [ ] **Phase 4** — Convergence Harbor: Algorithm Arena + Final Boss + Polish

---

## Design Principles

1. **Fun First** — If it's not fun, no one will learn
2. **Show, Don't Tell** — Algorithms should be *seen* working, not just described
3. **Fail Safely** — Wrong answers lead to learning moments, not dead ends
4. **Honest Simplification** — We simplify but never lie about how things work
5. **Respect the Learner** — Never punish curiosity, never gate learning behind currency

---

## Bilingual Support

All content is available in **English** and **Chinese (中文)**. Toggle anytime with the language button.

算法名称使用双语显示，例如："Q-Learning (Q学习)"

---

## License

MIT

---

<p align="center">
  Built with ❤️, curiosity, and Claude ⚓
</p>
