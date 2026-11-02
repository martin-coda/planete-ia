import { describe, expect, it } from 'vitest';
import { build, canBuild, discoverEgg, setPriority, toggleCategoryLimit, upgradeGrid } from '../actions';
import { createInitialState, tick } from '../simulation';
import type { GameState } from '../types';
import { ctx } from './helpers';

const fresh = () => createInitialState(ctx);
const phase2 = (): GameState => ({ ...fresh(), phase: 'overuse', adoption: 1, overuseExtra: 0.5 });

describe('construction', () => {
  it('paie les terres rares tout de suite et met le bâtiment en chantier', () => {
    const s = fresh();
    const r = build(ctx, s, 'datacenter', 0, 4);
    expect(r.ok).toBe(true);
    expect(r.state.rareEarthT).toBe(s.rareEarthT - ctx.config.datacenter.costRareEarthT);
    expect(r.state.buildings.at(-1)?.readyAt).toBe(ctx.config.datacenter.buildMonths);
  });

  it('refuse les cases invalides', () => {
    const s = fresh();
    expect(canBuild(ctx, s, 'datacenter', 0, 0)).toBe('tileNotBuildable'); // eau
    expect(canBuild(ctx, s, 'datacenter', 8, 4)).toBe('tileNotBuildable'); // ville
    expect(canBuild(ctx, s, 'datacenter', 99, 0)).toBe('outOfMap');
    const { x, y } = ctx.config.start.buildings[0];
    expect(canBuild(ctx, s, 'datacenter', x, y)).toBe('tileOccupied');
  });

  it('refuse sans assez de terres rares', () => {
    const r = build(ctx, { ...fresh(), rareEarthT: 1 }, 'powerPlant', 0, 4);
    expect(r).toMatchObject({ ok: false, error: 'notEnoughRareEarth' });
  });

  it('refuse après une défaite', () => {
    const lost = tick(ctx, { ...fresh(), trust: 0.1, adoption: 1 });
    expect(build(ctx, lost, 'datacenter', 0, 4)).toMatchObject({ ok: false, error: 'gameOver' });
  });
});

describe('réseau', () => {
  it('chaque niveau réduit les pertes, jusqu’au niveau max', () => {
    let s = fresh();
    const before = s.metrics.lossRate;
    for (let i = 0; i < ctx.config.grid.maxLevel; i++) s = upgradeGrid(ctx, s).state;
    expect(s.metrics.lossRate).toBeLessThan(before);
    expect(upgradeGrid(ctx, s)).toMatchObject({ ok: false, error: 'gridMaxLevel' });
  });
});

describe('priorité', () => {
  it('change la priorité et recalcule les métriques immédiatement', () => {
    const r = setPriority(ctx, fresh(), 'datacenters');
    expect(r.state.priority).toBe('datacenters');
  });
});

describe('usages inutiles', () => {
  const nonEssential = ctx.config.usageCategories.find((c) => !c.essential)!;
  const essential = ctx.config.usageCategories.find((c) => c.essential)!;

  it('indisponible en phase 1', () => {
    expect(toggleCategoryLimit(ctx, fresh(), nonEssential.id)).toMatchObject({ ok: false, error: 'notInPhase2' });
  });

  it('limiter coûte de la confiance une fois, rétablir est gratuit', () => {
    const s = phase2();
    const limited = toggleCategoryLimit(ctx, s, nonEssential.id).state;
    expect(limited.limitedCategories).toContain(nonEssential.id);
    expect(limited.trust).toBe(s.trust - nonEssential.trustCostOnLimit);
    const restored = toggleCategoryLimit(ctx, limited, nonEssential.id).state;
    expect(restored.limitedCategories).not.toContain(nonEssential.id);
    expect(restored.trust).toBe(limited.trust);
  });

  it('refuse de limiter un usage essentiel ou inconnu', () => {
    expect(toggleCategoryLimit(ctx, phase2(), essential.id)).toMatchObject({ ok: false, error: 'categoryEssential' });
    expect(toggleCategoryLimit(ctx, phase2(), 'nope')).toMatchObject({ ok: false, error: 'unknownCategory' });
  });
});

describe('easter eggs', () => {
  const [egg] = ctx.map.easterEggs;

  it('débloque une fiche une seule fois', () => {
    const r = discoverEgg(ctx, fresh(), egg.x, egg.y);
    expect(r.state.discoveredEggs).toEqual([egg.id]);
    expect(discoverEgg(ctx, r.state, egg.x, egg.y)).toMatchObject({ ok: false, error: 'eggAlreadyFound' });
  });

  it('"vous avez compris les enjeux" quand la planète est stabilisée et tous les secrets trouvés', () => {
    let s: GameState = { ...fresh(), stabilized: true };
    for (const e of ctx.map.easterEggs) s = discoverEgg(ctx, s, e.x, e.y).state;
    expect(s.understood).toBe(true);
    expect(s.events).toContainEqual({ type: 'understood' });
  });
});
