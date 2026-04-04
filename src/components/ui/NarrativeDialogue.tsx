import { useEffect, useRef, useState } from 'react';
import { PixelButton } from './PixelButton';

// ---------------------------------------------------------------------------
// NarrativeDialogue — RPG-style typewriter dialogue box
//
// Displays a sequence of dialogue lines from different speakers.
// Typewriter effect character-by-character.
// Sits at the bottom of the screen (or inline).
// ---------------------------------------------------------------------------

export interface DialogueLine {
  speaker: string;    // displayed name
  portrait: string;  // emoji avatar
  text: string;      // already-translated text
  color?: string;    // speaker name accent color (CSS)
}

interface NarrativeDialogueProps {
  lines: DialogueLine[];
  onComplete: () => void;
  /** If true, renders as a fixed overlay at bottom of screen. Default: inline */
  overlay?: boolean;
}

const DEFAULT_SPEED_MS = 28; // ms per character

export function NarrativeDialogue({ lines, onComplete, overlay = false }: NarrativeDialogueProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currentLine = lines[lineIndex];
  const currentText = currentLine?.text ?? '';
  const displayed = currentText.slice(0, charIndex);
  const isTyping = charIndex < currentText.length;

  // Typewriter tick
  useEffect(() => {
    if (!isTyping) return;
    timerRef.current = setTimeout(() => {
      setCharIndex((c) => c + 1);
    }, DEFAULT_SPEED_MS);
    return () => clearTimeout(timerRef.current);
  }, [isTyping, charIndex]);

  // Reset char index when line changes
  useEffect(() => {
    setCharIndex(0);
  }, [lineIndex]);

  const advance = () => {
    if (isTyping) {
      // Skip to end of current line instantly
      setCharIndex(currentText.length);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex((l) => l + 1);
    } else {
      setIsDone(true);
      onComplete();
    }
  };

  if (!currentLine || isDone) return null;

  const box = (
    <div
      className="glass-panel pixel-border rounded-sm p-5 max-w-2xl w-full relative"
      style={{ borderColor: 'rgba(0,212,255,0.4)' }}
    >
      {/* Progress dots */}
      <div className="absolute top-3 right-3 flex gap-1">
        {lines.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${i === lineIndex ? 'bg-[#00d4ff]' : i < lineIndex ? 'bg-[#4ade80]' : 'bg-[rgba(255,255,255,0.15)]'}`}
          />
        ))}
      </div>

      {/* Speaker row */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{currentLine.portrait}</span>
        <span
          className="font-pixel text-xs glow-accent"
          style={{ color: currentLine.color ?? '#00d4ff' }}
        >
          {currentLine.speaker}
        </span>
      </div>

      {/* Dialogue text */}
      <p className="font-body text-xl text-[#e2e8f0] leading-relaxed min-h-[3rem]">
        {displayed}
        {isTyping && <span className="animate-pulse">▋</span>}
      </p>

      {/* Advance button */}
      <div className="flex justify-end mt-3">
        <PixelButton size="sm" onClick={advance}>
          {isTyping ? '►' : lineIndex < lines.length - 1 ? '▶ Next' : '▶ Continue'}
        </PixelButton>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40">
        {box}
      </div>
    );
  }

  return box;
}
