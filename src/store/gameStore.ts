/**
 * Pont entre le moteur (pur) et React. L'interface et la scène 3D lisent ce store ; seules les actions ci-dessous le modifient.
 *
 * Règle des fenêtres : toute fenêtre (règles, sources, bilan, annonce) met le jeu en pause,
 * et la vitesse d'avant revient quand la dernière fenêtre se ferme.
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
export type Tile = { x: number; y: number };

/** Annonce plein écran, affichée l'une après l'autre. */
export type Notice = { kind: 'phase2' } | { kind: 'egg'; factId: string } | { kind: 'stabilized' } | { kind: 'understood' };

const RULES_SEEN_KEY = 'planete-ia:rules-seen';

export interface GameStore {
  ctx: typeof ctx;
  game: GameState;
  screen: Screen;
  speed: Speed;
  /** Case cliquée (affichée dans la fiche de case) */
  selectedTile: Tile | null;
  /** Case sous la souris, ou curseur clavier */
  hoverTile: Tile | null;
  /** Bâtiment en cours de placement (mode chantier) */
  placing: BuildingType | null;
  lastError: ActionError | null;
  /** Derniers événements, du plus récent au plus ancien */
  log: { month: number; event: GameEvent }[];

  rulesOpen: boolean;
  creditsOpen: boolean;
  bilanOpen: boolean;
  notices: Notice[];

  newGame: () => void;
  backToMenu: () => void;
  setSpeed: (speed: Speed) => void;
  togglePause: () => void;
  step: () => void;

  hoverAt: (tile: Tile | null) => void;
  moveCursor: (dx: number, dy: number) => void;
  /** Clic (ou Entrée) sur une case : construit en mode chantier, sinon sélectionne et cherche un secret */
  selectTile: (x: number, y: number) => void;
  startPlacing: (type: BuildingType | null) => void;
  upgradeGrid: () => void;
  setPriority: (p: Priority) => void;
  toggleCategory: (id: string) => void;
  clearError: () => void;

  openRules: () => void;
  closeRules: () => void;
  openCredits: () => void;
  closeCredits: () => void;
  openBilan: () => void;
  closeBilan: () => void;
  showEgg: (factId: string) => void;
  dismissNotice: () => void;
}

/** Une fenêtre est-elle ouverte ? (le jeu est alors en pause) */
export const anyModal = (s: Pick<GameStore, 'rulesOpen' | 'creditsOpen' | 'bilanOpen' | 'notices'>) =>
  s.rulesOpen || s.creditsOpen || s.bilanOpen || s.notices.length > 0;

function readRulesSeen(): boolean {
  try {
    return localStorage.getItem(RULES_SEEN_KEY) === '1';
  } catch {
    return true; // stockage indisponible : on n'impose pas les règles
  }
}

function markRulesSeen() {
  try {
    localStorage.setItem(RULES_SEEN_KEY, '1');
  } catch {
    /* rien */
  }
}

