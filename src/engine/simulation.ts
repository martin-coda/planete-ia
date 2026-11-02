/**
 * Boucle de simulation (E1-1 à E1-4).
 * Fonctions pures : (état, contexte) -> nouvel état. Aucune dépendance à React ou Three.js.
 * 1 tick = 1 mois de jeu.
 */
import type { Building, GameContext, GameEvent, GameState, Metrics, Phase } from './types';

const ADOPTION_DONE = 0.999;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const isActive = (b: Building, month: number) => b.readyAt <= month;

/** Taux de pertes du réseau selon son niveau d'optimisation. */
export function lossRate(ctx: GameContext, gridLevel: number): number {
  const { baseLossRate, lossReductionPerLevel, minLossRate } = ctx.config.grid;
  return Math.max(minLossRate, baseLossRate - gridLevel * lossReductionPerLevel);
}

/**
 * Plafond de surconsommation. Limiter une catégorie abaisse le plafond :
 * la demande arrête de grimper plus tôt, et redescend si elle était au-dessus.
 */
export function overuseCap(ctx: GameContext, limited: string[]): number {
  const { limitEfficiency, maxExtra } = ctx.config.demand.overuse;
  const limitedShare = ctx.config.usageCategories
    .filter((c) => limited.includes(c.id))
    .reduce((s, c) => s + c.shareOfExtra, 0);
  return maxExtra * (1 - limitedShare * limitEfficiency);
}

/** Calcule demande, énergie et disponibilité pour un état donné. */
export function computeMetrics(
  ctx: GameContext,
  s: Pick<GameState, 'month' | 'adoption' | 'overuseExtra' | 'buildings' | 'gridLevel' | 'priority'>,
): Metrics {
  const { config } = ctx;
  const active = s.buildings.filter((b) => isActive(b, s.month));
  const datacenters = active.filter((b) => b.type === 'datacenter').length;
  const plants = active.filter((b) => b.type === 'powerPlant').length;

  // Demande = population × adoption × intensité × calcul par utilisateur
  const intensity = 1 + s.overuseExtra;
  const demandPflops = config.planet.population * s.adoption * intensity * config.demand.computePerUserPflops;
  const capacityPflops = datacenters * config.datacenter.computePflops;

  // Un datacenter consomme une part fixe à vide + le reste selon sa charge
  const load = capacityPflops > 0 ? Math.min(1, demandPflops / capacityPflops) : 0;
  const { powerMw, idlePowerShare } = config.datacenter;
  const datacenterNeedMw = datacenters * powerMw * (idlePowerShare + (1 - idlePowerShare) * load);
  const cityNeedMw = config.city.powerMw;

  // Production nette après pertes réseau
  const productionMw = plants * config.powerPlant.productionMw;
  const losses = lossRate(ctx, s.gridLevel);
  let available = productionMw * (1 - losses);

  // Distribution selon la priorité du joueur
  let cityGotMw: number;
  let datacenterGotMw: number;
  if (s.priority === 'city') {
    cityGotMw = Math.min(cityNeedMw, available);
    available -= cityGotMw;
    datacenterGotMw = Math.min(datacenterNeedMw, available);
  } else {
    datacenterGotMw = Math.min(datacenterNeedMw, available);
    available -= datacenterGotMw;
    cityGotMw = Math.min(cityNeedMw, available);
  }

  const dcRatio = datacenterNeedMw > 0 ? datacenterGotMw / datacenterNeedMw : 1;
  const servedPflops = Math.min(demandPflops, capacityPflops * dcRatio);
  const availability = demandPflops > 0 ? servedPflops / demandPflops : 1;

  return {
    demandPflops,
    capacityPflops,
    servedPflops,
    availability,
    intensity,
    productionMw,
    lossRate: losses,
    cityNeedMw,
    cityGotMw,
    datacenterNeedMw,
    datacenterGotMw,
  };
}

export function createInitialState(ctx: GameContext): GameState {
  const { config } = ctx;
  const buildings: Building[] = config.start.buildings.map((b, i) => ({ id: i + 1, ...b, readyAt: 0 }));
  const base = {
    month: 0,
    phase: 'adoption' as Phase,
    adoption: config.demand.adoption.initial,
    overuseExtra: 0,
    limitedCategories: [],
    buildings,
    gridLevel: 0,
    priority: 'city' as const,
  };
  const metrics = computeMetrics(ctx, base);
  return {
    ...base,
    nextBuildingId: buildings.length + 1,
    rareEarthT: config.rareEarth.initialStockT,
    trust: config.trust.initial,
    discoveredEggs: [],
    metrics,
    counters: { blackout: 0, resources: 0, stable: 0 },
    recentDemand: [metrics.demandPflops],
    stabilized: false,
    understood: false,
    defeat: null,
    events: [],
    history: [snapshot(0, metrics, config.trust.initial, config.rareEarth.initialStockT, base.adoption)],
  };
}

function snapshot(month: number, m: Metrics, trust: number, rareEarthT: number, adoption: number) {
  return {
    month,
    demandPflops: m.demandPflops,
    servedPflops: m.servedPflops,
    trust,
    rareEarthT,
    adoption,
    intensity: m.intensity,
  };
}

