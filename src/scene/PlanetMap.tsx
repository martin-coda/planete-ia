/**
 * Carte isométrique de la planète (E2-2) et caméra (E2-4).
 * Caméra orthographique en vue iso. Souris : clic gauche maintenu = déplacer, clic droit = pivoter, molette = zoom.
 * Tactile : un doigt = déplacer, deux doigts = zoomer / pivoter.
 * Chaque case est un groupe : un clic sur un bâtiment ou un arbre sélectionne la case qui le porte.
 */
import { MapControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { canBuild, type BuildingType } from '../engine';
import { useGame } from '../store/gameStore';
import { cameraApi, ZOOM_MAX, ZOOM_MIN } from './cameraApi';
import { hash } from './hash';
import { CityBlock, Datacenter, EggMarker, Mountain, Reactor, Tree } from './models';

const TILE_HEIGHT: Record<string, number> = { '.': 0.2, C: 0.22, '~': 0.06, '^': 0.24 };
const TILE_COLOR: Record<string, string> = { '.': '#8fbf6a', C: '#b9ad9a', '~': '#4a90c2', '^': '#9a9086' };
const HOVER_COLOR = '#f6dc8a';
const SELECTED_COLOR = '#f2c14e';
const BUILDABLE_COLOR = '#b5e08f';

/** Un clic n'en est pas un si la souris a bougé (l'utilisateur déplaçait la carte). */
const CLICK_TOLERANCE_PX = 6;

const ghostOk = new THREE.MeshStandardMaterial({ color: '#4caf50', transparent: true, opacity: 0.55, depthWrite: false });
const ghostBad = new THREE.MeshStandardMaterial({ color: '#d9453b', transparent: true, opacity: 0.55, depthWrite: false });

/** Résumé du bâtiment d'une case, sous forme de texte pour ne re-rendre que quand il change. */
function useBuildingAt(x: number, y: number) {
  const key = useGame((s) => {
    const b = s.game.buildings.find((b) => b.x === x && b.y === y);
    if (!b) return '';
    const left = b.readyAt - s.game.month;
    return `${b.type}|${left > 0 ? left : 0}|${b.readyAt}`;
  });
  if (!key) return null;
  const [type, left] = key.split('|');
  return { type: type as BuildingType, monthsLeft: Number(left) };
}

/** Part de l'énergie reçue, arrondie pour éviter de re-rendre à chaque tick. */
const usePower = (who: 'city' | 'datacenters') =>
  useGame((s) => {
    const m = s.game.metrics;
    const r = who === 'city' ? (m.cityNeedMw ? m.cityGotMw / m.cityNeedMw : 1) : m.datacenterNeedMw ? m.datacenterGotMw / m.datacenterNeedMw : 1;
    return Math.round(r * 8) / 8;
  });

function BuildingModel({ type, monthsLeft }: { type: BuildingType; monthsLeft: number }) {
  const ctx = useGame((s) => s.ctx);
  const power = usePower('datacenters');
  const total = type === 'datacenter' ? ctx.config.datacenter.buildMonths : ctx.config.powerPlant.buildMonths;
  const progress = monthsLeft > 0 ? 1 - monthsLeft / Math.max(1, total) : undefined;
  return type === 'datacenter' ? <Datacenter power={power} progress={progress} /> : <Reactor progress={progress} />;
}

function CityTile({ x, y }: { x: number; y: number }) {
  const power = usePower('city');
  return <CityBlock x={x} y={y} power={power} />;
}

const Tile = memo(function Tile({ x, y, t }: { x: number; y: number; t: string }) {
  const hovered = useGame((s) => s.hoverTile?.x === x && s.hoverTile?.y === y);
  const selected = useGame((s) => s.selectedTile?.x === x && s.selectedTile?.y === y);
  const placing = useGame((s) => s.placing !== null);
  const eggFound = useGame((s) => s.ctx.map.easterEggs.some((e) => e.x === x && e.y === y && s.game.discoveredEggs.includes(e.id)));
  const building = useBuildingAt(x, y);
  const { hoverAt, selectTile } = useGame.getState();

  const h = TILE_HEIGHT[t] ?? 0.2;
  const buildable = t === '.' && !building;
  const color = selected ? SELECTED_COLOR : hovered ? HOVER_COLOR : placing && buildable ? BUILDABLE_COLOR : TILE_COLOR[t];
  const hasTree = t === '.' && !building && hash(x, y, 1) < 0.22;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE_PX) return;
    selectTile(x, y);
  };

  return (
    <group
      position={[x, 0, y]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverAt({ x, y });
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        const cur = useGame.getState().hoverTile;
        if (cur?.x === x && cur?.y === y) hoverAt(null);
      }}
    >
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.98, h, 0.98]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <group position={[0, h, 0]}>
        {t === '^' && <Mountain x={x} y={y} />}
        {t === 'C' && <CityTile x={x} y={y} />}
        {hasTree && <Tree x={x} y={y} />}
        {building && <BuildingModel type={building.type} monthsLeft={building.monthsLeft} />}
        {eggFound && <EggMarker />}
      </group>
    </group>
  );
});

