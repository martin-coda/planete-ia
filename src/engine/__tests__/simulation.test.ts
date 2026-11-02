import { describe, expect, it } from 'vitest';
import { computeMetrics, createInitialState, lossRate, overuseCap, tick, trustDelta } from '../simulation';
import type { GameState } from '../types';
import { ctx, run, withConfig } from './helpers';

describe('état initial', () => {
  const s = createInitialState(ctx);

  it('démarre en phase 1 avec les bâtiments de départ actifs', () => {
    expect(s.phase).toBe('adoption');
    expect(s.month).toBe(0);
    expect(s.buildings).toHaveLength(ctx.config.start.buildings.length);
    expect(s.metrics.capacityPflops).toBe(ctx.config.datacenter.computePflops);
  });

  it('demande = population × adoption × intensité × calcul par utilisateur', () => {
    const { population } = ctx.config.planet;
    expect(s.metrics.demandPflops).toBeCloseTo(population * 0.02 * 1 * ctx.config.demand.computePerUserPflops);
  });
});

describe('demande', () => {
  it("l'adoption croît chaque mois en phase 1", () => {
    const s0 = createInitialState(ctx);
    const s1 = tick(ctx, s0);
    expect(s1.adoption).toBeGreaterThan(s0.adoption);
    expect(s1.metrics.demandPflops).toBeGreaterThan(s0.metrics.demandPflops);
  });

  it('passe en phase 2 quand l’adoption atteint 100 %, avec un événement', () => {
    const s0 = { ...createInitialState(ctx), adoption: 0.999 };
    const s1 = tick(ctx, s0);
    expect(s1.phase).toBe('overuse');
    expect(s1.adoption).toBe(1);
    expect(s1.events).toContainEqual({ type: 'phase2Started' });
    expect(s1.overuseExtra).toBe(ctx.config.demand.overuse.initialExtra);
  });

  it("en phase 2 l'intensité dépasse 100 % et plafonne", () => {
    const s0: GameState = { ...createInitialState(ctx), phase: 'overuse', adoption: 1, overuseExtra: 0.05 };
    const huge = withConfig((c) => (c.trust.availabilityPenaltyPerMonth = 0));
    const s = run(huge, s0, 600);
    expect(s.metrics.intensity).toBeGreaterThan(1);
    expect(s.overuseExtra).toBeLessThanOrEqual(ctx.config.demand.overuse.maxExtra + 1e-9);
    expect(s.overuseExtra).toBeCloseTo(ctx.config.demand.overuse.maxExtra, 2);
  });

  it('limiter les usages abaisse le plafond, et la surconsommation redescend', () => {
    const nonEssential = ctx.config.usageCategories.filter((c) => !c.essential).map((c) => c.id);
    expect(overuseCap(ctx, nonEssential)).toBeLessThan(overuseCap(ctx, []));

    const s0: GameState = {
      ...createInitialState(ctx),
      phase: 'overuse',
      adoption: 1,
      overuseExtra: ctx.config.demand.overuse.maxExtra,
      limitedCategories: nonEssential,
    };
    const s1 = tick(ctx, s0);
    expect(s1.overuseExtra).toBeLessThan(s0.overuseExtra);
  });
});

