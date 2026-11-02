/**
 * Tests d'équilibrage : des joueurs automatiques jouent des parties complètes.
 * Ils garantissent le message pédagogique : construire ne suffit pas, il faut limiter les usages inutiles.
 * Si R3 recalibre les données et qu'un test casse, c'est l'équilibrage qu'il faut revoir.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../simulation';
import { bot, ctx, run } from './helpers';

const MAX_MONTHS = 50 * 12;
const secondsAtX1 = (months: number) => months / ctx.config.time.ticksPerSecond;

describe('équilibrage', () => {
  it('un joueur passif perd en phase 1', () => {
    const s = run(ctx, createInitialState(ctx), MAX_MONTHS);
    expect(s.defeat).not.toBeNull();
    expect(s.defeat?.phase).toBe('adoption');
  });

  it('un bâtisseur qui ne limite jamais les usages finit par perdre en phase 2', () => {
    const s = run(ctx, createInitialState(ctx), MAX_MONTHS, bot(ctx, false));
    expect(s.defeat).not.toBeNull();
    expect(s.defeat?.phase).toBe('overuse');
  });

  it('un joueur qui construit ET limite les usages inutiles stabilise sa planète', () => {
    const s = run(ctx, createInitialState(ctx), MAX_MONTHS, bot(ctx, true));
    expect(s.defeat).toBeNull();
    expect(s.stabilized).toBe(true);
  });

  it('la durée de partie tient dans un cours (10-15 min)', () => {
    let s = createInitialState(ctx);
    let stabilizedMonth = -1;
    const play = bot(ctx, true);
    for (let i = 0; i < MAX_MONTHS && stabilizedMonth < 0 && !s.defeat; i++) {
      s = run(ctx, s, 1, play);
      if (s.stabilized) stabilizedMonth = s.month;
    }
    expect(stabilizedMonth).toBeGreaterThan(0);
    // ~5 à 10 min à vitesse x1, ce qui laisse de la marge pour les pauses et la lecture des fiches
    expect(secondsAtX1(stabilizedMonth)).toBeGreaterThan(4 * 60);
    expect(secondsAtX1(stabilizedMonth)).toBeLessThan(10 * 60);
  });
});