/** Aperçu transparent du bâtiment sous la souris : vert si on peut construire, rouge sinon. */
function PlacementGhost() {
  const placing = useGame((s) => s.placing);
  const tile = useGame((s) => s.hoverTile);
  const ok = useGame((s) => (s.placing && s.hoverTile ? canBuild(s.ctx, s.game, s.placing, s.hoverTile.x, s.hoverTile.y) === null : false));
  const t = useGame((s) => (s.hoverTile ? s.ctx.map.tiles[s.hoverTile.y]?.[s.hoverTile.x] : undefined));
  if (!placing || !tile || !t) return null;
  const mat = ok ? ghostOk : ghostBad;
  return (
    <group position={[tile.x, (TILE_HEIGHT[t] ?? 0.2) + 0.01, tile.y]}>
      {placing === 'datacenter' ? <Datacenter ghost={mat} /> : <Reactor ghost={mat} />}
    </group>
  );
}

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: 'change', fn: () => void) => void;
  removeEventListener: (type: 'change', fn: () => void) => void;
}

const ISO_OFFSET = new THREE.Vector3(12, 12, 12);

/** Branche les boutons de caméra, ajuste le zoom à la taille de l'écran et empêche de perdre la carte de vue. */
function CameraRig({ width, height }: { width: number; height: number }) {
  // La caméra est lue via get() : Three.js la modifie en place, ce n'est pas un état React
  const get = useThree((s) => s.get);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const size = useThree((s) => s.size);
  const fitted = useRef(false);

  const fitZoom = useMemo(() => {
    // Largeur projetée d'une grille iso ≈ (largeur + hauteur) / √2
    const diag = (width + height) / Math.SQRT2;
    return THREE.MathUtils.clamp(Math.min(size.width / (diag + 1), size.height / (diag * 0.62 + 1.5)), ZOOM_MIN, ZOOM_MAX);
  }, [size.width, size.height, width, height]);

  useEffect(() => {
    if (!controls) return;
    const camera = get().camera as THREE.OrthographicCamera;
    const reset = () => {
      controls.target.set(0, 0, 0);
      camera.position.copy(ISO_OFFSET);
      camera.zoom = fitZoom;
      camera.updateProjectionMatrix();
      controls.update();
    };
    if (!fitted.current && size.width > 0) {
      fitted.current = true;
      reset();
    }

    cameraApi.current = {
      reset,
      zoomBy: (f) => {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, ZOOM_MIN, ZOOM_MAX);
        camera.updateProjectionMatrix();
        controls.update();
      },
      rotate: (dir) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (dir * Math.PI) / 2);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
    };

    // On garde le centre de la vue au-dessus de la carte
    const limitX = width / 2;
    const limitZ = height / 2;
    const clampPan = () => {
      const t = controls.target;
      const cx = THREE.MathUtils.clamp(t.x, -limitX, limitX);
      const cz = THREE.MathUtils.clamp(t.z, -limitZ, limitZ);
      if (cx !== t.x || cz !== t.z) {
        camera.position.x += cx - t.x;
        camera.position.z += cz - t.z;
        t.set(cx, t.y, cz);
      }
    };
    controls.addEventListener('change', clampPan);
    return () => {
      controls.removeEventListener('change', clampPan);
      cameraApi.current = null;
    };
  }, [get, controls, fitZoom, size.width, width, height]);

  return null;
}

function Tiles() {
  const map = useGame((s) => s.ctx.map);
  return (
    <group position={[-map.width / 2 + 0.5, 0, -map.height / 2 + 0.5]}>
      {map.tiles.flatMap((row, y) => [...row].map((t, x) => <Tile key={`${x}-${y}`} x={x} y={y} t={t} />))}
      <PlacementGhost />
    </group>
  );
}

export function PlanetMap() {
  const map = useGame((s) => s.ctx.map);
  return (
    <Canvas dpr={[1, 2]} aria-hidden="true" onPointerMissed={() => useGame.getState().hoverAt(null)}>
      <color attach="background" args={['#cfe3ee']} />
      <OrthographicCamera makeDefault position={[12, 12, 12]} zoom={40} near={-100} far={200} />
      <hemisphereLight args={['#ffffff', '#8aa07a', 0.9]} />
      <directionalLight position={[6, 12, 4]} intensity={1.3} />
      {/* Socle de la planète sous les cases */}
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[map.width + 0.4, 0.5, map.height + 0.4]} />
        <meshStandardMaterial color="#7a5f45" flatShading />
      </mesh>
      <Tiles />
      <MapControls
        makeDefault
        enableDamping
        dampingFactor={0.15}
        minZoom={ZOOM_MIN}
        maxZoom={ZOOM_MAX}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.6}
        zoomToCursor
      />
      <CameraRig width={map.width} height={map.height} />
    </Canvas>
  );
}
