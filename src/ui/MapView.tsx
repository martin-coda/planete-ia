/**
 * La carte et ses surcouches HTML : fiche de la case, boutons de caméra (E2-4), bandeau de pause (E2-5),
 * et navigation au clavier (E2-7) : flèches = curseur, Entrée = sélectionner / construire.
 */
import { lazy, Suspense } from 'react';
import { useGame } from '../store/gameStore';
import { cameraApi } from '../scene/cameraApi';
import { factById } from './dataSources';
import { TERRAIN_LABELS } from './format';

const PlanetMap = lazy(() => import('../scene/PlanetMap').then((m) => ({ default: m.PlanetMap })));

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function describeTile(x: number, y: number): string {
  const { ctx, game } = useGame.getState();
  const t = ctx.map.tiles[y]?.[x] ?? '.';
  const b = game.buildings.find((b) => b.x === x && b.y === y);
  let label = `Case ${x + 1}, ${y + 1} : ${TERRAIN_LABELS[t]}`;
  if (b) {
    const name = b.type === 'datacenter' ? 'datacenter' : ctx.config.powerPlant.name;
    const left = b.readyAt - game.month;
    label += left > 0 ? `, ${name} en chantier (${left} mois)` : `, ${name}`;
  }
  return label;
}

function TileInfo() {
  const tile = useGame((s) => s.selectedTile);
  const game = useGame((s) => s.game);
  const ctx = useGame((s) => s.ctx);
  if (!tile) return null;

  const t = ctx.map.tiles[tile.y]?.[tile.x] ?? '.';
  const b = game.buildings.find((b) => b.x === tile.x && b.y === tile.y);
  const egg = ctx.map.easterEggs.find((e) => e.x === tile.x && e.y === tile.y && game.discoveredEggs.includes(e.id));
  const left = b ? b.readyAt - game.month : 0;

  return (
    <div className="map-card tile-info">
      <strong>{TERRAIN_LABELS[t]}</strong>
      <span className="muted">
        Case {tile.x + 1}, {tile.y + 1}
      </span>
      {b && (
        <span>
          {b.type === 'datacenter' ? '🖥️ Datacenter' : `⚛️ ${ctx.config.powerPlant.name}`}
          {left > 0 ? ` · en chantier, encore ${left} mois` : ' · en service'}
        </span>
      )}
      {t === 'C' && <span>Les habitants vivent ici. On ne peut pas y construire.</span>}
      {t === '.' && !b && <span className="muted">Constructible</span>}
      {egg && <span>🔍 {factById(egg.factId)?.title}</span>}
    </div>
  );
}

function CameraButtons() {
  return (
    <div className="map-card camera" role="group" aria-label="Caméra">
      <button onClick={() => cameraApi.current?.zoomBy(1.25)} aria-label="Zoomer">
        +
      </button>
      <button onClick={() => cameraApi.current?.zoomBy(0.8)} aria-label="Dézoomer">
        −
      </button>
      <button onClick={() => cameraApi.current?.rotate(1)} aria-label="Pivoter la vue vers la gauche">
        ⟲
      </button>
      <button onClick={() => cameraApi.current?.rotate(-1)} aria-label="Pivoter la vue vers la droite">
        ⟳
      </button>
      <button onClick={() => cameraApi.current?.reset()} aria-label="Recentrer la vue">
        ⌖
      </button>
    </div>
  );
}

function Banner() {
  const { speed, placing, notices, rulesOpen, creditsOpen, bilanOpen, togglePause, startPlacing } = useGame();
  const modal = notices.length > 0 || rulesOpen || creditsOpen || bilanOpen;
  if (placing) {
    return (
      <div className="map-banner placing">
        Pose ton {placing === 'datacenter' ? 'datacenter' : 'réacteur'} sur une case verte
        <button onClick={() => startPlacing(null)}>Annuler</button>
      </div>
    );
  }
  if (speed === 0 && !modal) {
    return (
      <div className="map-banner">
        ⏸ Jeu en pause
        <button onClick={togglePause}>Reprendre</button>
      </div>
    );
  }
  return null;
}

export function MapView() {
  const hover = useGame((s) => s.hoverTile);
  const { moveCursor, selectTile } = useGame.getState();

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Seulement quand la carte elle-même a le focus (pas les boutons de caméra)
    if (e.target !== e.currentTarget) return;
    const dir = ARROWS[e.key];
    if (dir) {
      e.preventDefault();
      moveCursor(dir[0], dir[1]);
    } else if (e.key === 'Enter') {
      const cur = useGame.getState().hoverTile;
      if (cur) {
        e.preventDefault();
        selectTile(cur.x, cur.y);
      }
    }
  };

  return (
    <div
      className="map"
      tabIndex={0}
      role="application"
      aria-roledescription="carte"
      aria-label="Carte de la planète. Flèches pour déplacer le curseur, Entrée pour sélectionner la case ou y construire."
      onKeyDown={onKeyDown}
    >
      <Suspense fallback={<div className="map-loading">Chargement de la planète…</div>}>
        <PlanetMap />
      </Suspense>
      <Banner />
      <TileInfo />
      <CameraButtons />
      <span className="sr-only" aria-live="polite">
        {hover ? describeTile(hover.x, hover.y) : ''}
      </span>
    </div>
  );
}
