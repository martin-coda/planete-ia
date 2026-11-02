/**
 * HUD de debug pour tester le moteur pendant l'E1. À remplacer par l'intégration de la maquette (E2-1).
 */
import { buildCost, canBuild, type GameEvent } from '../engine';
import { useGame, type Speed } from '../store/gameStore';
import { RulesButton } from './RulesModal';

const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const pct = (n: number) => `${fmt(n * 100, 0)} %`;

const EVENT_LABELS: Record<GameEvent['type'], string> = {
  buildingReady: 'Chantier terminé',
  phase2Started: 'Toute la ville utilise l’IA… mais chacun en veut toujours plus ! (phase 2)',
  rareEarthDepleted: 'Plus de terres rares',
  stabilized: 'Planète stabilisée',
  understood: 'Vous avez compris les enjeux',
  defeat: 'Défaite',
};

const ERROR_LABELS: Record<string, string> = {
  notEnoughRareEarth: 'Pas assez de terres rares',
  tileNotBuildable: 'Case non constructible',
  tileOccupied: 'Case déjà occupée',
  outOfMap: 'Hors de la carte',
  gridMaxLevel: 'Réseau déjà au maximum',
  notInPhase2: 'Disponible en phase 2',
  categoryEssential: 'Usage essentiel : non limitable',
  gameOver: 'Partie terminée',
};

function Gauge({ label, value, max, unit, warn }: { label: string; value: number; max?: number; unit: string; warn?: boolean }) {
  return (
    <div className={`gauge ${warn ? 'warn' : ''}`}>
      <span>{label}</span>
      <strong>
        {fmt(value)} {max !== undefined && `/ ${fmt(max)}`} {unit}
      </strong>
    </div>
  );
}

export function DebugHud() {
  const { game, ctx, speed, selectedTile, lastError, log } = useGame();
  const { setSpeed, buildHere, upgradeGrid, setPriority, toggleCategory, step } = useGame();
  const m = game.metrics;
  const netMw = m.productionMw * (1 - m.lossRate);

  return (
    <aside className="hud">
      <header>
        <RulesButton className="hud-rules" />
        <strong>
          Année {Math.floor(game.month / 12) + 1}, mois {(game.month % 12) + 1}
        </strong>
        <span className="phase">{game.phase === 'adoption' ? 'Phase 1 : adoption' : 'Phase 2 : surconsommation'}</span>
      </header>

      <div className="speed">
        {([0, 1, 2, 5] as Speed[]).map((v) => (
          <button key={v} className={speed === v ? 'on' : ''} onClick={() => setSpeed(v)}>
            {v === 0 ? '⏸' : `x${v}`}
          </button>
        ))}
        <button onClick={step} disabled={speed > 0} title="Avancer d'un mois">
          +1 mois
        </button>
      </div>

      <section>
        <Gauge label="Demande IA" value={m.demandPflops} unit="PFLOP/s" />
        <Gauge label="Calcul" value={m.capacityPflops} unit="PFLOP/s" warn={m.capacityPflops < m.demandPflops} />
        <Gauge label="Disponibilité IA" value={m.availability * 100} unit="%" warn={m.availability < 0.95} />
        <Gauge label="Énergie nette" value={netMw} unit="MW" warn={netMw < m.cityNeedMw + m.datacenterNeedMw} />
        <Gauge label="Ville alimentée" value={m.cityGotMw} max={m.cityNeedMw} unit="MW" warn={m.cityGotMw < m.cityNeedMw} />
        <Gauge label="Terres rares" value={game.rareEarthT} unit="t" warn={game.rareEarthT < ctx.config.datacenter.costRareEarthT} />
        <Gauge label="Confiance" value={game.trust} unit="%" warn={game.trust < 30} />
        <Gauge label="Adoption" value={game.adoption * 100} unit="%" />
        <Gauge label="Intensité d'usage" value={m.intensity * 100} unit="%" warn={m.intensity > 1} />
        <Gauge label="Pertes réseau" value={m.lossRate * 100} unit="%" />
      </section>

      <section>
        <h3>Chantier {selectedTile ? `(case ${selectedTile.x}, ${selectedTile.y})` : '(clique une case)'}</h3>
        {(['datacenter', 'powerPlant'] as const).map((type) => (
          <button
            key={type}
            disabled={!selectedTile || canBuild(ctx, game, type, selectedTile.x, selectedTile.y) !== null}
            onClick={() => buildHere(type)}
          >
            {type === 'datacenter' ? 'Datacenter' : ctx.config.powerPlant.name} ({buildCost(ctx, type)} t)
          </button>
        ))}
        <button onClick={upgradeGrid} disabled={game.gridLevel >= ctx.config.grid.maxLevel}>
          Optimiser le réseau (niv. {game.gridLevel}/{ctx.config.grid.maxLevel}, {ctx.config.grid.upgradeCostRareEarthT} t)
        </button>
      </section>

      <section>
        <h3>Si l'énergie manque</h3>
        <div className="toggle">
          <button className={game.priority === 'city' ? 'on' : ''} onClick={() => setPriority('city')}>
            Habitants d'abord
          </button>
          <button className={game.priority === 'datacenters' ? 'on' : ''} onClick={() => setPriority('datacenters')}>
            IA d'abord
          </button>
        </div>
      </section>

      {game.phase === 'overuse' && (
        <section>
          <h3>Limiter les usages inutiles</h3>
          {ctx.config.usageCategories
            .filter((c) => !c.essential)
            .map((c) => (
              <label key={c.id} className="check">
                <input type="checkbox" checked={game.limitedCategories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                {c.label} (−{c.trustCostOnLimit} confiance)
              </label>
            ))}
        </section>
      )}

      {lastError && <p className="error">{ERROR_LABELS[lastError] ?? lastError}</p>}

      <section className="log">
        <h3>Journal</h3>
        {log.slice(0, 6).map((l, i) => (
          <p key={i}>
            A{Math.floor(l.month / 12) + 1} : {EVENT_LABELS[l.event.type]}
          </p>
        ))}
        <p className="muted">
          Secrets trouvés : {game.discoveredEggs.length}/{ctx.map.easterEggs.length} · Stabilité : {pct(game.counters.stable / ctx.config.end.stableMonths)}
        </p>
      </section>
    </aside>
  );
}