describe('énergie', () => {
  const base = createInitialState(ctx);

  it('les pertes réseau baissent avec le niveau, sans passer sous le minimum', () => {
    expect(lossRate(ctx, 1)).toBeLessThan(lossRate(ctx, 0));
    expect(lossRate(ctx, 99)).toBe(ctx.config.grid.minLossRate);
  });

  it('priorité ville : la ville est servie en premier quand l’énergie manque', () => {
    // 6 datacenters à pleine charge pour 1 seule centrale
    const s: GameState = {
      ...base,
      adoption: 1,
      buildings: [
        ...base.buildings,
        ...[1, 2, 3, 4, 5].map((i) => ({ id: 10 + i, type: 'datacenter' as const, x: i, y: 0, readyAt: 0 })),
      ],
    };
    const city = computeMetrics(ctx, { ...s, priority: 'city' });
    expect(city.cityGotMw).toBe(city.cityNeedMw);
    expect(city.availability).toBeLessThan(1);

    const dc = computeMetrics(ctx, { ...s, priority: 'datacenters' });
    expect(dc.datacenterGotMw).toBeGreaterThan(city.datacenterGotMw);
    expect(dc.cityGotMw).toBeLessThan(dc.cityNeedMw);
    expect(dc.availability).toBeGreaterThan(city.availability);
  });

  it('un bâtiment en chantier ne produit rien', () => {
    const s: GameState = {
      ...base,
      buildings: [...base.buildings, { id: 99, type: 'powerPlant', x: 0, y: 4, readyAt: 5 }],
    };
    expect(computeMetrics(ctx, s).productionMw).toBe(base.metrics.productionMw);
    expect(computeMetrics(ctx, { ...s, month: 5 }).productionMw).toBeGreaterThan(base.metrics.productionMw);
  });

  it("émet un événement quand un chantier se termine", () => {
    const s: GameState = {
      ...base,
      buildings: [...base.buildings, { id: 99, type: 'datacenter', x: 0, y: 4, readyAt: 1 }],
    };
    expect(tick(ctx, s).events).toContainEqual({ type: 'buildingReady', buildingId: 99, buildingType: 'datacenter' });
  });
});

describe('confiance', () => {
  const m = createInitialState(ctx).metrics;

  it('remonte doucement quand tout va bien', () => {
    expect(trustDelta(ctx, { ...m, availability: 1 })).toBe(ctx.config.trust.recoveryPerMonth);
  });

  it('un manque d’IA coûte plus cher quand la demande est haute', () => {
    const low = trustDelta(ctx, { ...m, availability: 0.5, demandPflops: 5 });
    const high = trustDelta(ctx, { ...m, availability: 0.5, demandPflops: 100 });
    expect(high).toBeLessThan(low);
    expect(low).toBeLessThan(0);
  });

  it('un manque d’énergie en ville fait baisser la confiance', () => {
    expect(trustDelta(ctx, { ...m, cityGotMw: m.cityNeedMw / 2 })).toBeLessThan(0);
  });
});

describe('fins de partie', () => {
  it('défaite "confiance" quand la confiance atteint 0', () => {
    const s = tick(ctx, { ...createInitialState(ctx), trust: 0.1, adoption: 1 });
    expect(s.defeat?.reason).toBe('trust');
    expect(s.events).toContainEqual({ type: 'defeat', reason: 'trust' });
  });

  it('défaite "panne" après plusieurs mois de ville sous-alimentée', () => {
    const noPlant = createInitialState(ctx);
    const s0: GameState = { ...noPlant, trust: 100, buildings: noPlant.buildings.filter((b) => b.type !== 'powerPlant') };
    const c = withConfig((cfg) => (cfg.trust.cityPenaltyPerMonth = 0));
    const s = run(c, s0, 20);
    expect(s.defeat?.reason).toBe('blackout');
    expect(s.defeat?.month).toBe(ctx.config.end.blackoutMonths);
  });

  it('défaite "ressources" quand on ne peut plus construire et que l’IA manque', () => {
    const c = withConfig((cfg) => (cfg.trust.availabilityPenaltyPerMonth = 0));
    const s0: GameState = { ...createInitialState(ctx), adoption: 1, rareEarthT: 10 };
    const s = run(c, s0, 30);
    expect(s.defeat?.reason).toBe('resources');
  });

  it('une fois perdue, la partie ne bouge plus', () => {
    const lost = tick(ctx, { ...createInitialState(ctx), trust: 0.1, adoption: 1 });
    const after = tick(ctx, lost);
    expect(after.month).toBe(lost.month);
    expect(after.events).toEqual([]);
  });

  it('la ville prélève des terres rares même sans construction', () => {
    const s0 = createInitialState(ctx);
    const s12 = run(ctx, s0, 12);
    expect(s12.rareEarthT).toBeCloseTo(s0.rareEarthT - ctx.config.city.rareEarthTPerYear);
  });

  it('enregistre un point d’historique par an', () => {
    const s = run(ctx, createInitialState(ctx), 24);
    expect(s.history.map((h) => h.month)).toEqual([0, 12, 24]);
  });
});
