/**
 * Utility functions for PixelBreakout, separated for React Fast Refresh compatibility.
 */

import { useRef, useCallback } from 'react';
import type { BreakoutState } from './PixelBreakout';

const BALL_BASE_SPEED = 3;

/** Encode game state as normalized vector for DQN */
export function encodeState(state: BreakoutState, w: number, h: number): number[] {
  return [
    state.ballX / w,
    state.ballY / h,
    state.ballVx / (BALL_BASE_SPEED * 2),
    state.ballVy / (BALL_BASE_SPEED * 2),
    state.paddleX / w,
  ];
}

/** Create initial game state */
export function createInitialState(w: number, h: number): BreakoutState {
  return {
    ballX: w / 2,
    ballY: h - 50,
    ballVx: BALL_BASE_SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballVy: -BALL_BASE_SPEED,
    paddleX: w / 2,
    bricks: Array.from({ length: 3 }, () => new Array(8).fill(true) as boolean[]),
    score: 0,
    lives: 1,
    gameOver: false,
    won: false,
  };
}

/** Hook for external game state management */
export function useBreakoutGame(width = 320, height = 400) {
  const stateRef = useRef<BreakoutState>(createInitialState(width, height));

  const reset = useCallback(() => {
    stateRef.current = createInitialState(width, height);
  }, [width, height]);

  const getState = useCallback(() => stateRef.current, []);

  const getEncodedState = useCallback(
    () => encodeState(stateRef.current, width, height),
    [width, height],
  );

  return { stateRef, reset, getState, getEncodedState };
}
