import { build, setPriority, toggleCategoryLimit, upgradeGrid } from '../actions';
import { loadContext } from '../loadContext';
import { tick } from '../simulation';
import type { GameContext, GameState } from '../types';

export const ctx: GameContext = loadContext();

/** Copie profonde du contexte pour modifier un paramètre dans un test. */
export function withConfig(patch: (c: GameContext['config']) => void): GameContext {
  const config = structuredClone(ctx.config);
  patch(config);
  return { config, map: ctx.map };
}

export function run(c: GameContext, s: GameState, months: number, each?: (s: GameState) => GameState): GameState {
  for (let i = 0; i < months && !s.defeat; i++) {
    s = tick(c, each ? each(s) : s);
  }
  return s;
}

export function freeTiles(c: GameContext, s: GameState): [number, number][] {
  const out: [number, number][] = [];
  c.map.tiles.forEach((row, y) =>
    [...row].forEach((t, x) => {
      if (t === '.' && !s.buildings.some((b) => b.x === x && b.y === y)) out.push([x, y]);
    }),
  );
  return out;
}

/**
 * Joueur automatique "raisonnable", utilisé pour vérifier l'équilibrage.
 * limitUsages = true : il limite tous les usages non essentiels dès la phase 2.
 */
export function bot(c: GameContext, limitUsages: boolean) {
  return (s: GameState): GameState => {
    const { config } = c;
    const m = s.metrics;
    let next = s;
    const tryAct = (r: { ok: boolean; state: GameState }) => {
      if (r.ok) next = r.state;
      return r.ok;
    };

    tryAct(setPriority(c, next, 'city'));

    if (limitUsages && next.phase === 'overuse') {
      for (const cat of config.usageCategories) {
        if (!cat.essential && !next.limitedCategories.includes(cat.id)) tryAct(toggleCategoryLimit(c, next, cat.id));
      }
    }

    // Calcul : garder 15 % de marge sur la demande (chantiers compris)
    const dcs = next.buildings.filter((b) => b.type === 'datacenter').length;
    if (dcs * config.datacenter.computePflops < m.demandPflops * 1.15) {
      const [x, y] = freeTiles(c, next)[0] ?? [-1, -1];
      tryAct(build(c, next, 'datacenter', x, y));
    }

    // Énergie : anticiper la construction lente des centrales (besoin à pleine charge + 10 %)
    const plants = next.buildings.filter((b) => b.type === 'powerPlant').length;
    const dcsAfter = next.buildings.filter((b) => b.type === 'datacenter').length;
    const need = config.city.powerMw + (dcsAfter + 2) * config.datacenter.powerMw;
    const net = plants * config.powerPlant.productionMw * (1 - m.lossRate);
    if (net < need * 1.1) {
      const [x, y] = freeTiles(c, next)[0] ?? [-1, -1];
      tryAct(build(c, next, 'powerPlant', x, y));
    }

    // Réseau : optimiser tôt, quand il reste de la marge
    if (next.rareEarthT > 600) tryAct(upgradeGrid(c, next));

    return next;
  };
}
