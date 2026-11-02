/**
 * Actions du joueur. Pures : elles renvoient un nouvel état ou une erreur explicite.
 * Les métriques sont recalculées tout de suite pour que l'UI réagisse sans attendre le tick suivant.
 */
import { allEggsFound, computeMetrics } from './simulation';
import type { ActionError, ActionResult, BuildingType, GameContext, GameState, Priority } from './types';

const fail = (state: GameState, error: ActionError): ActionResult => ({ ok: false, error, state });

function done(ctx: GameContext, state: GameState): ActionResult {
  return { ok: true, state: { ...state, metrics: computeMetrics(ctx, state) } };
}

export function tileAt(ctx: GameContext, x: number, y: number): string | null {
  const row = ctx.map.tiles[y];
  return row !== undefined && x >= 0 && x < row.length ? row[x] : null;
}

export function buildCost(ctx: GameContext, type: BuildingType): number {
  return type === 'datacenter' ? ctx.config.datacenter.costRareEarthT : ctx.config.powerPlant.costRareEarthT;
}

/** Vérifie si on peut construire, sans modifier l'état (utile pour griser les boutons). */
export function canBuild(ctx: GameContext, s: GameState, type: BuildingType, x: number, y: number): ActionError | null {
  if (s.defeat) return 'gameOver';
  const tile = tileAt(ctx, x, y);
  if (tile === null) return 'outOfMap';
  if (tile !== '.') return 'tileNotBuildable';
  if (s.buildings.some((b) => b.x === x && b.y === y)) return 'tileOccupied';
  if (s.rareEarthT < buildCost(ctx, type)) return 'notEnoughRareEarth';
  return null;
}

/** Construit un bâtiment : coût en terres rares payé tout de suite, mise en service après le chantier. */
export function build(ctx: GameContext, s: GameState, type: BuildingType, x: number, y: number): ActionResult {
  const error = canBuild(ctx, s, type, x, y);
  if (error) return fail(s, error);

  const buildMonths = type === 'datacenter' ? ctx.config.datacenter.buildMonths : ctx.config.powerPlant.buildMonths;
  const building = { id: s.nextBuildingId, type, x, y, readyAt: s.month + buildMonths };
  return done(ctx, {
    ...s,
    buildings: [...s.buildings, building],
    nextBuildingId: s.nextBuildingId + 1,
    rareEarthT: s.rareEarthT - buildCost(ctx, type),
    events: [],
  });
}

/** Optimise le réseau électrique d'un niveau (moins de pertes). */
export function upgradeGrid(ctx: GameContext, s: GameState): ActionResult {
  if (s.defeat) return fail(s, 'gameOver');
  const { maxLevel, upgradeCostRareEarthT } = ctx.config.grid;
  if (s.gridLevel >= maxLevel) return fail(s, 'gridMaxLevel');
  if (s.rareEarthT < upgradeCostRareEarthT) return fail(s, 'notEnoughRareEarth');
  return done(ctx, { ...s, gridLevel: s.gridLevel + 1, rareEarthT: s.rareEarthT - upgradeCostRareEarthT, events: [] });
}

export function setPriority(ctx: GameContext, s: GameState, priority: Priority): ActionResult {
  if (s.defeat) return fail(s, 'gameOver');
  return done(ctx, { ...s, priority, events: [] });
}

/**
 * Limite (ou rétablit) une catégorie d'usage non essentielle. Disponible en phase 2 uniquement.
 * Limiter coûte de la confiance une fois ; rétablir est gratuit.
 */
export function toggleCategoryLimit(ctx: GameContext, s: GameState, categoryId: string): ActionResult {
  if (s.defeat) return fail(s, 'gameOver');
  if (s.phase !== 'overuse') return fail(s, 'notInPhase2');
  const category = ctx.config.usageCategories.find((c) => c.id === categoryId);
  if (!category) return fail(s, 'unknownCategory');
  if (category.essential) return fail(s, 'categoryEssential');

  const isLimited = s.limitedCategories.includes(categoryId);
  return done(ctx, {
    ...s,
    limitedCategories: isLimited
      ? s.limitedCategories.filter((id) => id !== categoryId)
      : [...s.limitedCategories, categoryId],
    trust: isLimited ? s.trust : Math.max(0, s.trust - category.trustCostOnLimit),
    events: [],
  });
}

/** Le joueur clique une case : si un easter egg s'y cache, la fiche est débloquée. */
export function discoverEgg(ctx: GameContext, s: GameState, x: number, y: number): ActionResult {
  if (s.defeat) return fail(s, 'gameOver');
  const egg = ctx.map.easterEggs.find((e) => e.x === x && e.y === y);
  if (!egg) return fail(s, 'noEggHere');
  if (s.discoveredEggs.includes(egg.id)) return fail(s, 'eggAlreadyFound');

  const discoveredEggs = [...s.discoveredEggs, egg.id];
  const understood = s.stabilized && allEggsFound(ctx, discoveredEggs);
  return done(ctx, {
    ...s,
    discoveredEggs,
    understood: s.understood || understood,
    events: understood && !s.understood ? [{ type: 'understood' }] : [],
  });
}
