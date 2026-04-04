# RL Odyssey — Learn Reinforcement Learning in 9th Grade

## Project Overview

**RL Odyssey** is an interactive, gamified web application that teaches reinforcement learning algorithms through an HD pixel-art adventure. Target audience: 9th graders (14-15 years old) with no prior ML knowledge. Every algorithm explanation must use analogies, visual metaphors, and hands-on interaction — never academic jargon.

Core philosophy: **"If a 9th grader can't understand it in 2 minutes, rewrite it."**

> **Design docs** (game narrative, quest specs, reward tables, writing style):
> - `docs/GAME_DESIGN.md` — World design, all 3 routes, ports, bosses, interaction modes
> - `docs/TUTORIAL_DESIGN.md` — Chapter 0: Starting Harbor tutorial flow
> - `docs/QUEST_DESIGN.md` — Per-port quest rules, pass thresholds, rewards
> - `docs/REWARD_SYSTEM.md` — Gold, bounty ranks, navigator ranks, algorithm cards
> - `docs/WRITING_GUIDE.md` — Tone, language rules, example explanations

---

## 🛠️ Technical Architecture

### Tech Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + custom pixel-art CSS utilities
- **State Management**: Zustand
- **Routing**: React Router v6
- **Visualization**: HTML5 Canvas + SVG
- **Animation**: CSS animations + requestAnimationFrame for Canvas
- **i18n**: react-i18next
- **Deployment**: Vercel

### Project Structure
```
rl-odyssey/
├── docs/                     # Game design documents (see above)
├── public/assets/
│   ├── sprites/              # Pixel art sprite sheets
│   ├── maps/                 # World map tiles / static map PNG
│   ├── cards/                # Algorithm card art
│   └── fonts/                # Pixel fonts
├── src/
│   ├── components/
│   │   ├── ui/               # Reusable UI (Button, Slider, Panel, Modal, Tooltip, Card)
│   │   ├── map/              # World map, island navigation, hotspots
│   │   ├── port/             # Port (level) layout, flow controller, recap
│   │   ├── quest/            # Quest framework, pass/fail evaluation, bounty display
│   │   ├── boss/             # Boss battle framework
│   │   └── visualizations/   # Reusable viz (QTableHeatmap, RewardChart, NetworkDiagram, PolicyDistribution, RadarChart)
│   ├── algorithms/           # Pure TS implementations of RL algorithms
│   ├── nn/                   # Hand-coded tiny neural network (SimpleNN, layers, optimizer)
│   ├── environments/         # Interactive environments for each algorithm
│   ├── islands/              # Island-specific pages (tutorial, value, policy, continuous, convergence)
│   ├── rewards/              # Bounty system, card collection, shop, navigator rank
│   ├── i18n/                 # en.json, zh.json
│   ├── stores/               # Zustand stores (gameStore, algorithmStore, cardStore)
│   ├── hooks/                # useAlgorithm, useCanvas, useQuest, useI18n
│   ├── utils/                # math, pixelRenderer, animation, seededRandom, saveManager
│   └── styles/               # pixel.css, themes/
```

### Canvas-React Integration Pattern
```
Zustand Store → React Component (props) → Canvas Renderer (reads only)
     ↑                                            |
     └────── User Input (sliders, buttons) ────────┘
```

- Canvas components are **leaf nodes** — receive state as props, render via `useEffect` + `requestAnimationFrame`
- Canvas **never** modifies application state — only reads and renders
- DOM sliders/buttons dispatch actions to Zustand stores
- Canvas click/touch events forwarded to React event handlers → Zustand
- Use `useCanvas` hook for Canvas lifecycle (create, resize, destroy)

### Algorithm Implementation Guidelines

All RL algorithms run **in the browser** using TypeScript. Simplified for educational purposes:

- **SimpleNN for DQN+**: Hand-coded 2-layer neural network in `src/nn/SimpleNN.ts` (~150 lines). No TensorFlow.js in Phase 1-2. TF.js optional from Phase 3.
- **Step-by-step execution**: Every algorithm supports `step()` returning enough data to visualize the update
- **Speed control**: All training loops are pausable, steppable, and speed-adjustable (1x, 2x, 5x, 10x, Max)
- **Deterministic replay**: Seed-based RNG (`seededRandom.ts`) for reproducible demos
- **State serialization**: Algorithm state can be saved/loaded for resume

### Algorithm Interface
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
- **Primary**: `localStorage` for automatic progress saving
- **Export/Import**: JSON file download/upload for cross-device transfer
- **Per-port checkpoints**: Each step within a port is a save point

