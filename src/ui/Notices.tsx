/**
 * Annonces plein écran (E2-5) : passage en phase 2, secret découvert, planète stabilisée, « Vous avez compris les enjeux ».
 * Elles mettent le jeu en pause et s'affichent l'une après l'autre.
 */
import type { Fact } from '../engine';
import { useGame, type Notice } from '../store/gameStore';
import { factById, FACTS, sourceById } from './dataSources';
import { Modal } from './Modal';

export function FactCard({ fact }: { fact: Fact }) {
  const source = sourceById(fact.sourceId);
  return (
    <div className="fact">
      <h3>{fact.title}</h3>
      <p>{fact.text}</p>
      {fact.figure && (
        <p className="figure">
          <span className="muted">Le chiffre :</span> <strong>{fact.figure}</strong>
        </p>
      )}
      {source && (
        <p className="muted source">
          Source :{' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.publisher}, {source.title} ({source.year})
          </a>
        </p>
      )}
    </div>
  );
}

function Phase2() {
  const dismiss = useGame((s) => s.dismissNotice);
  return (
    <Modal labelledBy="notice-title" className="notice phase2-notice">
      <p className="kicker">Phase 2</p>
      <h2 id="notice-title">Toute la ville utilise l'IA !</h2>
      <div className="overflow-gauge" aria-hidden="true">
        <span />
        <em>100 %</em>
      </div>
      <p>
        Vous pensiez avoir réussi ? Ce n'est pas fini : chaque habitant en utilise <strong>de plus en plus</strong>, et souvent pour rien.
        La jauge d'intensité dépasse maintenant 100 %.
      </p>
      <p className="tip">
        Construire toujours plus ne suffira pas. Un nouveau panneau est disponible : <strong>« Limiter les usages inutiles »</strong>.
      </p>
      <button className="primary big" data-autofocus onClick={dismiss}>
        Continuer
      </button>
    </Modal>
  );
}

function Egg({ factId }: { factId: string }) {
  const { dismissNotice, game, ctx } = useGame();
  const fact = factById(factId);
  return (
    <Modal labelledBy="notice-title" onClose={dismissNotice} className="notice">
      <p className="kicker">
        🔍 Secret découvert · {game.discoveredEggs.length}/{ctx.map.easterEggs.length}
      </p>
      <h2 id="notice-title" className="sr-only">
        Secret découvert
      </h2>
      {fact ? <FactCard fact={fact} /> : <p>Fiche introuvable.</p>}
      <button className="primary big" data-autofocus onClick={dismissNotice}>
        Retour à la planète
      </button>
    </Modal>
  );
}

function Stabilized() {
  const { dismissNotice, game, ctx } = useGame();
  const missing = ctx.map.easterEggs.length - game.discoveredEggs.length;
  return (
    <Modal labelledBy="notice-title" onClose={dismissNotice} className="notice">
      <p className="kicker">Bravo</p>
      <h2 id="notice-title">Planète stabilisée</h2>
      <p>
        Pendant {ctx.config.end.stableMonths / 12} ans, l'IA a été disponible, les habitants vous ont fait confiance et la demande a
        cessé de grimper. Vous avez limité les usages inutiles au lieu de construire sans fin.
      </p>
      {missing > 0 && (
        <p className="tip">
          Il reste <strong>{missing} secret{missing > 1 ? 's' : ''}</strong> caché{missing > 1 ? 's' : ''} sur la carte. Trouvez-les tous
          pour comprendre tous les enjeux.
        </p>
      )}
      <button className="primary big" data-autofocus onClick={dismissNotice}>
        Continuer
      </button>
    </Modal>
  );
}

function Understood() {
  const { dismissNotice, openBilan } = useGame();
  const fact = FACTS.find((f) => f.kind === 'ending' && f.ending === 'stabilized');
  return (
    <Modal labelledBy="notice-title" onClose={dismissNotice} className="notice">
      <p className="kicker">Fin… ou presque</p>
      <h2 id="notice-title">Vous avez compris les enjeux</h2>
      {fact && <p>{fact.text}</p>}
      <p className="muted">Il n'y a pas de vraie victoire : dans la réalité, ces problèmes ne sont pas réglés. La planète reste ouverte, explorez librement.</p>
      <div className="actions">
        <button
          onClick={() => {
            dismissNotice();
            openBilan();
          }}
        >
          Voir le bilan
        </button>
        <button className="primary big" data-autofocus onClick={dismissNotice}>
          Continuer à explorer
        </button>
      </div>
    </Modal>
  );
}

function renderNotice(n: Notice) {
  switch (n.kind) {
    case 'phase2':
      return <Phase2 />;
    case 'egg':
      return <Egg factId={n.factId} />;
    case 'stabilized':
      return <Stabilized />;
    case 'understood':
      return <Understood />;
  }
}

export function Notices() {
  const notice = useGame((s) => s.notices[0]);
  return notice ? <div key={JSON.stringify(notice)}>{renderNotice(notice)}</div> : null;
}
