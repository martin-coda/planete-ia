/**
 * Pont entre le moteur (pur) et React. Le HUD et la scène 3D lisent ce store ; seules les actions ci-dessous le modifient.
 */
import { create } from 'zustand';
import {
  build,
  createInitialState,
  discoverEgg,
  loadContext,
  setPriority,
  tick,
  toggleCategoryLimit,
  upgradeGrid,
  type ActionError,
  type ActionResult,
  type BuildingType,
  type GameEvent,
  type GameState,
  type Priority,
} from '../engine';

const ctx = loadContext();

export type Screen = 'menu' | 'playing' | 'end';
export type Speed = 0 | 1 | 2 | 5;

interface GameStore {
  ctx: typeof ctx;
  game: GameState;
  screen: Screen;
  speed: Speed;
  selectedTile: { x: number; y: number } | null;
  lastError: ActionError | null;
  /** Derniers événements, du plus récent au plus ancien */
  log: { month: number; event: GameEvent }[];
  /** Fenêtre des règles ouverte (met le jeu en pause) */
  rulesOpen: boolean;

  newGame: () => void;
  openRules: () => void;
  closeRules: () => void;
  backToMenu: () => void;
  setSpeed: (speed: Speed) => void;
  togglePause: () => void;
  step: () => void;
  selectTile: (x: number, y: number) => void;
  buildHere: (type: BuildingType) => void;
  upgradeGrid: () => void;
  setPriority: (p: Priority) => void;
  toggleCategory: (id: string) => void;
}

export const useGame = create<GameStore>((set, get) => {
  /** Applique le résultat d'une action et journalise ses événements. */
  const apply = (r: ActionResult) =>
    set((st) => ({
      game: r.state,
      lastError: r.ok ? null : r.error,
      log: [...r.state.events.map((event) => ({ month: r.state.month, event })).reverse(), ...st.log].slice(0, 30),
    }));

  let lastSpeed: Speed = 1;
  /** Vitesse à rétablir quand on ferme les règles */
  let speedBeforeRules: Speed = 0;

  return {
    ctx,
    game: createInitialState(ctx),
    screen: 'menu',
    speed: 0,
    selectedTile: null,
    lastError: null,
    log: [],
    rulesOpen: false,

    openRules: () => {
      if (get().rulesOpen) return;
      speedBeforeRules = get().speed;
      set({ rulesOpen: true, speed: 0 });
    },
    closeRules: () => set((st) => ({ rulesOpen: false, speed: st.screen === 'playing' ? speedBeforeRules : 0 })),

    newGame: () => set({ game: createInitialState(ctx), screen: 'playing', speed: 1, log: [], selectedTile: null }),
    backToMenu: () => set({ screen: 'menu', speed: 0 }),
    setSpeed: (speed) => set({ speed }),
    togglePause: () => {
      const { speed } = get();
      if (speed > 0) lastSpeed = speed;
      set({ speed: speed > 0 ? 0 : lastSpeed });
    },

    step: () => {
      const next = tick(ctx, get().game);
      apply({ ok: true, state: next });
      if (next.defeat) set({ screen: 'end', speed: 0 });
    },

    selectTile: (x, y) => {
      set({ selectedTile: { x, y } });
      // Cliquer une case révèle l'easter egg qui s'y cache (s'il y en a un)
      const r = discoverEgg(ctx, get().game, x, y);
      if (r.ok) apply(r);
    },

    buildHere: (type) => {
      const tile = get().selectedTile;
      if (!tile) return;
      apply(build(ctx, get().game, type, tile.x, tile.y));
    },
    upgradeGrid: () => apply(upgradeGrid(ctx, get().game)),
    setPriority: (p) => apply(setPriority(ctx, get().game, p)),
    toggleCategory: (id) => apply(toggleCategoryLimit(ctx, get().game, id)),
  };
});
