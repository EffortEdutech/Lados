'use client';

/**
 * useFloatingDockPosition — draggable position for global floating buttons.
 *
 * Why this exists: the AI Workflow Trigger and Owner Assistant buttons used
 * to be pinned to the bottom-right corner of every page. On the workflow
 * canvas that corner is already occupied by React Flow's own MiniMap /
 * Controls / attribution link, plus the paused-approval and run-error
 * banners — so the buttons sat on top of them and blocked clicks (e.g. the
 * banner's own close "x").
 *
 * This hook docks a button to a sensible default (right edge, vertically
 * centered — out of every corner React Flow or the banners use) and lets
 * the user drag it anywhere on screen. The chosen position is remembered
 * per-browser (localStorage) so it stays put across reloads/pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface DockPosition {
  x: number;
  y: number;
}

const DRAG_THRESHOLD_PX = 4; // movement below this is treated as a click, not a drag

export function useFloatingDockPosition(storageKey: string, computeDefault: () => DockPosition) {
  const [pos, setPos] = useState<DockPosition | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    offX: number;
    offY: number;
    dragging: boolean;
    moved: boolean;
  } | null>(null);

  const clamp = useCallback((p: DockPosition): DockPosition => {
    if (typeof window === 'undefined') return p;
    const margin = 8;
    return {
      x: Math.min(Math.max(p.x, margin), window.innerWidth - margin),
      y: Math.min(Math.max(p.y, margin), window.innerHeight - margin),
    };
  }, []);

  // Load saved position (or compute default) once, client-side only.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DockPosition>;
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPos(clamp({ x: parsed.x, y: parsed.y }));
          return;
        }
      }
    } catch {
      // ignore malformed storage
    }
    setPos(clamp(computeDefault()));
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Keep the button on-screen if the viewport is resized.
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clamp(p) : p));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!pos) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        offX: e.clientX - pos.x,
        offY: e.clientY - pos.y,
        dragging: true,
        moved: false,
      };
    },
    [pos],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const ds = dragState.current;
      if (!ds?.dragging) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) ds.moved = true;
      if (ds.moved) {
        setPos(clamp({ x: e.clientX - ds.offX, y: e.clientY - ds.offY }));
      }
    },
    [clamp],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const ds = dragState.current;
      if (!ds) return;
      ds.dragging = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setPos((p) => {
        if (p && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(p));
          } catch {
            // ignore storage failures (private mode, quota, etc.)
          }
        }
        return p;
      });
    },
    [storageKey],
  );

  /** Call inside onClick: returns true if the pointer session was a drag (skip the click action). */
  const wasDragged = useCallback(() => dragState.current?.moved === true, []);

  return { pos, onPointerDown, onPointerMove, onPointerUp, wasDragged };
}
