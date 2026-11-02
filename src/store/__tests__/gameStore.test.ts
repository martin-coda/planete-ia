import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../gameStore';

const st = () => useGame.getState();

/** Trouve une case du type demandé, libre de tout bâtiment et de tout secret. */
function findTile(char: string) {
  const { ctx, game } = st();
  for (let y = 0; y < ctx.map.height; y++) {
    for (let x = 0; x < ctx.map.width; x++) {
      if (ctx.map.tiles[y][x] !== char) continue;
      if (game.buildings.some((b) => b.x === x && b.y === y)) continue;
      if (ctx.map.easterEggs.some((e) => e.x === x && e.y === y)) continue;
      return { x, y };
    }
  }
  throw new Error(`pas de case ${char}`);
}

beforeEach(() => st().newGame());

describe('fenêtres et pause', () => {
  it('une nouvelle partie démarre en vitesse x1', () => {
    expect(st().screen).toBe('playing');
    expect(st().speed).toBe(1);
  });

  it('ouvrir les règles met en pause, les fermer rétablit la vitesse', () => {
    st().setSpeed(5);
    st().openRules();
    expect(st().speed).toBe(0);
    st().closeRules();
    expect(st().speed).toBe(5);
  });

  it('le jeu ne reprend que quand la dernière fenêtre se ferme', () => {
    st().openRules();
    st().openCredits();
    st().closeRules();
    expect(st().speed).toBe(0);
    st().closeCredits();
    expect(st().speed).toBe(1);
  });

  it('un jeu déjà en pause reste en pause après une fenêtre', () => {
    st().togglePause();
    st().openBilan();
    st().closeBilan();
    expect(st().speed).toBe(0);
  });

  it('la pause clavier est ignorée tant qu’une fenêtre est ouverte', () => {
    st().openRules();
    st().togglePause();
    expect(st().speed).toBe(0);
    st().closeRules();
    expect(st().speed).toBe(1);
  });
});

describe('chantier', () => {
  it('placer un datacenter sur une case libre construit et quitte le mode placement', () => {
    const before = st().game;
    const tile = findTile('.');
    st().startPlacing('datacenter');
    st().selectTile(tile.x, tile.y);
    expect(st().placing).toBeNull();
    expect(st().game.buildings).toHaveLength(before.buildings.length + 1);
    expect(st().game.rareEarthT).toBe(before.rareEarthT - st().ctx.config.datacenter.costRareEarthT);
  });

  it("placer sur l'eau affiche une erreur et garde le mode placement", () => {
    const water = findTile('~');
    st().startPlacing('powerPlant');
    st().selectTile(water.x, water.y);
    expect(st().lastError).toBe('tileNotBuildable');
    expect(st().placing).toBe('powerPlant');
  });

  it('recliquer sur le même bâtiment annule le placement', () => {
    st().startPlacing('datacenter');
    st().startPlacing('datacenter');
    expect(st().placing).toBeNull();
  });
});

describe('annonces', () => {
  it('trouver un secret ouvre sa fiche et met en pause', () => {
    const egg = st().ctx.map.easterEggs[0];
    st().selectTile(egg.x, egg.y);
    expect(st().notices).toEqual([{ kind: 'egg', factId: egg.factId }]);
    expect(st().speed).toBe(0);
    st().dismissNotice();
    expect(st().speed).toBe(1);
  });

  it("le passage en phase 2 déclenche l'annonce plein écran", () => {
    useGame.setState({ game: { ...st().game, adoption: 0.9999 } });
    st().step();
    expect(st().game.phase).toBe('overuse');
    expect(st().notices[0]).toEqual({ kind: 'phase2' });
    expect(st().speed).toBe(0);
  });

  it("une défaite affiche l'écran de fin", () => {
    useGame.setState({ game: { ...st().game, trust: 0.01, buildings: [] } });
    st().step();
    expect(st().screen).toBe('end');
    expect(st().speed).toBe(0);
  });
});
