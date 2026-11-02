import { useGame } from './store/gameStore';
import { useGameLoop } from './store/useGameLoop';
import { BuildPanel } from './ui/BuildPanel';
import { CreditsModal } from './ui/CreditsModal';
import { BilanModal, EndScreen } from './ui/EndScreen';
import { Gauges } from './ui/Gauges';
import { MapView } from './ui/MapView';
import { Menu } from './ui/Menu';
import { Notices } from './ui/Notices';
import { RulesModal } from './ui/RulesModal';
import { SidePanel } from './ui/SidePanel';
import { TopBar } from './ui/TopBar';

/** Fenêtres communes au menu et à la partie. */
function Modals() {
  return (
    <>
      <RulesModal />
      <CreditsModal />
    </>
  );
}

export default function App() {
  useGameLoop();
  const screen = useGame((s) => s.screen);

  if (screen === 'menu') {
    return (
      <>
        <Menu />
        <Modals />
      </>
    );
  }

  return (
    <div className="game">
      <a className="skip-link" href="#build-title">
        Aller au chantier
      </a>
      <TopBar />
      <Gauges />
      <main className="main">
        <MapView />
        <BuildPanel />
      </main>
      <SidePanel />
      {screen === 'end' && <EndScreen />}
      <Notices />
      <BilanModal />
      <Modals />
    </div>
  );
}
