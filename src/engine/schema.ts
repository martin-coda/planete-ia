/**
 * Contrat de données (E0-2).
 * Les JSON de src/data/ doivent respecter ces schémas : ils sont validés par les tests (data.test.ts).
 * R3 produit les valeurs, R1 les consomme. Toute modif de schéma = PR relue par R1 ET R3.
 */
import { z } from 'zod';

const positive = z.number().positive();
const nonNegative = z.number().nonnegative();
const ratio = z.number().min(0).max(1);

/** Catégorie d'usage de l'IA (reprend les catégories Compar:IA). */
export const UsageCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** true = usage utile, non limitable par le joueur */
  essential: z.boolean(),
  /** Part du plafond de surconsommation (phase 2) portée par cette catégorie. Somme de toutes = 1. */
  shareOfExtra: ratio,
  /** Points de confiance perdus une fois quand le joueur limite cette catégorie */
  trustCostOnLimit: nonNegative,
  /** Part réelle de cette catégorie dans les conversations Compar:IA (affichée au joueur). Somme de toutes = 1. */
  realShare: ratio.optional(),
});

export const GameConfigSchema = z
  .object({
    meta: z.object({
      version: z.string(),
      /** Facteur d'échelle documenté (ex. "1/1000 de la France") */
      scale: z.string(),
    }),
    time: z.object({
      /** Nombre de ticks (mois de jeu) simulés par seconde réelle en vitesse x1 */
      ticksPerSecond: positive,
    }),
    planet: z.object({
      population: positive,
    }),
    demand: z.object({
      /** PFLOP/s consommés par utilisateur à intensité 100 % */
      computePerUserPflops: positive,
      adoption: z.object({
        initial: ratio,
        /** Taux de croissance logistique mensuel */
        growthRatePerMonth: positive,
      }),
      overuse: z.object({
        /** Surconsommation au début de la phase 2 (0.05 = +5 % d'intensité) */
        initialExtra: nonNegative,
        /** Surconsommation max atteignable (1.5 = intensité plafonnée à 250 %) */
        maxExtra: positive,
        growthRatePerMonth: positive,
        /** Part du plafond d'une catégorie supprimée quand elle est limitée */
        limitEfficiency: ratio,
      }),
    }),
    datacenter: z.object({
      costRareEarthT: positive,
      computePflops: positive,
      powerMw: positive,
      /** Part de la puissance consommée même à vide */
      idlePowerShare: ratio,
      buildMonths: z.number().int().nonnegative(),
    }),
    powerPlant: z.object({
      name: z.string(),
      costRareEarthT: positive,
      productionMw: positive,
      buildMonths: z.number().int().nonnegative(),
    }),
    grid: z.object({
      baseLossRate: ratio,
      lossReductionPerLevel: ratio,
      minLossRate: ratio,
      maxLevel: z.number().int().nonnegative(),
      upgradeCostRareEarthT: positive,
    }),
    city: z.object({
      powerMw: positive,
      rareEarthTPerYear: nonNegative,
    }),
    rareEarth: z.object({
      initialStockT: positive,
    }),
    trust: z.object({
      initial: z.number().min(0).max(100),
      /** Perte max par mois quand l'IA est totalement indisponible, à la demande de référence */
      availabilityPenaltyPerMonth: nonNegative,
      /** Perte max par mois quand la ville est totalement privée d'énergie */
      cityPenaltyPerMonth: nonNegative,
      recoveryPerMonth: nonNegative,
      /** Demande (PFLOP/s) qui vaut un poids de 1 dans la pénalité de disponibilité */
      referenceDemandPflops: positive,
      demandWeightMin: nonNegative,
      demandWeightMax: positive,
    }),
    end: z.object({
      /** Défaite "panne" : ville sous ce ratio d'alimentation... */
      blackoutCityRatio: ratio,
      /** ...pendant ce nombre de mois consécutifs */
      blackoutMonths: z.number().int().positive(),
      /** Défaite "ressources" : disponibilité sous ce seuil sans pouvoir construire... */
      resourcesAvailability: ratio,
      resourcesMonths: z.number().int().positive(),
      /** Planète stabilisée : conditions tenues pendant ce nombre de mois en phase 2 */
      stableMonths: z.number().int().positive(),
      stableMinAvailability: ratio,
      stableMinTrust: z.number().min(0).max(100),
      /** Croissance max de la demande sur 12 mois pour être "stable" */
      stableMaxYearlyDemandGrowth: nonNegative,
    }),
    usageCategories: z.array(UsageCategorySchema).min(1),
    start: z.object({
      buildings: z.array(
        z.object({
          type: z.enum(['datacenter', 'powerPlant']),
          x: z.number().int().nonnegative(),
          y: z.number().int().nonnegative(),
        }),
      ),
    }),
  })
  .superRefine((cfg, ctx) => {
    const sum = cfg.usageCategories.reduce((s, c) => s + c.shareOfExtra, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      ctx.addIssue({ code: 'custom', message: `La somme des shareOfExtra doit valoir 1 (actuel : ${sum})` });
    }
    if (cfg.grid.minLossRate > cfg.grid.baseLossRate) {
      ctx.addIssue({ code: 'custom', message: 'grid.minLossRate doit être <= grid.baseLossRate' });
    }
  });

/**
 * Carte prédéfinie. Une ligne de `tiles` = une rangée.
 * '.' constructible, 'C' ville, '~' eau, '^' montagne.
 */
export const TileChar = z.enum(['.', 'C', '~', '^']);

export const GameMapSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    tiles: z.array(z.string()),
    easterEggs: z.array(
      z.object({
        id: z.string(),
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        /** Fiche débloquée (id dans facts.json) */
        factId: z.string(),
      }),
    ),
  })
  .superRefine((map, ctx) => {
    if (map.tiles.length !== map.height) {
      ctx.addIssue({ code: 'custom', message: `tiles doit avoir ${map.height} lignes` });
    }
    map.tiles.forEach((row, y) => {
      if (row.length !== map.width) {
        ctx.addIssue({ code: 'custom', message: `ligne ${y} : ${row.length} cases au lieu de ${map.width}` });
      }
      for (const ch of row) {
        if (!TileChar.safeParse(ch).success) {
          ctx.addIssue({ code: 'custom', message: `ligne ${y} : caractère inconnu "${ch}"` });
        }
      }
    });
  });

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  license: z.string(),
  year: z.number().int(),
});

/** Fiche affichée en jeu : fin de partie ("Et dans le monde réel ?") ou easter egg. */
export const FactSchema = z.object({
  id: z.string(),
  kind: z.enum(['ending', 'easterEgg']),
  /** Pour kind = ending : la fin concernée */
  ending: z.enum(['blackout', 'resources', 'trust', 'overuse', 'stabilized']).optional(),
  title: z.string(),
  /** Texte niveau 4e/2nde, 300 caractères max */
  text: z.string().max(300),
  /** Chiffre clé, en fourchette si incertain (ex. "0,3 à 3 Wh") */
  figure: z.string().optional(),
  sourceId: z.string(),
});

/** Tableau de traçabilité : paramètre du jeu -> donnée réelle -> source -> transformation. */
export const TraceabilitySchema = z.object({
  param: z.string(),
  realValue: z.string(),
  /** null = choix de design assumé (à justifier dans transformation) */
  sourceId: z.string().nullable(),
  transformation: z.string(),
  status: z.enum(['placeholder', 'calibrated']),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
export type GameMap = z.infer<typeof GameMapSchema>;
export type UsageCategory = z.infer<typeof UsageCategorySchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type Traceability = z.infer<typeof TraceabilitySchema>;
