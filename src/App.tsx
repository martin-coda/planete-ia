import facts from './data/facts.json';
import { PlanetMap } from './scene/PlanetMap';
import { useGame } from './store/gameStore';
import { useGameLoop } from './store/useGameLoop';
import { DebugHud } from './ui/DebugHud';
import { RulesButton, RulesModal } from './ui/RulesModal';

const DEFEAT_TITLES = {
  blackout: 'Panne générale : la ville est plongée dans le noir',
  resources: 'Plus de métaux pour construire',
  trust: 'Les habitants ont perdu confiance',
};

function EndScreen() {
  const { game, newGame, backToMenu } = useGame();
  if (!game.defeat) return null;
  // En phase 2 on montre le fait "surconsommation", sinon celui de la cause de défaite
  const ending = game.defeat.phase === 'overuse' ? 'overuse' : game.defeat.reason;
  const fact = facts.find((f) => f.kind === 'ending' && f.ending === ending);

  return (
    <div className="overlay">
      <div className="card">
        <h2>{DEFEAT_TITLES[game.defeat.reason]}</h2>
        <p>Votre planète a tenu {Math.floor(game.defeat.month / 12)} ans.</p>
        {fact && (
          <>
            <h3>{fact.title}</h3>
            <p>{fact.text}</p>
          </>
        )}
        <button onClick={newGame}>Rejouer</button>
        <button onClick={backToMenu}>Menu</button>
      </div>
    </div>
  );
}

export default function App() {
  useGameLoop();
  const screen = useGame((s) => s.screen);
  const newGame = useGame((s) => s.newGame);

  if (screen === 'menu') {
    return (
      <main className="menu">
        <h1>Planète IA</h1>
        <p>Répondez à la demande d'IA de votre planète… sans épuiser l'énergie, les métaux ni la confiance des habitants.</p>
        <button onClick={newGame}>Jouer</button>
        <div>
          <RulesButton className="secondary" />
        </div>
        <p className="muted">Prototype moteur (E1) · nom provisoire</p>
        <RulesModal />
      </main>
    );
  }

  return (
    <main className="game">
      <div className="map">
        <PlanetMap />
      </div>
      <DebugHud />
      {screen === 'end' && <EndScreen />}
      <RulesModal />
    </main>
  );
}
