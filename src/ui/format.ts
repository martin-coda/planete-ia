/** Formatage des nombres pour l'interface (français, lisible par un élève de 4e). */
export const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
export const pct = (ratio: number, d = 0) => `${fmt(ratio * 100, d)} %`;

/** "Année 3, mois 4" à partir du nombre de mois écoulés. */
export const dateLabel = (month: number) => `Année ${Math.floor(month / 12) + 1}, mois ${(month % 12) + 1}`;
export const yearsLabel = (month: number) => {
  const y = Math.floor(month / 12);
  return `${y} an${y > 1 ? 's' : ''}`;
};

export const TERRAIN_LABELS: Record<string, string> = {
  '.': 'Terrain libre',
  C: 'Ville',
  '~': 'Eau',
  '^': 'Montagne',
};

export type Status = 'ok' | 'warn' | 'crit';
export const STATUS_LABELS: Record<Status, string> = { ok: 'OK', warn: 'Attention', crit: 'Critique' };
export const STATUS_ICONS: Record<Status, string> = { ok: '●', warn: '▲', crit: '■' };
