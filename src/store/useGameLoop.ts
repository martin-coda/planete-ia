import { useEffect } from 'react';
import { anyModal, useGame } from './gameStore';

const INTERACTIVE = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'SUMMARY']);

/**
 * Fait avancer la simulation selon la vitesse choisie, et gère les raccourcis globaux :
 * Échap ferme la fenêtre ouverte, annule le placement, ou met en pause ; Espace = pause.
 */
export function useGameLoop() {
  const speed = useGame((s) => s.speed);
  const screen = useGame((s) => s.screen);
  const ticksPerSecond = useGame((s) => s.ctx.config.time.ticksPerSecond);

  useEffect(() => {
    if (screen !== 'playing' || speed === 0) return;
    const id = setInterval(() => useGame.getState().step(), 1000 / (ticksPerSecond * speed));
    return () => clearInterval(id);
  }, [speed, screen, ticksPerSecond]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (e.key === 'Escape') {
        if (st.notices.length) st.dismissNotice();
        else if (st.rulesOpen) st.closeRules();
        else if (st.creditsOpen) st.closeCredits();
        else if (st.bilanOpen) st.closeBilan();
        else if (st.placing) st.startPlacing(null);
        else st.togglePause();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (e.key === ' ' && st.screen === 'playing' && !anyModal(st) && !INTERACTIVE.has(target?.tagName ?? '')) {
        e.preventDefault();
        st.togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
