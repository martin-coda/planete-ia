/** Vérifie que les JSON de src/data/ respectent le contrat (E0-2). Lancé en CI à chaque PR. */
import { describe, expect, it } from 'vitest';
import facts from '../../data/facts.json';
import gameParams from '../../data/game-params.json';
import gameMap from '../../data/map.json';
import sources from '../../data/sources.json';
import traceability from '../../data/traceability.json';
import { FactSchema, GameConfigSchema, GameMapSchema, SourceSchema, TraceabilitySchema } from '../schema';

describe('contrat de données', () => {
  const config = GameConfigSchema.parse(gameParams);
  const map = GameMapSchema.parse(gameMap);
  const srcs = SourceSchema.array().parse(sources);
  const fcts = FactSchema.array().parse(facts);
  const trace = TraceabilitySchema.array().parse(traceability);
  const sourceIds = new Set(srcs.map((s) => s.id));

  it('chaque fiche cite une source existante', () => {
    for (const f of fcts) expect(sourceIds, f.id).toContain(f.sourceId);
  });

  it('chaque ligne de traçabilité cite une source existante (ou null = choix de design)', () => {
    for (const t of trace) if (t.sourceId !== null) expect(sourceIds, t.param).toContain(t.sourceId);
  });

  it('chaque easter egg pointe vers une fiche easterEgg', () => {
    for (const egg of map.easterEggs) {
      const fact = fcts.find((f) => f.id === egg.factId);
      expect(fact?.kind, egg.id).toBe('easterEgg');
    }
  });

  it('chaque fin de partie a sa fiche "Et dans le monde réel ?"', () => {
    for (const ending of ['blackout', 'resources', 'trust', 'overuse', 'stabilized'] as const) {
      expect(fcts.some((f) => f.kind === 'ending' && f.ending === ending), ending).toBe(true);
    }
  });

  it('chaque fiche donne un chiffre clé, sans texte provisoire', () => {
    for (const f of fcts) {
      expect(f.figure, f.id).toBeTruthy();
      expect(f.text, f.id).not.toMatch(/provisoire|à compléter/i);
      expect(f.figure, f.id).not.toMatch(/à compléter/i);
    }
  });

  it("chaque catégorie d'usage a sa part réelle Compar:IA, et leur somme vaut 1", () => {
    for (const c of config.usageCategories) expect(c.realShare, c.id).toBeDefined();
    const sum = config.usageCategories.reduce((s, c) => s + (c.realShare ?? 0), 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('plus aucune valeur provisoire dans la traçabilité', () => {
    for (const t of trace) expect(t.status, t.param).toBe('calibrated');
  });

  it('les bâtiments de départ sont sur des cases constructibles', () => {
    for (const b of config.start.buildings) expect(map.tiles[b.y][b.x]).toBe('.');
  });

  it('les easter eggs sont dans la carte', () => {
    for (const egg of map.easterEggs) {
      expect(egg.x).toBeLessThan(map.width);
      expect(egg.y).toBeLessThan(map.height);
    }
  });
});