/** Perte de confiance du mois : plus la demande est haute, plus un manque d'IA coûte cher. */
export function trustDelta(ctx: GameContext, m: Metrics): number {
  const t = ctx.config.trust;
  const demandWeight = clamp(m.demandPflops / t.referenceDemandPflops, t.demandWeightMin, t.demandWeightMax);
  const cityRatio = m.cityNeedMw > 0 ? m.cityGotMw / m.cityNeedMw : 1;

  const availabilityPenalty = t.availabilityPenaltyPerMonth * (1 - m.availability) * demandWeight;
  const cityPenalty = t.cityPenaltyPerMonth * (1 - cityRatio);
  const allGood = m.availability >= 0.98 && cityRatio >= 0.999;

  return (allGood ? t.recoveryPerMonth : 0) - availabilityPenalty - cityPenalty;
}

/** Avance la simulation d'un mois. */
export function tick(ctx: GameContext, prev: GameState): GameState {
  if (prev.defeat) return { ...prev, events: [] };

  const { config } = ctx;
  const events: GameEvent[] = [];
  const month = prev.month + 1;

  // 1. Chantiers terminés
  for (const b of prev.buildings) {
    if (b.readyAt === month) events.push({ type: 'buildingReady', buildingId: b.id, buildingType: b.type });
  }

  // 2. Évolution de la demande
  let { adoption, overuseExtra, phase } = prev;
  if (phase === 'adoption') {
    // Croissance logistique de l'adoption jusqu'à 100 %
    adoption += config.demand.adoption.growthRatePerMonth * adoption * (1 - adoption);
    if (adoption >= ADOPTION_DONE) {
      adoption = 1;
      phase = 'overuse';
      overuseExtra = config.demand.overuse.initialExtra;
      events.push({ type: 'phase2Started' });
    }
  } else {
    // Phase 2 : la surconsommation tend vers son plafond (logistique ; décroît si au-dessus)
    const cap = overuseCap(ctx, prev.limitedCategories);
    overuseExtra += config.demand.overuse.growthRatePerMonth * overuseExtra * (1 - overuseExtra / cap);
  }

  // 3. Énergie, calcul, disponibilité
  const metrics = computeMetrics(ctx, { ...prev, month, adoption, overuseExtra });

  // 4. Prélèvement continu de terres rares par la ville
  const rareEarthT = Math.max(0, prev.rareEarthT - config.city.rareEarthTPerYear / 12);
  if (prev.rareEarthT > 0 && rareEarthT === 0) events.push({ type: 'rareEarthDepleted' });

  // 5. Confiance
  const trust = clamp(prev.trust + trustDelta(ctx, metrics), 0, 100);

  // 6. Conditions de défaite
  const e = config.end;
  const cityRatio = metrics.cityNeedMw > 0 ? metrics.cityGotMw / metrics.cityNeedMw : 1;
  const cannotBuild = rareEarthT < config.datacenter.costRareEarthT;
  const counters = {
    blackout: cityRatio < e.blackoutCityRatio ? prev.counters.blackout + 1 : 0,
    resources: cannotBuild && metrics.availability < e.resourcesAvailability ? prev.counters.resources + 1 : 0,
    stable: prev.counters.stable,
  };

  let defeat = null;
  if (trust <= 0) defeat = { reason: 'trust' as const, phase, month };
  else if (counters.blackout >= e.blackoutMonths) defeat = { reason: 'blackout' as const, phase, month };
  else if (counters.resources >= e.resourcesMonths) defeat = { reason: 'resources' as const, phase, month };
  if (defeat) events.push({ type: 'defeat', reason: defeat.reason });

  // 7. Stabilisation (phase 2) : service assuré, confiance correcte, demande qui ne croît plus
  const recentDemand = [...prev.recentDemand, metrics.demandPflops].slice(-13);
  const yearAgo = recentDemand.length === 13 ? recentDemand[0] : null;
  const yearlyGrowth = yearAgo && yearAgo > 0 ? metrics.demandPflops / yearAgo - 1 : Infinity;
  const stableNow =
    phase === 'overuse' &&
    metrics.availability >= e.stableMinAvailability &&
    trust >= e.stableMinTrust &&
    yearlyGrowth <= e.stableMaxYearlyDemandGrowth;
  counters.stable = stableNow ? prev.counters.stable + 1 : 0;

  let { stabilized, understood } = prev;
  if (!defeat && !stabilized && counters.stable >= e.stableMonths) {
    stabilized = true;
    events.push({ type: 'stabilized' });
  }
  if (!defeat && stabilized && !understood && allEggsFound(ctx, prev.discoveredEggs)) {
    understood = true;
    events.push({ type: 'understood' });
  }

  // 8. Historique annuel pour l'écran de bilan
  const history =
    month % 12 === 0 || defeat
      ? [...prev.history, snapshot(month, metrics, trust, rareEarthT, adoption)]
      : prev.history;

  return {
    ...prev,
    month,
    phase,
    adoption,
    overuseExtra,
    metrics,
    rareEarthT,
    trust,
    counters,
    recentDemand,
    stabilized,
    understood,
    defeat,
    events,
    history,
  };
}

export function allEggsFound(ctx: GameContext, discovered: string[]): boolean {
  return ctx.map.easterEggs.every((egg) => discovered.includes(egg.id));
}