export const useGame = create<GameStore>((set, get) => {
  let lastSpeed: Speed = 1;
  /** Vitesse à rétablir quand la dernière fenêtre se ferme */
  let resumeSpeed: Speed = 0;

  const openModal = (patch: (st: GameStore) => Partial<GameStore>) =>
    set((st) => {
      if (!anyModal(st)) resumeSpeed = st.speed;
      return { ...patch(st), speed: 0 };
    });

  const closeModal = (patch: (st: GameStore) => Partial<GameStore>) =>
    set((st) => {
      const p = patch(st);
      if (anyModal({ ...st, ...p })) return p;
      const speed = st.screen === 'playing' ? resumeSpeed : 0;
      resumeSpeed = 0;
      return { ...p, speed };
    });

  /** Applique le résultat d'une action ou d'un tick, journalise ses événements et déclenche les annonces. */
  const apply = (r: ActionResult) => {
    const events = r.state.events;
    set((st) => ({
      game: r.state,
      lastError: r.ok ? null : r.error,
      log: [...events.map((event) => ({ month: r.state.month, event })).reverse(), ...st.log].slice(0, 30),
    }));

    if (r.state.defeat) {
      resumeSpeed = 0;
      set({ screen: 'end', speed: 0, placing: null, notices: [], rulesOpen: false, creditsOpen: false, bilanOpen: false });
      return;
    }

    const notices: Notice[] = events.flatMap((e): Notice[] => {
      if (e.type === 'phase2Started') return [{ kind: 'phase2' }];
      if (e.type === 'stabilized') return [{ kind: 'stabilized' }];
      if (e.type === 'understood') return [{ kind: 'understood' }];
      return [];
    });
    if (notices.length) openModal((st) => ({ notices: [...st.notices, ...notices] }));
  };

  return {
    ctx,
    game: createInitialState(ctx),
    screen: 'menu',
    speed: 0,
    selectedTile: null,
    hoverTile: null,
    placing: null,
    lastError: null,
    log: [],
    rulesOpen: false,
    creditsOpen: false,
    bilanOpen: false,
    notices: [],

    newGame: () => {
      resumeSpeed = 0;
      set({
        game: createInitialState(ctx),
        screen: 'playing',
        speed: 1,
        log: [],
        selectedTile: null,
        hoverTile: null,
        placing: null,
        lastError: null,
        notices: [],
        creditsOpen: false,
        bilanOpen: false,
        rulesOpen: false,
      });
      // Première partie : on montre les règles d'abord
      if (!readRulesSeen()) get().openRules();
    },
    backToMenu: () => {
      resumeSpeed = 0;
      set({ screen: 'menu', speed: 0, placing: null, notices: [], rulesOpen: false, creditsOpen: false, bilanOpen: false });
    },
    setSpeed: (speed) => {
      if (speed > 0) lastSpeed = speed;
      set({ speed });
    },
    togglePause: () => {
      const st = get();
      if (st.screen !== 'playing' || anyModal(st)) return;
      if (st.speed > 0) lastSpeed = st.speed;
      set({ speed: st.speed > 0 ? 0 : lastSpeed });
    },

    step: () => apply({ ok: true, state: tick(ctx, get().game) }),

    hoverAt: (tile) => {
      const cur = get().hoverTile;
      if (cur?.x === tile?.x && cur?.y === tile?.y) return;
      set({ hoverTile: tile });
    },
    moveCursor: (dx, dy) => {
      const { hoverTile, selectedTile } = get();
      const from = hoverTile ?? selectedTile ?? { x: Math.floor(ctx.map.width / 2), y: Math.floor(ctx.map.height / 2) };
      const x = Math.min(ctx.map.width - 1, Math.max(0, from.x + dx));
      const y = Math.min(ctx.map.height - 1, Math.max(0, from.y + dy));
      set({ hoverTile: { x, y } });
    },

    selectTile: (x, y) => {
      const st = get();
      if (st.screen !== 'playing') return;

      if (st.placing) {
        const r = build(ctx, st.game, st.placing, x, y);
        apply(r);
        if (r.ok) set({ placing: null, selectedTile: { x, y } });
        return;
      }

      set({ selectedTile: { x, y } });
      // Cliquer une case révèle le secret qui s'y cache (s'il y en a un)
      const r = discoverEgg(ctx, st.game, x, y);
      if (r.ok) {
        const egg = ctx.map.easterEggs.find((e) => e.x === x && e.y === y);
        apply(r);
        if (egg) get().showEgg(egg.factId);
      }
    },
    startPlacing: (type) => set((st) => ({ placing: st.placing === type ? null : type, lastError: null })),
    upgradeGrid: () => apply(upgradeGrid(ctx, get().game)),
    setPriority: (p) => apply(setPriority(ctx, get().game, p)),
    toggleCategory: (id) => apply(toggleCategoryLimit(ctx, get().game, id)),
    clearError: () => set({ lastError: null }),

    openRules: () => {
      markRulesSeen();
      if (!get().rulesOpen) openModal(() => ({ rulesOpen: true }));
    },
    closeRules: () => closeModal(() => ({ rulesOpen: false })),
    openCredits: () => {
      if (!get().creditsOpen) openModal(() => ({ creditsOpen: true }));
    },
    closeCredits: () => closeModal(() => ({ creditsOpen: false })),
    openBilan: () => {
      if (!get().bilanOpen) openModal(() => ({ bilanOpen: true }));
    },
    closeBilan: () => closeModal(() => ({ bilanOpen: false })),
    showEgg: (factId) => openModal((st) => ({ notices: [...st.notices, { kind: 'egg', factId }] })),
    dismissNotice: () => closeModal((st) => ({ notices: st.notices.slice(1) })),
  };
});

// En développement seulement : accès au store depuis la console du navigateur (tests, équilibrage)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __game: typeof useGame }).__game = useGame;
}
