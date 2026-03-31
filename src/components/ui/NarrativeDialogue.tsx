import { useEffect, useRef, useState } from 'react';

export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
}

interface NarrativeDialogueProps {
  lines: DialogueLine[];
  onComplete: () => void;
  /** Highlight color for speaker name (CSS color) */
  speakerColor?: string;
  autoAdvanceMs?: number;
}

const TYPING_SPEED_MS = 25; // ms per character

/**
 * RPG-style dialogue box with typewriter effect.
 * Shows one line at a time, click / Next advances.
 * When all lines are shown, calls onComplete.
 */
export function NarrativeDialogue({
  lines,
  onComplete,
  speakerColor = '#00d4ff',
  autoAdvanceMs,
}: NarrativeDialogueProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLine = lines[lineIndex];

  // Typewriter effect
  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    intervalRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(currentLine.text.slice(0, charIndex));
      if (charIndex >= currentLine.text.length) {
        clearInterval(intervalRef.current!);
        setIsTyping(false);
      }
    }, TYPING_SPEED_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lineIndex, currentLine]);

  // Auto-advance when typing is done (if configured)
  useEffect(() => {
    if (!isTyping && autoAdvanceMs) {
      autoAdvanceRef.current = setTimeout(handleAdvance, autoAdvanceMs);
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping]);

  const handleAdvance = () => {
    // If still typing, skip to end of current line
    if (isTyping) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }
    // Advance to next line or complete
    const next = lineIndex + 1;
    if (next < lines.length) {
      setLineIndex(next);
    } else {
      onComplete();
    }
  };

  if (!currentLine) return null;
  const isLast = lineIndex === lines.length - 1;

  return (
    <div
      className="w-full max-w-2xl mx-auto glass-panel pixel-border rounded-sm cursor-pointer select-none"
      style={{ padding: '16px 20px' }}
      onClick={handleAdvance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAdvance(); }}
    >
      <div className="flex items-start gap-4">
        {/* Portrait */}
        <div className="text-4xl flex-shrink-0 mt-1">{currentLine.portrait}</div>

        <div className="flex-1 min-w-0">
          {/* Speaker name */}
          <p
            className="font-pixel text-[10px] uppercase tracking-wider mb-1"
            style={{ color: speakerColor }}
          >
            {currentLine.speaker}
          </p>

          {/* Dialogue text */}
          <p className="font-body text-lg text-[#e2e8f0] leading-relaxed min-h-[3rem]">
            {displayedText}
            {isTyping && <span className="animate-pulse text-[#00d4ff]">▌</span>}
          </p>
        </div>
      </div>

      {/* Advance indicator */}
      <div className="flex justify-between items-center mt-2">
        {/* Line dots */}
        <div className="flex gap-1">
          {lines.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i === lineIndex ? speakerColor : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>

        {!isTyping && (
          <span className="font-pixel text-[9px] text-[#708090] animate-pulse">
            {isLast ? 'Continue →' : 'Next ▼'}
          </span>
        )}
      </div>
    </div>
  );
}
