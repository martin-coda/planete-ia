/**
 * Panneau latéral : arbitrage ville / IA (E2-3), alertes, usages de la phase 2, objectif,
 * carnet des secrets et journal.
 */
import type { GameEvent } from '../engine';
import { overuseCap } from '../engine';
import { useGame } from '../store/gameStore';
import { factById } from './dataSources';
import { fmt, pct } from './format';

function EnergyArbitration() {
  const { game, setPriority } = useGame();
  const m = game.metrics;
  const netMw = m.productionMw * (1 - m.lossRate);
  const missing = m.cityNeedMw + m.datacenterNeedMw - netMw;

  return (
    <section className="panel" aria-labelledby="arb-title">
      <h2 id="arb-title">Si l'énergie manque</h2>
      <div className="segmented" role="group" aria-label="Priorité en cas de manque d'énergie">
        <button className={game.priority === 'city' ? 'on' : ''} aria-pressed={game.priority === 'city'} onClick={() => setPriority('city')}>
          🏠 Habitants d'abord
        </button>
        <button
          className={game.priority === 'datacenters' ? 'on' : ''}
          aria-pressed={game.priority === 'datacenters'}
          onClick={() => setPriority('datacenters')}
        >
          🖥️ IA d'abord
        </button>
      </div>
      <p className={`arb-status ${missing > 0.01 ? 'warn' : 'ok'}`}>
        {missing > 0.01 ? (
          <>
            Il manque <strong>{fmt(missing, 0)} MW</strong> :{' '}
            {game.priority === 'city'
              ? "la ville est alimentée, mais les datacenters tournent au ralenti et l'IA devient moins disponible."
              : "l'IA tourne, mais des quartiers de la ville sont privés d'électricité."}
          </>
        ) : (
          'Assez d’énergie : tout le monde est alimenté.'
        )}
      </p>
    </section>
  );
}

