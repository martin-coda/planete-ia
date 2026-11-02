/**
 * Fenêtre « Règles du jeu » : explique au joueur comment jouer.
 * Tous les chiffres sont lus dans game-params.json, ils restent donc justes quand R3 recalibre les valeurs.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../store/gameStore';

const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const pct = (n: number) => `${fmt(n * 100, 1)} %`;

interface Page {
  id: string;
  title: string;
  body: ReactNode;
}

function usePages(): Page[] {
  const { config, map } = useGame((s) => s.ctx);
  const dc = config.datacenter;
  const pp = config.powerPlant;
  const grid = config.grid;
  const end = config.end;
  const limitable = config.usageCategories.filter((c) => !c.essential);

  return [
    {
      id: 'goal',
      title: 'Le but du jeu',
      body: (
        <>
          <p>
            Tu gères une ville de <strong>{fmt(config.planet.population, 0)} habitants</strong> sur une petite planète. Tout le monde
            veut utiliser l'IA, et la demande ne s'arrête jamais de monter.
          </p>
          <p>Ta mission : répondre à cette demande en construisant des datacenters, <strong>sans épuiser</strong> :</p>
          <ul>
            <li>⚡ l'<strong>énergie</strong> (la ville en a besoin aussi) ;</li>
            <li>⛏️ les <strong>terres rares</strong> (un stock qui ne se renouvelle pas) ;</li>
            <li>🤝 la <strong>confiance</strong> des habitants.</li>
          </ul>
          <p className="tip">
            Attention : on ne peut pas vraiment « gagner ». Dans la réalité, ces problèmes ne sont pas réglés. Le jeu te demande de
            les <em>comprendre</em>.
          </p>
        </>
      ),
    },
    {
      id: 'time',
      title: 'Le temps qui passe',
      body: (
        <>
          <p>
            Une seconde de jeu = <strong>un mois</strong> sur ta planète (en vitesse ×1). Tu peux accélérer (×2, ×5), mettre en pause
            ⏸, ou avancer mois par mois avec <strong>+1 mois</strong> quand le jeu est en pause.
          </p>
          <p>La partie se joue en deux temps :</p>
          <ol>
            <li>
              <strong>Phase 1 : l'adoption.</strong> De plus en plus d'habitants se mettent à utiliser l'IA, jusqu'à ce que toute la
              ville l'utilise.
            </li>
            <li>
              <strong>Phase 2 : la surconsommation.</strong> Tu crois avoir fini… mais chaque habitant en utilise de plus en plus,
              souvent pour rien. La jauge « Intensité d'usage » dépasse alors 100 %.
            </li>
          </ol>
        </>
      ),
    },
    {
      id: 'build',
      title: 'Construire',
      body: (
        <>
          <p>
            <strong>Clique sur une case</strong> de la carte, puis choisis quoi construire dans le panneau « Chantier ». On ne peut
            pas construire sur l'eau, la montagne ou la ville.
          </p>
          <table className="rules-table">
            <thead>
              <tr>
                <th>Bâtiment</th>
                <th>Coût</th>
                <th>Effet</th>
                <th>Chantier</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🖥️ Datacenter</td>
                <td>{fmt(dc.costRareEarthT)} t de terres rares</td>
                <td>
                  +{fmt(dc.computePflops)} PFLOP/s de calcul, mais consomme jusqu'à {fmt(dc.powerMw)} MW
                </td>
                <td>{dc.buildMonths} mois</td>
              </tr>
              <tr>
                <td>⚛️ {pp.name}</td>
                <td>{fmt(pp.costRareEarthT)} t de terres rares</td>
                <td>+{fmt(pp.productionMw)} MW d'énergie</td>
                <td>{pp.buildMonths} mois</td>
              </tr>
              <tr>
                <td>🔌 Optimiser le réseau</td>
                <td>{fmt(grid.upgradeCostRareEarthT)} t de terres rares</td>
                <td>
                  −{pct(grid.lossReductionPerLevel)} de pertes (jusqu'à {grid.maxLevel} niveaux)
                </td>
                <td>immédiat</td>
              </tr>
            </tbody>
          </table>
          <p className="tip">
            Un bâtiment en chantier apparaît transparent. Le réacteur met {pp.buildMonths} mois à sortir de terre : anticipe !
          </p>
        </>
      ),
    },
    {
      id: 'resources',
      title: 'Énergie et terres rares',
      body: (
        <>
          <h4>⚡ L'énergie</h4>
          <p>
            Seuls les réacteurs produisent de l'énergie. Elle passe par le réseau électrique, qui en perd une partie en route (
            {pct(grid.baseLossRate)} au départ). Ce qui reste est partagé entre :
          </p>
          <ul>
            <li>
              la <strong>ville</strong>, qui a besoin de {fmt(config.city.powerMw)} MW en permanence ;
            </li>
            <li>
              les <strong>datacenters</strong>, qui consomment même quand ils ne travaillent pas ({pct(dc.idlePowerShare)} de leur
              puissance à vide).
            </li>
          </ul>
          <h4>⛏️ Les terres rares</h4>
          <p>
            Tu commences avec <strong>{fmt(config.rareEarth.initialStockT, 0)} t</strong>. Chaque construction en coûte, et la ville
            en consomme un peu chaque année ({fmt(config.city.rareEarthTPerYear)} t/an) : le stock baisse même si tu ne construis
            rien. Il ne se renouvelle jamais.
          </p>
          <p className="muted">
            En vrai, les serveurs utilisent surtout des « métaux critiques » (gallium, cuivre, cobalt…). Le jeu simplifie en parlant
            de terres rares.
          </p>
        </>
      ),
    },
    {
      id: 'shortage',
      title: "Quand l'énergie manque",
      body: (
        <>
          <p>
            Si les réacteurs ne produisent pas assez, il faut choisir <strong>qui s'éteint en premier</strong> (panneau « Si
            l'énergie manque ») :
          </p>
          <ul>
            <li>
              <strong>Habitants d'abord</strong> : la ville reste allumée, mais les datacenters tournent au ralenti et l'IA devient
              moins disponible.
            </li>
            <li>
              <strong>IA d'abord</strong> : l'IA fonctionne, mais des quartiers de la ville sont privés d'électricité.
            </li>
          </ul>
          <h4>🤝 La confiance</h4>
          <p>Les habitants perdent confiance quand :</p>
          <ul>
            <li>la ville manque d'électricité ;</li>
            <li>
              l'IA n'est pas disponible (jauge « Disponibilité IA » sous 100 %). <strong>Plus la demande est forte, plus ça coûte
              cher</strong> : sacrifier l'IA passe presque inaperçu au début, beaucoup moins à la fin.
            </li>
          </ul>
          <p>Quand tout va bien, la confiance remonte doucement (+{fmt(config.trust.recoveryPerMonth)} par mois).</p>
        </>
      ),
    },
    {
      id: 'overuse',
      title: 'Phase 2 : limiter les usages',
      body: (
        <>
          <p>
            En phase 2, construire toujours plus ne suffit plus : les terres rares finiront par manquer. Un nouveau panneau apparaît :{' '}
            <strong>« Limiter les usages inutiles »</strong>.
          </p>
          <p>Ces usages ne sont pas essentiels. Les limiter freine la demande, et peut même la faire redescendre :</p>
          <ul>
            {limitable.map((c) => (
              <li key={c.id}>
                {c.label} <span className="muted">(−{c.trustCostOnLimit} de confiance, une seule fois)</span>
              </li>
            ))}
          </ul>
          <p>
            Les usages essentiels (travail, apprendre, chercher une information) ne peuvent pas être limités.
          </p>
          <p className="tip">C'est le cœur du jeu : la meilleure solution n'est pas toujours de construire plus.</p>
        </>
      ),
    },
    {
      id: 'end',
      title: 'Perdre… ou tenir',
      body: (
        <>
          <h4>Trois façons de perdre</h4>
          <ul>
            <li>
              💡 <strong>Panne générale</strong> : la ville reçoit moins de {pct(end.blackoutCityRatio)} de son électricité pendant{' '}
              {end.blackoutMonths} mois d'affilée.
            </li>
            <li>
              ⛏️ <strong>Plus de métaux</strong> : impossible de construire un datacenter et l'IA disponible à moins de{' '}
              {pct(end.resourcesAvailability)} pendant {end.resourcesMonths} mois.
            </li>
            <li>
              🤝 <strong>Plus de confiance</strong> : la jauge tombe à 0 %.
            </li>
          </ul>
          <p>À chaque défaite, un écran « Et dans le monde réel ? » te montre un vrai chiffre, avec sa source.</p>
          <h4>Stabiliser la planète</h4>
          <p>
            En phase 2, tiens <strong>{fmt(end.stableMonths / 12, 0)} ans</strong> d'affilée avec une IA disponible à au moins{' '}
            {pct(end.stableMinAvailability)}, une confiance d'au moins {end.stableMinTrust} % et une demande qui ne grimpe presque
            plus (≤ {pct(end.stableMaxYearlyDemandGrowth)} par an). La jauge « Stabilité » du journal suit ta progression.
          </p>
          <h4>🔍 Les secrets</h4>
          <p>
            {map.easterEggs.length} secrets sont cachés sur la carte. Clique sur les cases pour les trouver : chacun débloque une fiche
            avec de vraies données. Planète stable + tous les secrets = « Vous avez compris les enjeux ».
          </p>
        </>
      ),
    },
    {
      id: 'controls',
      title: 'Commandes',
      body: (
        <table className="rules-table">
          <tbody>
            <tr>
              <td>Sélectionner une case, chercher un secret</td>
              <td>Clic gauche</td>
            </tr>
            <tr>
              <td>Déplacer la carte</td>
              <td>Clic gauche maintenu</td>
            </tr>
            <tr>
              <td>Faire pivoter la vue</td>
              <td>Clic droit maintenu</td>
            </tr>
            <tr>
              <td>Zoomer / dézoomer</td>
              <td>Molette</td>
            </tr>
            <tr>
              <td>Pause / reprendre</td>
              <td>Échap</td>
            </tr>
            <tr>
              <td>Revoir ces règles</td>
              <td>Bouton « ? Règles »</td>
            </tr>
          </tbody>
        </table>
      ),
    },
  ];
}

export function RulesModal() {
  const open = useGame((s) => s.rulesOpen);
  const closeRules = useGame((s) => s.closeRules);
  const pages = usePages();
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const page = pages[index];
  const isLast = index === pages.length - 1;

  return (
    <div className="overlay" onClick={closeRules}>
      <div
        className="card rules"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rules-head">
          <h2 id="rules-title">Règles du jeu</h2>
          <button ref={closeRef} className="close" onClick={closeRules} aria-label="Fermer les règles">
            ✕
          </button>
        </div>

        <nav className="rules-tabs" aria-label="Chapitres des règles">
          {pages.map((p, i) => (
            <button key={p.id} className={i === index ? 'on' : ''} aria-current={i === index ? 'page' : undefined} onClick={() => setIndex(i)}>
              {p.title}
            </button>
          ))}
        </nav>

        <section className="rules-body">
          <h3>{page.title}</h3>
          {page.body}
        </section>

        <footer className="rules-foot">
          <button onClick={() => setIndex(index - 1)} disabled={index === 0}>
            ← Précédent
          </button>
          <span className="muted">
            {index + 1} / {pages.length}
          </span>
          {isLast ? (
            <button className="primary" onClick={closeRules}>
              C'est parti !
            </button>
          ) : (
            <button className="primary" onClick={() => setIndex(index + 1)}>
              Suivant →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/** Bouton qui ouvre les règles (menu et HUD). */
export function RulesButton({ className = '' }: { className?: string }) {
  const openRules = useGame((s) => s.openRules);
  return (
    <button className={`rules-btn ${className}`} onClick={openRules}>
      ? Règles
    </button>
  );
}
