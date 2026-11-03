/**
 * E3-3 : extrait de Compar:IA (ministère de la Culture, Licence Ouverte 2.0) les deux seules choses dont le jeu a besoin :
 *   1. la répartition des conversations par catégorie thématique (colonne `categories`) ;
 *   2. l'électricité estimée par conversation (colonnes `total_conv_a_kwh` / `total_conv_b_kwh`, estimations EcoLogits).
 *
 * Protection des mineurs : le script ne lit JAMAIS les messages des utilisateurs (opening_msg, conversation_a/b).
 * Seules des colonnes de catégories et de chiffres sont lues, puis agrégées. Aucun texte libre n'entre dans le jeu.
 *
 * Le fichier fait plusieurs Go : on ne le télécharge pas, on lit seulement les colonnes utiles à distance (requêtes HTTP partielles).
 *
 * Usage : node data/scripts/extract-comparia.mjs [--max-row-groups N]
 * Sortie : data/raw/comparia-categories.csv et data/raw/comparia-energy.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { asyncBufferFromUrl, cachedAsyncBuffer, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

const URL_CONVERSATIONS = 'https://ministere-culture.s3.sbg.io.cloud.ovh.net/COMPARIA/conversations.parquet';
const OUT_DIR = new URL('../raw/', import.meta.url);
const COLUMNS = ['timestamp', 'categories', 'total_conv_a_kwh', 'total_conv_b_kwh'];

const arg = process.argv.indexOf('--max-row-groups');
const maxRowGroups = arg > 0 ? Number(process.argv[arg + 1]) : Infinity;

const file = cachedAsyncBuffer(await asyncBufferFromUrl({ url: URL_CONVERSATIONS }));
const metadata = await parquetMetadataAsync(file);
const groups = metadata.row_groups.slice(0, maxRowGroups);
console.log(`Compar:IA conversations : ${metadata.num_rows} lignes, ${metadata.row_groups.length} groupes (lecture de ${groups.length})`);

const categoryCounts = new Map();
const kwh = [];
let conversations = 0;
let categorized = 0;
let firstDate = null;
let lastDate = null;

let rowStart = 0;
for (const [i, rg] of groups.entries()) {
  const rowEnd = rowStart + Number(rg.num_rows);
  const rows = await parquetReadObjects({ file, metadata, columns: COLUMNS, rowStart, rowEnd, compressors });
  for (const r of rows) {
    conversations++;
    const ts = r.timestamp ? new Date(r.timestamp) : null;
    if (ts && !Number.isNaN(ts.getTime())) {
      if (!firstDate || ts < firstDate) firstDate = ts;
      if (!lastDate || ts > lastDate) lastDate = ts;
    }
    const cats = Array.isArray(r.categories) ? r.categories : typeof r.categories === 'string' ? safeList(r.categories) : [];
    if (cats.length) {
      categorized++;
      // Une conversation peut avoir plusieurs catégories : chacune compte pour 1/n (la somme reste égale au nombre de conversations)
      for (const c of cats) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1 / cats.length);
    }
    for (const v of [r.total_conv_a_kwh, r.total_conv_b_kwh]) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) kwh.push(n);
    }
  }
  rowStart = rowEnd;
  console.log(`  groupe ${i + 1}/${groups.length} : ${conversations} conversations lues`);
}

function safeList(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

kwh.sort((a, b) => a - b);
const q = (p) => kwh[Math.min(kwh.length - 1, Math.floor(p * kwh.length))];

mkdirSync(OUT_DIR, { recursive: true });
const rows = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
writeFileSync(
  new URL('comparia-categories.csv', OUT_DIR),
  'categorie,conversations_ponderees,part\n' +
    rows.map(([c, n]) => `"${String(c).replaceAll('"', '""')}",${n.toFixed(2)},${(n / categorized).toFixed(5)}`).join('\n') +
    '\n',
);
writeFileSync(
  new URL('comparia-energy.json', OUT_DIR),
  JSON.stringify(
    {
      source: URL_CONVERSATIONS,
      licence: 'Licence Ouverte / Open Licence 2.0 (Etalab)',
      extractedAt: new Date().toISOString().slice(0, 10),
      period: { from: firstDate?.toISOString().slice(0, 10) ?? null, to: lastDate?.toISOString().slice(0, 10) ?? null },
      conversations,
      conversationsWithCategory: categorized,
      unit: 'Wh par conversation (estimation EcoLogits, un modèle)',
      samples: kwh.length,
      whPerConversation: {
        p10: +(q(0.1) * 1000).toFixed(3),
        p25: +(q(0.25) * 1000).toFixed(3),
        median: +(q(0.5) * 1000).toFixed(3),
        p75: +(q(0.75) * 1000).toFixed(3),
        p90: +(q(0.9) * 1000).toFixed(3),
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(`OK : ${rows.length} catégories, ${kwh.length} mesures d'énergie → data/raw/`);