function Alerts() {
  const { game, ctx } = useGame();
  const e = ctx.config.end;
  const items: string[] = [];
  if (game.counters.blackout > 0)
    items.push(`Panne générale dans ${e.blackoutMonths - game.counters.blackout} mois si la ville reste sans électricité.`);
  if (game.counters.resources > 0)
    items.push(`Plus de métaux : défaite dans ${e.resourcesMonths - game.counters.resources} mois si l'IA reste aussi peu disponible.`);
  if (game.trust < 20) items.push('La confiance est presque à zéro !');
  if (!items.length) return null;

  return (
    <section className="panel alerts" aria-labelledby="alerts-title">
      <h2 id="alerts-title">⚠ Alertes</h2>
      <ul>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

function Usages() {
  const { game, ctx, toggleCategory } = useGame();
  const categories = ctx.config.usageCategories.filter((c) => !c.essential);

  if (game.phase === 'adoption') {
    return (
      <section className="panel locked" aria-labelledby="usage-title">
        <h2 id="usage-title">Limiter les usages inutiles</h2>
        <p className="muted">🔒 Se débloque en phase 2, quand toute la ville utilisera l'IA.</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="usage-title">
      <h2 id="usage-title">Limiter les usages inutiles</h2>
      <p className="muted">
        Limiter un usage fait baisser le plafond de la demande (actuellement {pct(1 + overuseCap(ctx, game.limitedCategories))}{' '}
        d'intensité), mais coûte un peu de confiance, une seule fois.
      </p>
      <ul className="usage-list">
        {categories.map((c) => {
          const on = game.limitedCategories.includes(c.id);
          return (
            <li key={c.id}>
              <label className={on ? 'on' : ''}>
                <input type="checkbox" checked={on} onChange={() => toggleCategory(c.id)} />
                <span className="usage-label">{c.label}</span>
                <span className="usage-meta">
                  {c.realShare !== undefined && <>{pct(c.realShare)} des conversations Compar:IA · </>}
                  {pct(c.shareOfExtra)} de la surconso · −{fmt(c.trustCostOnLimit, 0)} confiance
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Objective() {
  const { game, ctx } = useGame();
  const e = ctx.config.end;

  if (game.phase === 'adoption') {
    return (
      <section className="panel" aria-labelledby="obj-title">
        <h2 id="obj-title">Objectif</h2>
        <p>Accompagner l'arrivée de l'IA jusqu'à ce que toute la ville l'utilise, sans panne ni perte de confiance.</p>
      </section>
    );
  }

  const m = game.metrics;
  const yearAgo = game.recentDemand.length === 13 ? game.recentDemand[0] : null;
  const growth = yearAgo ? m.demandPflops / yearAgo - 1 : null;
  const checks: [boolean, string][] = [
    [m.availability >= e.stableMinAvailability, `IA disponible ≥ ${pct(e.stableMinAvailability)} (${pct(m.availability)})`],
    [game.trust >= e.stableMinTrust, `Confiance ≥ ${e.stableMinTrust} % (${fmt(game.trust, 0)} %)`],
    [
      growth !== null && growth <= e.stableMaxYearlyDemandGrowth,
      `Demande qui grimpe de ${pct(e.stableMaxYearlyDemandGrowth)} par an au plus (${growth === null ? '…' : pct(growth, 1)})`,
    ],
  ];
  const progress = game.counters.stable / e.stableMonths;

  return (
    <section className="panel" aria-labelledby="obj-title">
      <h2 id="obj-title">{game.stabilized ? 'Planète stabilisée ✓' : 'Stabiliser la planète'}</h2>
      {!game.stabilized && (
        <>
          <p className="muted">Tenir ces 3 conditions pendant {fmt(e.stableMonths / 12, 0)} ans d'affilée :</p>
          <ul className="checks">
            {checks.map(([ok, label]) => (
              <li key={label} className={ok ? 'ok' : ''}>
                <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {label}
                <span className="sr-only">{ok ? ' : rempli' : ' : pas encore'}</span>
              </li>
            ))}
          </ul>
          <div className="bar" role="meter" aria-label="Progression de la stabilité" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="muted">
            {fmt(game.counters.stable, 0)} / {e.stableMonths} mois
          </p>
        </>
      )}
      {game.stabilized && !game.understood && <p>Trouve tous les secrets de la carte pour comprendre tous les enjeux.</p>}
      {game.understood && <p>Vous avez compris les enjeux. La planète reste ouverte : explore librement.</p>}
    </section>
  );
}

function SecretsNotebook() {
  const { game, ctx, showEgg } = useGame();
  const eggs = ctx.map.easterEggs;

  return (
    <section className="panel" aria-labelledby="eggs-title">
      <h2 id="eggs-title">
        Carnet des secrets · {game.discoveredEggs.length}/{eggs.length}
      </h2>
      <ul className="eggs">
        {eggs.map((egg) => {
          const found = game.discoveredEggs.includes(egg.id);
          const fact = factById(egg.factId);
          return (
            <li key={egg.id}>
              {found ? (
                <button className="link" onClick={() => showEgg(egg.factId)}>
                  🔍 {fact?.title.replace('Fiche secrète : ', '') ?? egg.id}
                </button>
              ) : (
                <span className="muted">❔ Secret à trouver</span>
              )}
            </li>
          );
        })}
      </ul>
      {game.discoveredEggs.length < eggs.length && <p className="muted">Indice : clique sur les cases de la carte, même celles qui ne se construisent pas.</p>}
    </section>
  );
}

const BUILDING_NAMES = { datacenter: 'Datacenter', powerPlant: 'Réacteur' } as const;

function eventLabel(e: GameEvent): string {
  switch (e.type) {
    case 'buildingReady':
      return `${BUILDING_NAMES[e.buildingType]} en service`;
    case 'phase2Started':
      return 'Phase 2 : la surconsommation commence';
    case 'rareEarthDepleted':
      return 'Plus de terres rares';
    case 'stabilized':
      return 'Planète stabilisée';
    case 'understood':
      return 'Vous avez compris les enjeux';
    case 'defeat':
      return 'Défaite';
  }
}

function Journal() {
  const log = useGame((s) => s.log);
  return (
    <section className="panel" aria-labelledby="log-title">
      <h2 id="log-title">Journal</h2>
      {log.length === 0 ? (
        <p className="muted">Rien à signaler pour l'instant.</p>
      ) : (
        <ol className="log">
          {log.slice(0, 8).map((l, i) => (
            <li key={i}>
              <span className="muted">A{Math.floor(l.month / 12) + 1}</span> {eventLabel(l.event)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function SidePanel() {
  return (
    <aside className="side" aria-label="Gestion de la planète">
      <Alerts />
      <EnergyArbitration />
      <Usages />
      <Objective />
      <SecretsNotebook />
      <Journal />
    </aside>
  );
}
