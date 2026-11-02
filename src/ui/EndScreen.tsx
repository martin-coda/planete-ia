/** Écran de fin (E2-5) avec « Et dans le monde réel ? » et bilan en graphiques (E2-8). Fenêtre de bilan en cours de partie. */
import { useGame } from '../store/gameStore';
import { BilanCharts } from './BilanCharts';
import { FACTS } from './dataSources';
import { yearsLabel } from './format';
import { Modal } from './Modal';
import { FactCard } from './Notices';

const DEFEAT_TITLES = {
  blackout: 'Panne générale : la ville est plongée dans le noir',
  resources: 'Plus de métaux pour construire',
  trust: 'Les habitants ont perdu confiance',
};

const DEFEAT_EXPLAIN = {
  blackout: "La ville est restée trop longtemps sans assez d'électricité.",
  resources: "Le stock de terres rares ne permettait plus de construire, et l'IA ne répondait plus à la demande.",
  trust: "Trop de pannes ou d'IA indisponible : la confiance des habitants est tombée à 0 %.",
};

function Stats() {
  const { game, ctx } = useGame();
  const dcs = game.buildings.filter((b) => b.type === 'datacenter').length;
  const plants = game.buildings.filter((b) => b.type === 'powerPlant').length;
  return (
    <dl className="stats">
      <div>
        <dt>Planète tenue</dt>
        <dd>{yearsLabel(game.month)}</dd>
      </div>
      <div>
        <dt>Datacenters</dt>
        <dd>{dcs}</dd>
      </div>
      <div>
        <dt>Réacteurs</dt>
        <dd>{plants}</dd>
      </div>
      <div>
        <dt>Usages limités</dt>
        <dd>{game.limitedCategories.length}</dd>
      </div>
      <div>
        <dt>Secrets</dt>
        <dd>
          {game.discoveredEggs.length}/{ctx.map.easterEggs.length}
        </dd>
      </div>
    </dl>
  );
}

export function EndScreen() {
  const { game, newGame, backToMenu } = useGame();
  if (!game.defeat) return null;
  // En phase 2 on montre le fait « surconsommation », sinon celui de la cause de défaite
  const ending = game.defeat.phase === 'overuse' ? 'overuse' : game.defeat.reason;
  const fact = FACTS.find((f) => f.kind === 'ending' && f.ending === ending);

  return (
    <Modal labelledBy="end-title" className="end">
      <p className="kicker">Fin de partie · {game.defeat.phase === 'overuse' ? 'phase 2' : 'phase 1'}</p>
      <h2 id="end-title">{DEFEAT_TITLES[game.defeat.reason]}</h2>
      <p>{DEFEAT_EXPLAIN[game.defeat.reason]}</p>
      <Stats />
      {fact && (
        <section className="real-world" aria-label="Et dans le monde réel ?">
          <FactCard fact={{ ...fact, title: 'Et dans le monde réel ?' }} />
        </section>
      )}
      <h3>Le bilan de votre partie</h3>
      <BilanCharts history={game.history} />
      <div className="actions">
        <button onClick={backToMenu}>Menu</button>
        <button className="primary big" data-autofocus onClick={newGame}>
          Rejouer
        </button>
      </div>
    </Modal>
  );
}

export function BilanModal() {
  const { bilanOpen, closeBilan, game } = useGame();
  if (!bilanOpen) return null;
  return (
    <Modal labelledBy="bilan-title" onClose={closeBilan} className="end">
      <div className="modal-head">
        <h2 id="bilan-title">Bilan · {yearsLabel(game.month)}</h2>
        <button className="close" onClick={closeBilan} aria-label="Fermer le bilan">
          ✕
        </button>
      </div>
      <Stats />
      <BilanCharts history={game.history} />
    </Modal>
  );
}
