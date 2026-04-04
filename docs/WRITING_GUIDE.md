# Writing Guidelines for Explanations

## Target Audience
9th graders (14-15 years old) with no prior ML knowledge. Core philosophy: **"If a 9th grader can't understand it in 2 minutes, rewrite it."**

## Language Rules
1. **No jargon without metaphor**: Every technical term must be introduced with a real-world analogy first
2. **Progressive disclosure**: Start with the simplest version, add complexity only when asked
3. **Active voice**: "The agent explores" not "Exploration is performed by the agent"
4. **Conversational**: Write like you're explaining to a curious friend, not lecturing
5. **Visual-first**: If it can be shown, don't just tell. Pair every concept with a visualization.

## Example Explanations (tone reference)

**Q-Learning for 9th graders:**
> "Imagine you're new in school and trying to find the best lunch spot. Every day, you try a different route. When you find the cafeteria is great on Taco Tuesday, you mentally note: 'Going left at the hallway → cafeteria = awesome.' Over time, you build a mental map of which choices lead to the best outcomes. That mental map? That's a Q-table."

**Experience Replay for 9th graders:**
> "You know how when studying for a test, it's better to shuffle your flashcards instead of going in order? Experience Replay is exactly that — the AI shuffles its memories before studying them, so it learns better patterns instead of just remembering the last thing that happened."

**PPO Clipping for 9th graders:**
> "Imagine learning to skateboard. If your coach says 'lean forward more,' you shouldn't suddenly lean ALL the way forward — you'd fall! PPO is like a coach that says 'improve, but not too much at once.' It puts guardrails on how big each learning step can be."
