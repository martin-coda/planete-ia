/** Menu d'accueil (E2-5). */
import { useGame } from '../store/gameStore';

export function Menu() {
  const { newGame, openRules, openCredits } = useGame();
  return (
    <main className="menu">
      <div className="planet" aria-hidden="true" />
      <h1>Planète IA</h1>
      <p className="pitch">
        Tous les habitants de votre petite planète veulent utiliser l'IA. Construisez des datacenters pour répondre à la demande…
        sans épuiser l'énergie, les métaux ni la confiance des habitants.
      </p>
      <div className="menu-actions">
        <button className="primary big" onClick={newGame}>
          Jouer
        </button>
        <button onClick={openRules}>? Règles</button>
        <button onClick={openCredits}>Sources et crédits</button>
      </div>
      <p className="muted">Une partie dure 10 à 15 minutes · Aucune donnée personnelle collectée · nom provisoire</p>
    </main>
  );
}
