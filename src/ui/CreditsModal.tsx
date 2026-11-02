/** Écran « Sources et crédits » (E2-6) : jeux de données, licences, traçabilité, hypothèses et limites. */
import { useGame } from '../store/gameStore';
import { SOURCES, sourceById, TRACEABILITY } from './dataSources';
import { Modal } from './Modal';

export function CreditsModal() {
  const { creditsOpen, closeCredits, ctx } = useGame();
  if (!creditsOpen) return null;

  return (
    <Modal labelledBy="credits-title" onClose={closeCredits} className="credits">
      <div className="modal-head">
        <h2 id="credits-title">Sources et crédits</h2>
        <button className="close" onClick={closeCredits} aria-label="Fermer les sources">
          ✕
        </button>
      </div>

      <div className="scroll">
        <p>
          Tous les chiffres du jeu s'appuient sur des <strong>données ouvertes</strong>. La planète est petite, mais on garde les
          proportions du monde réel.
        </p>

        <h3>Les jeux de données</h3>
        <ul className="source-list">
          {SOURCES.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
              <span className="muted">
                {s.publisher} · {s.year} · Licence : {s.license}
              </span>
            </li>
          ))}
        </ul>

        <h3>Du chiffre réel au paramètre du jeu</h3>
        <div className="table-wrap">
          <table className="rules-table">
            <thead>
              <tr>
                <th scope="col">Dans le jeu</th>
                <th scope="col">Source</th>
                <th scope="col">Transformation</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {TRACEABILITY.map((t) => (
                <tr key={t.param}>
                  <td>{t.realValue}</td>
                  <td>{sourceById(t.sourceId)?.publisher ?? 'Choix de conception'}</td>
                  <td>{t.transformation}</td>
                  <td>{t.status === 'calibrated' ? 'Calibré' : <em className="badge">Provisoire</em>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Hypothèses et limites</h3>
        <ul>
          <li>{ctx.config.meta.scale}</li>
          <li>Une seule source d'énergie (un réacteur fictif) : le vrai mix électrique est plus varié.</li>
          <li>
            On parle de « terres rares », mais les serveurs utilisent surtout d'autres métaux critiques (gallium, germanium, cuivre,
            cobalt…). C'est une simplification.
          </li>
          <li>Le coût énergétique d'une requête d'IA est incertain : on le donne en fourchette, pas en chiffre unique.</li>
          <li>Les valeurs marquées « provisoire » seront remplacées par des valeurs calculées à partir des sources.</li>
        </ul>

        <h3>Confidentialité</h3>
        <p>Le jeu ne demande aucun compte et ne collecte aucune donnée personnelle.</p>

        <h3>Crédits</h3>
        <p className="muted">
          Projet réalisé dans le cadre de l'Open Data University, défi ADEME « L'impact environnemental de l'IA générative ». Modèles 3D
          faits à la main en formes simples.
        </p>
      </div>
    </Modal>
  );
}