---

## 🖼️ Visual Design System

### HD Pixel Art Style (Celeste / Stardew Valley tier)
- **Base tile size**: 48×48 pixels, display at 96×96 with `image-rendering: pixelated`
- **Color Palette**: 32+ colors per island theme with subtle gradients:
  - Value Archipelago: turquoise, gold, sandy beige, palm green
  - Policy Volcanic Isle: deep red, orange, charcoal, molten gold
  - Continuous Glacier: ice blue, white, aurora green/purple, steel gray
  - UI Chrome: Dark navy (#0a0e27) with radial gradients, accent glows per island

### Typography (bilingual EN + CN)
- Headings (EN): "Silkscreen" | Headings (CN): "ZCOOL QingKe HuangYou"
- Body (EN): "VT323" | Body (CN): "Noto Sans SC"
- `--font-pixel: "Silkscreen", "ZCOOL QingKe HuangYou", system-ui, sans-serif`
- `--font-body: "VT323", "Noto Sans SC", system-ui, sans-serif`

### CSS Effects
- Glow effects (text-shadow, box-shadow), glassmorphism-lite panels
- Gradient backgrounds, smooth transitions, float/wave/shimmer animations
- CSS `image-rendering: pixelated` (Chrome/Edge) + `crisp-edges` (Firefox)

### Asset Pipeline
- Sprite sheet format: TexturePacker JSON Array or manual PNG grid
- Animation frames: Idle 4, Walk 6, Sail 4, Celebrate 6
- Asset naming: `{island}_{entity}_{action}_{frame}.png`

### UI Layout
- **World Map**: MVP = static pixel-art PNG with CSS hotspots. Phase 2+ = Canvas.
- **Port View**: Split layout — game area (left/top) + explanation panel (right/bottom) + hyperparameter controls (bottom bar)
- **Responsive**: Desktop-first, min 1024px. Mobile gets simplified "story mode".

---

## 🌐 Internationalization

- Bilingual EN + CN, language toggle in top-right corner
- JSON-based: `src/i18n/en.json` and `src/i18n/zh.json`
- Algorithm names in both: "Q-Learning (Q学习)"
- Auto-detect browser language, fallback to English

---

## 🎯 Design Principles

1. **Fun First**: Every screen should have something to click, drag, or watch
2. **Show, Don't Tell**: Visualizations are the primary teaching tool
3. **Fail Safely**: Wrong answers → learning moments, not dead ends. **Retries always free.**
4. **Honest Simplification**: Simplify but never lie. Acknowledge omitted complexity.
5. **Pixel Perfect**: HD pixel aesthetic makes complex concepts approachable
6. **Respect the Learner**: Never gate learning behind currency. Never make students feel dumb.

---

## 🚧 Important Constraints

- **Pure frontend**: No backend server. All computation in the browser.
- **No heavy ML libraries**: No TensorFlow.js in Phase 1-2. Hand-written SimpleNN only.
- **Performance**: Algorithm visualizations at 60fps. Canvas for heavy rendering, DOM for UI.
- **Bundle size**: Under 2MB initial load. Lazy-load island assets per route.
- **Accessibility**: All interactive elements keyboard-navigable. High contrast mode.
- **Free retries**: Gold is cosmetic-only. Never charge for replaying content.

---

## 📋 Development Phases

### Phase 1 — MVP: Value Archipelago Core ✅
Playable first island: tutorial + 3 algorithms (Bandit, Q-Learning, DQN) + mini-boss + bounty system + bilingual + save system.

### Phase 1.5 — Complete Value Archipelago
Add SARSA, Double DQN, Dueling DQN + full Island Boss: The Overconfident Oracle.

### Phase 2 — Policy Volcanic Isle ✅ (in progress)
REINFORCE, Actor-Critic, A2C/A3C, PPO + environments + Island Boss: The Chaos Volcano. Animated world map.

### Phase 3 — Continuous Glacier
DDPG, TD3, SAC + continuous action environments + Island Boss. Optional TensorFlow.js.

### Phase 4 — Convergence Harbor + Polish
Algorithm Arena, Evolution Tree, Final Boss: The Grand Strategist. Sound, mobile, performance.

### Scope Reduction (if time is tight)
- **Cut first**: Sound, mobile, animated map
- **Simplify**: Fewer quest thresholds
- **Defer**: Synthesis cards, ship cosmetics → Phase 4+
- **Reuse**: GridWorld for multiple algorithms
