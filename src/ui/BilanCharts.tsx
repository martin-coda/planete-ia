/**
 * Graphiques du bilan (E2-8) : un point par année de jeu, fourni par le moteur (state.history).
 * Petits multiples à un seul axe chacun, survol avec réticule et infobulle, et vue tableau pour l'accessibilité.
 */
import { useEffect, useRef, useState } from 'react';
import type { HistoryPoint } from '../engine';
import { useGame } from '../store/gameStore';
import { fmt } from './format';

interface Series {
  name: string;
  color: string;
  values: number[];
}

interface ChartProps {
  title: string;
  unit: string;
  years: number[];
  series: Series[];
  yMax: number;
  /** Ligne de repère horizontale (ex. seuil de stabilité) */
  reference?: { value: number; label: string };
}

const H = 150;
const PAD = { top: 12, right: 64, bottom: 24, left: 40 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max || 1)));
  const s = max / step > 5 ? step * 2 : max / step > 2 ? step : step / 2;
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += s) ticks.push(v);
  return ticks;
}

function LineChart({ title, unit, years, series, yMax, reference }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(60, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(yMax, 1e-6);
  const lastYear = years[years.length - 1] || 1;
  const x = (yr: number) => PAD.left + (yr / lastYear) * innerW;
  const y = (v: number) => PAD.top + innerH - (Math.min(v, max) / max) * innerH;
  const ticks = niceTicks(max);
  const multi = series.length > 1;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    const yr = rel * lastYear;
    let best = 0;
    years.forEach((v, i) => {
      if (Math.abs(v - yr) < Math.abs(years[best] - yr)) best = i;
    });
    setHover(best);
  };

  return (
    <figure className="chart" ref={ref}>
      <figcaption>
        <strong>{title}</strong> <span className="muted">({unit})</span>
      </figcaption>
      {multi && (
        <ul className="legend">
          {series.map((s) => (
            <li key={s.name}>
              <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <svg width={width} height={H} role="img" aria-label={`${title}, de l'année 0 à l'année ${lastYear}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.left - 6} y={y(v)} className="tick" textAnchor="end" dominantBaseline="middle">
              {fmt(v, 1)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} className="tick">
          an 0
        </text>
        <text x={PAD.left + innerW} y={H - 6} className="tick" textAnchor="end">
          an {fmt(lastYear, 0)}
        </text>
        {reference && (
          <g>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(reference.value)} y2={y(reference.value)} className="ref" />
            <text x={PAD.left + innerW + 4} y={y(reference.value)} className="tick" dominantBaseline="middle">
              {reference.label}
            </text>
          </g>
        )}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(years[i])},${y(v)}`).join(' ')}
            />
            {/* Étiquette directe en bout de courbe */}
            <text x={x(lastYear) + 6} y={y(s.values[s.values.length - 1])} className="end-label" dominantBaseline="middle">
              {multi ? s.name : fmt(s.values[s.values.length - 1], 0)}
            </text>
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(years[hover])} x2={x(years[hover])} y1={PAD.top} y2={PAD.top + innerH} className="crosshair" />
            {series.map((s) => (
              <circle key={s.name} cx={x(years[hover])} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(x(years[hover]) + 10, width - 150) }}>
          <strong>Année {fmt(years[hover], 0)}</strong>
          {series.map((s) => (
            <span key={s.name}>
              <span className="swatch" style={{ background: s.color }} aria-hidden="true" /> {multi ? `${s.name} : ` : ''}
              {fmt(s.values[hover])} {unit}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

/** Couleurs de séries validées (palette de référence, slots 1 et 2). */
const BLUE = '#2a78d6';
const ORANGE = '#eb6834';

export function BilanCharts({ history }: { history: HistoryPoint[] }) {
  const ctx = useGame((s) => s.ctx);
  if (history.length < 2) {
    return <p className="muted">Pas encore assez de données : le bilan ajoute un point par année de jeu.</p>;
  }
  const years = history.map((h) => h.month / 12);
  const demand = history.map((h) => h.demandPflops);
  const served = history.map((h) => h.servedPflops);

  return (
    <div className="bilan">
      <div className="charts">
        <LineChart
          title="Demande d'IA et calcul fourni"
          unit="PFLOP/s"
          years={years}
          yMax={Math.max(...demand, ...served) * 1.1}
          series={[
            { name: 'Demande', color: ORANGE, values: demand },
            { name: 'Fourni', color: BLUE, values: served },
          ]}
        />
        <LineChart
          title="Confiance des habitants"
          unit="%"
          years={years}
          yMax={100}
          reference={{ value: ctx.config.end.stableMinTrust, label: 'seuil' }}
          series={[{ name: 'Confiance', color: BLUE, values: history.map((h) => h.trust) }]}
        />
        <LineChart
          title="Stock de terres rares"
          unit="t"
          years={years}
          yMax={ctx.config.rareEarth.initialStockT}
          series={[{ name: 'Terres rares', color: BLUE, values: history.map((h) => h.rareEarthT) }]}
        />
      </div>
      <details className="data-table">
        <summary>Voir les données en tableau</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Année</th>
              <th scope="col">Demande (PFLOP/s)</th>
              <th scope="col">Fourni (PFLOP/s)</th>
              <th scope="col">Confiance (%)</th>
              <th scope="col">Terres rares (t)</th>
              <th scope="col">Adoption</th>
              <th scope="col">Intensité</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.month}>
                <td>{fmt(h.month / 12, 1)}</td>
                <td>{fmt(h.demandPflops)}</td>
                <td>{fmt(h.servedPflops)}</td>
                <td>{fmt(h.trust, 0)}</td>
                <td>{fmt(h.rareEarthT, 0)}</td>
                <td>{fmt(h.adoption * 100, 0)} %</td>
                <td>{fmt(h.intensity * 100, 0)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
