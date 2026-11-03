/**
 * Relie chaque jauge aux lignes du tableau de traçabilité et aux sources (E2-6).
 * Ajouter un paramètre ici suffit pour qu'il apparaisse dans l'infobulle « D'où vient ce chiffre ? ».
 */
import factsJson from '../data/facts.json';
import sourcesJson from '../data/sources.json';
import traceJson from '../data/traceability.json';
import type { Fact, Source, Traceability } from '../engine';

export const SOURCES = sourcesJson as Source[];
export const TRACEABILITY = traceJson as Traceability[];
export const FACTS = factsJson as Fact[];

export const sourceById = (id: string | null | undefined) => SOURCES.find((s) => s.id === id);
export const factById = (id: string) => FACTS.find((f) => f.id === id);

export type GaugeKey = 'compute' | 'energy' | 'rareEarth' | 'trust' | 'demand';

export const GAUGE_PARAMS: Record<GaugeKey, string[]> = {
  compute: ['demand.computePerUserPflops', 'usageCategories'],
  energy: ['city.powerMw', 'datacenter.powerMw', 'powerPlant.productionMw', 'grid.baseLossRate'],
  rareEarth: ['rareEarth.initialStockT', 'datacenter.costRareEarthT'],
  trust: ['trust.initial'],
  demand: ['demand.adoption.growthRatePerMonth', 'demand.overuse.maxExtra'],
};

export interface SourceRow {
  param: string;
  realValue: string;
  source?: Source;
  provisional: boolean;
}

/** Ligne de traçabilité d'un paramètre, ou à défaut de son parent (ex. « datacenter » pour « datacenter.powerMw »). */
function traceFor(param: string): Traceability | undefined {
  const parts = param.split('.');
  for (let i = parts.length; i > 0; i--) {
    const t = TRACEABILITY.find((row) => row.param === parts.slice(0, i).join('.'));
    if (t) return t;
  }
  return undefined;
}

export function sourcesFor(key: GaugeKey): SourceRow[] {
  const seen = new Set<string>();
  return GAUGE_PARAMS[key].flatMap((param) => {
    const t = traceFor(param);
    if (!t || seen.has(t.param)) return [];
    seen.add(t.param);
    // Pour un choix de conception, on affiche sa justification plutôt que « Choix de conception »
    const realValue = t.sourceId ? t.realValue : t.transformation;
    return [{ param: t.param, realValue, source: sourceById(t.sourceId), provisional: t.status === 'placeholder' }];
  });
}
