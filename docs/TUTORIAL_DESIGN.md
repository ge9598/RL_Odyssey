# Chapter 0: Starting Harbor — RL Fundamentals Tutorial

Before choosing any route, every player completes a **5-minute interactive tutorial** at the Starting Harbor. This teaches the core RL loop without naming any algorithm.

## The Tutorial: "Train Your Pixel Pet"
A pixel-art pet (dog/cat/robot, player chooses) is placed in a simple 4x4 grid. There's a treat somewhere on the grid.

### Step 1 — You ARE the pet (1 min)
Player controls the pet manually. Move around, find the treat. Simple.

### Step 2 — Now you're blindfolded (1 min)
Screen goes dark. Player must find the treat by memory/guessing. Introduces the idea: "What if you could LEARN which direction is usually good?"

### Step 3 — The learning loop (2 min)
Introduce the RL cycle with simple labels (no jargon):
- 🐕 **You** (Agent) look around → see **where you are** (State)
- You **choose a direction** (Action)
- The world **gives you feedback** — treat = 😊, wall = 😤, nothing = 😐 (Reward)
- You **remember** this for next time (Learning)
- Repeat!

Player watches the pet gradually learn to find the treat, with a visual "memory map" filling in.

### Step 4 — The big question (1 min)
"There are MANY ways to teach your pet to learn. Each island in the Sea of Intelligence teaches a different method. Which route will you sail first?"

→ World map opens with route selection.
