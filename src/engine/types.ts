import type { GameConfig, GameMap } from './schema';

/** Tout ce dont le moteur a besoin, en lecture seule. */
export interface GameContext {
  config: GameConfig;
  map: GameMap;
}

export type BuildingType = 'datacenter' | 'powerPlant';
export type Phase = 'adoption' | 'overuse';
export type Priority = 'city' | 'datacenters';
export type DefeatReason = 'blackout' | 'resources' | 'trust';

export interface Building {
  id: number;
  type: BuildingType;
  x: number;
  y: number;
  /** Mois à partir duquel le bâtiment fonctionne */
  readyAt: number;
}

/** Valeurs calculées au dernier tick (lecture seule pour l'UI). */
export interface Metrics {
  demandPflops: number;
  capacityPflops: number;
  servedPflops: number;
  /** 0..1 */
  availability: number;
  /** Intensité d'usage (1 = 100 %) = 1 + surconsommation */
  intensity: number;
  productionMw: number;
  lossRate: number;
  cityNeedMw: number;
  cityGotMw: number;
  datacenterNeedMw: number;
  datacenterGotMw: number;
}

export type GameEvent =
  | { type: 'buildingReady'; buildingId: number; buildingType: BuildingType }
  | { type: 'phase2Started' }
  | { type: 'rareEarthDepleted' }
  | { type: 'stabilized' }
  | { type: 'understood' }
  | { type: 'defeat'; reason: DefeatReason };

export interface Outcome {
  reason: DefeatReason;
  /** Phase au moment de la défaite (en phase 2 l'UI peut montrer le fait "surconsommation") */
  phase: Phase;
  month: number;
}

/** Instantané annuel pour les graphiques de l'écran de bilan. */
export interface HistoryPoint {
  month: number;
  demandPflops: number;
  servedPflops: number;
  trust: number;
  rareEarthT: number;
  adoption: number;
  intensity: number;
}

export interface GameState {
  /** Mois écoulés depuis le début */
  month: number;
  phase: Phase;
  /** 0..1 */
  adoption: number;
  /** Surconsommation (phase 2) : 0.5 = intensité 150 % */
  overuseExtra: number;
  limitedCategories: string[];
  buildings: Building[];
  nextBuildingId: number;
  gridLevel: number;
  rareEarthT: number;
  /** 0..100 */
  trust: number;
  priority: Priority;
  discoveredEggs: string[];
  metrics: Metrics;
  /** Compteurs de mois consécutifs pour les conditions de fin */
  counters: { blackout: number; resources: number; stable: number };
  /** Demande des 13 derniers mois (pour mesurer la croissance sur 12 mois) */
  recentDemand: number[];
  stabilized: boolean;
  understood: boolean;
  /** null tant que la partie continue */
  defeat: Outcome | null;
  /** Événements produits par le dernier tick ou la dernière action */
  events: GameEvent[];
  history: HistoryPoint[];
}

export type ActionError =
  | 'gameOver'
  | 'notEnoughRareEarth'
  | 'outOfMap'
  | 'tileNotBuildable'
  | 'tileOccupied'
  | 'gridMaxLevel'
  | 'unknownCategory'
  | 'categoryEssential'
  | 'notInPhase2'
  | 'noEggHere'
  | 'eggAlreadyFound';

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError; state: GameState };
