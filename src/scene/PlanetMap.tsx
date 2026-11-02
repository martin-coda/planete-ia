/**
 * Spike E0-4 : carte iso en Three.js (React Three Fiber).
 * Caméra orthographique en vue iso ; clic gauche maintenu = déplacer, clic droit = pivoter, molette = zoom.
 * Les bâtiments sont des formes simples : les vrais modèles viendront en E2.
 */
import { MapControls, OrthographicCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useGame } from '../store/gameStore';

const TILE_COLORS: Record<string, string> = { '.': '#8fbf6a', C: '#c9b79c', '~': '#4a90c2', '^': '#8a8178' };

function Tiles() {
  const map = useGame((s) => s.ctx.map);
  const selected = useGame((s) => s.selectedTile);
  const selectTile = useGame((s) => s.selectTile);

  return (
    <group position={[-map.width / 2 + 0.5, 0, -map.height / 2 + 0.5]}>
      {map.tiles.flatMap((row, y) =>
        [...row].map((t, x) => {
          const isSelected = selected?.x === x && selected?.y === y;
          const h = t === '^' ? 0.6 : t === '~' ? 0.05 : 0.2;
          return (
            <mesh
              key={`${x}-${y}`}
              position={[x, h / 2, y]}
              onClick={(e) => {
                e.stopPropagation();
                selectTile(x, y);
              }}
            >
              <boxGeometry args={[0.96, h, 0.96]} />
              <meshStandardMaterial color={isSelected ? '#f2c14e' : TILE_COLORS[t]} />
            </mesh>
          );
        }),
      )}
      <Buildings />
    </group>
  );
}

function Buildings() {
  const buildings = useGame((s) => s.game.buildings);
  const month = useGame((s) => s.game.month);

  return (
    <>
      {buildings.map((b) => {
        const ready = b.readyAt <= month;
        return b.type === 'datacenter' ? (
          <mesh key={b.id} position={[b.x, 0.5, b.y]}>
            <boxGeometry args={[0.7, 0.6, 0.7]} />
            <meshStandardMaterial color="#5b6770" transparent opacity={ready ? 1 : 0.35} />
          </mesh>
        ) : (
          <mesh key={b.id} position={[b.x, 0.65, b.y]}>
            <cylinderGeometry args={[0.25, 0.38, 0.9, 16]} />
            <meshStandardMaterial color="#e8e4dc" transparent opacity={ready ? 1 : 0.35} />
          </mesh>
        );
      })}
    </>
  );
}

export function PlanetMap() {
  return (
    <Canvas>
      <OrthographicCamera makeDefault position={[12, 12, 12]} zoom={40} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 3]} intensity={1.2} />
      <Tiles />
      <MapControls enableDamping={false} minZoom={15} maxZoom={120} />
    </Canvas>
  );
}
