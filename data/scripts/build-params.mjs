/**
 * E3-2 : transforme les données brutes (data/raw/) et les choix de conception (data/scripts/design.json)
 * en fichiers du jeu. Reproductible : relancer le script donne exactement les mêmes fichiers.
 *
 * Entrées : data/raw/figures.json, data/raw/sources.json, data/raw/comparia-categories.csv, data/scripts/design.json
 * Sorties : src/data/game-params.json, src/data/sources.json, src/data/traceability.json,
 *           data/publication/*.csv (lot prêt à publier sur data.gouv.fr, E3-5)
 *
 * Usage : npm run data:build
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const writeJson = (p, data) => writeFileSync(new URL(p, root), JSON.stringify(data, null, 2) + '\n');

const design = readJson('data/scripts/design.json');
const sources = readJson('data/raw/sources.json');
const figures = Object.fromEntries(readJson('data/raw/figures.json').figures.map((f) => [f.id, f]));
const fig = (id) => {
  if (!figures[id]) throw new Error(`Chiffre manquant dans figures.json : ${id}`);
  return figures[id].value;
};

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const fr = (v, d = 1) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
const logit = (p) => Math.log(p / (1 - p));

const { population, rareEarthStockT } = design.scale;
const trace = [];
const calibrated = (param, value, realValue, sourceId, transformation) => {
  trace.push({ param, realValue, sourceId, transformation, status: 'calibrated' });
  return value;
};

// ---------- 1. Consommation de la ville (RTE + Insee) ----------
const consoTWh = fig('fr-consumption-2024');
const popFrM = fig('fr-population-2024');
const mwhPerPerson = (consoTWh * 1e6) / (popFrM * 1e6);
const cityPowerMw = calibrated(
  'city.powerMw',
  round((mwhPerPerson * population) / 8760, 1),
  `${fr(consoTWh)} TWh consommés en France en 2024 pour ${fr(popFrM, 2)} millions d'habitants, soit ${fr(mwhPerPerson, 2)} MWh par habitant et par an`,
  'rte-bilan-2024',
  `${fr(mwhPerPerson, 3)} MWh/hab/an × ${fr(population, 0)} habitants ÷ 8 760 h = puissance moyenne en MW (population : Insee)`,
);

// ---------- 2. Pertes du réseau (RTE transport + Enedis distribution) ----------
const transportRate = fig('rte-transport-loss-rate');
const enedisLosses = fig('enedis-losses-2024');
const lossRate = calibrated(
  'grid.baseLossRate',
  round((transportRate * consoTWh + enedisLosses) / consoTWh, 3),
  `Pertes 2024 : environ ${fr(transportRate * 100)} % sur le réseau de transport RTE et ${fr(enedisLosses)} TWh sur le réseau Enedis`,
  'enedis-bilan-2024',
  `(${fr(transportRate * 100)} % × ${fr(consoTWh)} TWh + ${fr(enedisLosses)} TWh) ÷ ${fr(consoTWh)} TWh. Le taux RTE vient d'une source secondaire (rte-pertes), à confirmer.`,
);

// ---------- 3. Courbe d'adoption (Baromètre du numérique) ----------
const usersByYear = [fig('genai-users-2023'), fig('genai-users-2024'), fig('genai-users-2025')];
const slopes = usersByYear.slice(1).map((p, i) => (logit(p) - logit(usersByYear[i])) / 12);
const adoptionRate = calibrated(
  'demand.adoption.growthRatePerMonth',
  round(slopes.reduce((a, b) => a + b, 0) / slopes.length, 4),
  `Utilisateurs d'IA générative en France : ${usersByYear.map((p) => fr(p * 100, 0) + ' %').join(' → ')} (juin 2023, 2024, 2025)`,
  'barometre-numerique',
  "Ajustement d'une courbe logistique (pente moyenne du logit entre deux enquêtes ÷ 12 mois). 1 mois de jeu = 1 mois réel en phase 1.",
);

// ---------- 4. Croissance de la demande en phase 2 (AIE) ----------
const dc2024 = fig('dc-electricity-2024');
const dc2030 = fig('dc-electricity-2030');
const maxExtra = calibrated(
  'demand.overuse.maxExtra',
  round(dc2030 / dc2024 - 1, 2),
  `Électricité des datacenters dans le monde : ${fr(dc2024, 0)} TWh en 2024 → ${fr(dc2030, 0)} TWh en 2030 (scénario de base AIE)`,
  'iea-energy-ai',
  `Plafond d'intensité = ${fr(dc2030, 0)} ÷ ${fr(dc2024, 0)} = ×${fr(dc2030 / dc2024, 2)}, donc surconsommation maximale de +${fr((dc2030 / dc2024 - 1) * 100, 0)} %`,
);

// ---------- 5. Terres rares (USGS) ----------
const reserves = fig('ree-reserves');
const production = fig('ree-production-2024');
const yearsLeft = reserves / production;
const cityRareEarth = calibrated(
  'city.rareEarthTPerYear',
  round(rareEarthStockT / yearsLeft, 2),
  `Réserves mondiales ${fr(reserves / 1e6, 0)} Mt, production ${fr(production / 1000, 0)} kt en 2024 : ${fr(yearsLeft, 0)} ans de réserves au rythme actuel`,
  'usgs-mcs',
  `Prélèvement de la ville = stock de départ (${fr(rareEarthStockT, 0)} t) ÷ ${fr(yearsLeft, 0)} ans : sans construire, la planète vit le même rapport réserves / production que la Terre.`,
);
trace.push({
  param: 'rareEarth.initialStockT',
  realValue: `Rapport réserves / production de l'USGS (${fr(yearsLeft, 0)} ans)`,
  sourceId: 'usgs-mcs',
  transformation: `Le stock (${fr(rareEarthStockT, 0)} t) est une échelle de jeu. Le rapport réel est conservé par city.rareEarthTPerYear.`,
  status: 'calibrated',
});

// ---------- 6. Confiance de départ (Baromètre du numérique) ----------
const distrust = fig('genai-distrust-2025');
const trustInitial = calibrated(
  'trust.initial',
  round((1 - distrust) * 100, 0),
  `${fr(distrust * 100, 0)} % des personnes se disent méfiantes envers l'IA générative en 2025`,
  'barometre-numerique',
  `Confiance de départ = 100 − ${fr(distrust * 100, 0)} = part des personnes non méfiantes`,
);

// ---------- 7. Catégories d'usage (Compar:IA) ----------
const usage = design.usage;
const blocked = (label) => usage.moderation.blockedWords.some((w) => label.toLowerCase().includes(w));
const gameIdFor = (label) => {
  if (blocked(label)) return 'other';
  if (usage.mapping[label]) return usage.mapping[label];
  const first = label.split(/[\s&/,]+/)[0];
  return usage.prefixMapping[first] ?? 'other';
};

const csv = read('data/raw/comparia-categories.csv').trim().split(/\r?\n/).slice(1);
const totals = Object.fromEntries(usage.categories.map((c) => [c.id, 0]));
let blockedCount = 0;
for (const line of csv) {
  const m = line.match(/^"((?:[^"]|"")*)",([\d.]+),/);
  if (!m) throw new Error(`Ligne CSV illisible : ${line}`);
  const label = m[1].replaceAll('""', '"');
  if (blocked(label)) blockedCount++;
  totals[gameIdFor(label)] += Number(m[2]);
}
const all = Object.values(totals).reduce((a, b) => a + b, 0);
const weights = usage.categories.map((c) => (totals[c.id] / all) * (c.essential ? 1 : usage.overuseWeightNonEssential));
const weightSum = weights.reduce((a, b) => a + b, 0);

// Arrondis à 3 décimales, l'écart d'arrondi va sur la plus grande catégorie pour que la somme fasse exactement 1
const fixSum = (values) => {
  const r = values.map((v) => round(v, 3));
  const diff = round(1 - r.reduce((a, b) => a + b, 0), 3);
  r[r.indexOf(Math.max(...r))] = round(r[r.indexOf(Math.max(...r))] + diff, 3);
  return r;
};
const realShares = fixSum(usage.categories.map((c) => totals[c.id] / all));
const extraShares = fixSum(weights.map((w) => w / weightSum));

const usageCategories = usage.categories.map((c, i) => ({
  id: c.id,
  label: c.label,
  essential: c.essential,
  shareOfExtra: extraShares[i],
  trustCostOnLimit: c.trustCostOnLimit,
  realShare: realShares[i],
}));
const comparia = readJson('data/raw/comparia-energy.json');
trace.push({
  param: 'usageCategories',
  realValue: `Thèmes de ${fr(comparia.conversationsWithCategory, 0)} conversations Compar:IA (${comparia.period.from} → ${comparia.period.to})`,
  sourceId: 'comparia',
  transformation: `Catégories Compar:IA regroupées en ${usage.categories.length} catégories (design.json). Part réelle = realShare. Part de la surconsommation : usages non essentiels pondérés ×${usage.overuseWeightNonEssential} (hypothèse). ${blockedCount} libellé(s) filtré(s) par la modération.`,
  status: 'calibrated',
});

// ---------- 8. Paramètres de conception (sans source, justifiés) ----------
for (const [param, why] of Object.entries(design.why)) {
  trace.push({ param, realValue: 'Choix de conception du jeu', sourceId: null, transformation: why, status: 'calibrated' });
}
trace.push({
  param: 'planet.population',
  realValue: 'Taille de la planète',
  sourceId: null,
  transformation: design.scale.why,
  status: 'calibrated',
});

// ---------- Écriture de game-params.json ----------
const d = design.design;
const params = {
  meta: {
    version: d.meta.version,
    scale: `Planète fictive de ${fr(population, 0)} habitants (≈ 1/${fr((popFrM * 1e6) / population, 0)} de la France). Les proportions réelles sont conservées : consommation par habitant, pertes du réseau, courbe d'adoption, croissance des datacenters, rapport réserves / production des terres rares.`,
  },
  time: d.time,
  planet: { population },
  demand: {
    computePerUserPflops: d.demand.computePerUserPflops,
    adoption: { initial: d.demand.adoption.initial, growthRatePerMonth: adoptionRate },
    overuse: { ...d.demand.overuse, maxExtra },
  },
  datacenter: d.datacenter,
  powerPlant: d.powerPlant,
  grid: { baseLossRate: lossRate, ...d.grid },
  city: { powerMw: cityPowerMw, rareEarthTPerYear: cityRareEarth },
  rareEarth: { initialStockT: rareEarthStockT },
  trust: { initial: trustInitial, ...d.trust },
  end: d.end,
  usageCategories,
  start: d.start,
};
// Ordre des clés stable pour des diffs lisibles
params.demand.overuse = {
  initialExtra: d.demand.overuse.initialExtra,
  maxExtra,
  growthRatePerMonth: d.demand.overuse.growthRatePerMonth,
  limitEfficiency: d.demand.overuse.limitEfficiency,
};

writeJson('src/data/game-params.json', params);
writeJson('src/data/sources.json', sources);
writeJson('src/data/traceability.json', trace);

// ---------- E3-5 : lot de données prêt à publier ----------
const toCsv = (rows) => {
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(' à ') : String(v);
    return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return cols.join(',') + '\n' + rows.map((r) => cols.map((c) => cell(r[c])).join(',')).join('\n') + '\n';
};
mkdirSync(new URL('data/publication/', root), { recursive: true });
const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
const traceByParam = Object.fromEntries(trace.map((t) => [t.param, t]));
const paramRows = flat(params)
  .filter(([k]) => !k.startsWith('meta.') && !k.startsWith('usageCategories') && !k.startsWith('start.'))
  .map(([param, value]) => {
    const t = traceByParam[param] ?? traceByParam[Object.keys(traceByParam).find((p) => param.startsWith(p + '.')) ?? ''];
    return {
      parametre: param,
      valeur: value,
      donnee_reelle: t?.realValue ?? 'Choix de conception du jeu',
      source: t?.sourceId ? sources.find((s) => s.id === t.sourceId)?.publisher : '',
      transformation: t?.transformation ?? '',
    };
  });
writeFileSync(new URL('data/publication/parametres-du-jeu.csv', root), toCsv(paramRows));
writeFileSync(
  new URL('data/publication/categories-usage-comparia.csv', root),
  toCsv(usageCategories.map((c) => ({ categorie: c.id, libelle: c.label, essentiel: c.essential, part_reelle_comparia: c.realShare, part_surconsommation_jeu: c.shareOfExtra }))),
);
writeFileSync(
  new URL('data/publication/chiffres-sources.csv', root),
  toCsv(
    Object.values(figures).map((f) => ({
      id: f.id,
      valeur: f.value,
      unite: f.unit,
      description: f.label,
      source: sources.find((s) => s.id === f.sourceId)?.publisher,
      lien: sources.find((s) => s.id === f.sourceId)?.url,
      verifie_dans_le_document_original: f.verified ? 'oui' : 'non',
    })),
  ),
);
writeFileSync(
  new URL('data/publication/energie-par-conversation-comparia.csv', root),
  toCsv(Object.entries(comparia.whPerConversation).map(([k, v]) => ({ indicateur: k, wh_par_conversation: v, conversations: comparia.conversations, periode: `${comparia.period.from} au ${comparia.period.to}` }))),
);

// ---------- Résumé ----------
console.log('Paramètres calibrés :');
for (const t of trace.filter((t) => t.sourceId)) console.log(`  ${t.param.padEnd(36)} ← ${t.sourceId}`);
console.log(`  city.powerMw = ${cityPowerMw} MW · grid.baseLossRate = ${lossRate} · adoption r = ${adoptionRate}/mois`);
console.log(`  overuse.maxExtra = ${maxExtra} · city.rareEarthTPerYear = ${cityRareEarth} t/an · trust.initial = ${trustInitial}`);
console.log('  Catégories :', usageCategories.map((c) => `${c.id} ${fr(c.realShare * 100)} % (surconso ${fr(c.shareOfExtra * 100)} %)`).join(' · '));
console.log('OK : src/data/{game-params,sources,traceability}.json et data/publication/*.csv');
