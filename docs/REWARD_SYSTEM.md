# Bounty & Reward System

## Gold (金币)
Earned from quests. Amount scales with performance (bounty rank multiplier). Gold is **cosmetic-only** — never gates learning content.

**Gold Shop (items are purely cosmetic):**
- Ship cosmetics: sails, figureheads, hull colors (visible on world map)
- Crew members: NPC pixel companions displayed on your ship
- Map decorations: reveal fog-of-war illustrations on unexplored parts of the sea map

**Retries are ALWAYS free.** A student can replay any quest unlimited times to improve their bounty rank. Learning from mistakes should never cost anything.

## Bounty Rank (悬赏等级)
Every quest rates performance with a bounty tier:

| Rank | Bounty Tier | Gold Multiplier | Meaning |
|------|-------------|-----------------|---------|
| S | Legendary | 3x gold | Optimal or near-optimal solution |
| A | High | 2x gold | Strong performance, good parameter tuning |
| B | Standard | 1x gold | Passed the quest, basic understanding |
| C | Rookie | 0.5x gold | Barely passed, consider retrying |

Threshold ranges are specified per quest (see QUEST_DESIGN.md). All thresholds are marked "calibrate via playtesting" — final numbers come from real user testing.

## Navigator Rank (航海士段位)
Total accumulated bounty gold determines the player's rank:

| Total Gold | Rank | Title |
|------------|------|-------|
| 0 – 2,000 | Rank 1 | Apprentice Sailor (见习水手) |
| 2,001 – 8,000 | Rank 2 | Navigator (航海士) |
| 8,001 – 20,000 | Rank 3 | First Mate (大副) |
| 20,001 – 40,000 | Rank 4 | Captain (船长) |
| 40,001+ | Rank 5 | Admiral of Intelligence (智慧提督) |

## Algorithm Cards (算法卡牌)
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
