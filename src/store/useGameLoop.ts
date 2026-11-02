import { useEffect } from 'react';
import { useGame } from './gameStore';

/** Fait avancer la simulation selon la vitesse choisie. Échap = pause. */
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
      if (e.key !== 'Escape') return;
      const st = useGame.getState();
      // Échap ferme d'abord les règles si elles sont ouvertes
      if (st.rulesOpen) st.closeRules();
      else if (st.screen === 'playing') st.togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
