/**
 * Modèles low-poly construits avec des formes Three.js simples (aucun fichier externe, aucune licence à gérer).
 * Toutes les positions sont relatives au dessus de la case.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hash } from './hash';

const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, ...extra });

/** Matériaux partagés : un seul objet par couleur, quel que soit le nombre de bâtiments. */
const MAT = {
  dcBody: flat('#4a5661'),
  dcRoof: flat('#6b7782'),
  fan: flat('#2f363d'),
  tower: flat('#ece7dd', { side: THREE.DoubleSide }),
  towerBand: flat('#c9542a'),
  dome: flat('#d9d4ca'),
  trunk: flat('#7a5a3a'),
  leaves: flat('#3f7d3a'),
  leaves2: flat('#55934a'),
  rock: flat('#8a8178'),
  rockDark: flat('#766d64'),
  snow: flat('#f4f4f0'),
  house: flat('#d8cbb5'),
  houseDark: flat('#bfb19a'),
  roof: flat('#a8573a'),
  steam: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }),
  scaffold: new THREE.MeshBasicMaterial({ color: '#f2c14e', wireframe: true }),
  progress: new THREE.MeshBasicMaterial({ color: '#f2c14e' }),
  egg: flat('#f2c14e', { emissive: '#f2a20e', emissiveIntensity: 0.6 }),
};

/** Fenêtres/voyants : allumés si le bâtiment reçoit de l'énergie. */
const lightOn = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd56b', emissiveIntensity: 0.9 });
const lightOff = new THREE.MeshStandardMaterial({ color: '#3a3f45' });
const rackOn = new THREE.MeshStandardMaterial({ color: '#6fe0ff', emissive: '#38c6f0', emissiveIntensity: 1 });

/** Profil hyperbolique d'une tour de refroidissement. */
const towerGeometry = new THREE.LatheGeometry(
  [
    [0.3, 0],
    [0.25, 0.25],
    [0.19, 0.52],
    [0.2, 0.7],
    [0.23, 0.82],
  ].map(([r, y]) => new THREE.Vector2(r, y)),
  14,
);

const noRaycast = () => null;

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;


interface BuildingProps {
  /** Matériau qui remplace tout (aperçu de placement) */
  ghost?: THREE.Material;
  /** 0..1 : part de l'énergie reçue */
  power?: number;
  /** En chantier : 0..1 d'avancement, sinon undefined */
  progress?: number;
}

function Scaffold({ progress, height }: { progress: number; height: number }) {
  return (
    <group raycast={noRaycast}>
      <mesh position={[0, height / 2, 0]} material={MAT.scaffold} raycast={noRaycast}>
        <boxGeometry args={[0.86, height, 0.86, 2, 3, 2]} />
      </mesh>
      {/* Barre d'avancement du chantier */}
      <mesh position={[-0.42 + (0.84 * progress) / 2, 0.02, 0.47]} material={MAT.progress} raycast={noRaycast}>
        <boxGeometry args={[0.84 * Math.max(0.02, progress), 0.04, 0.05]} />
      </mesh>
    </group>
  );
}

export function Datacenter({ ghost, power = 1, progress }: BuildingProps) {
  const building = progress !== undefined;
  const m = (mat: THREE.Material) => ghost ?? mat;
  const lit = !building && power > 0.05;
  const scale = building ? 0.3 + 0.7 * progress : 1;

  return (
    <group>
      <group scale={[1, scale, 1]}>
        <mesh position={[0, 0.18, 0]} material={m(MAT.dcBody)} raycast={noRaycast}>
          <boxGeometry args={[0.78, 0.36, 0.7]} />
        </mesh>
        <mesh position={[0, 0.38, 0]} material={m(MAT.dcRoof)} raycast={noRaycast}>
          <boxGeometry args={[0.7, 0.04, 0.62]} />
        </mesh>
        {/* Baies de serveurs visibles en façade */}
        {[-0.24, -0.08, 0.08, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.18, 0.352]} material={m(lit ? rackOn : lightOff)} raycast={noRaycast}>
            <boxGeometry args={[0.1, 0.22, 0.01]} />
          </mesh>
        ))}
        {/* Ventilateurs de refroidissement */}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.43, 0]} material={m(MAT.fan)} raycast={noRaycast}>
            <cylinderGeometry args={[0.11, 0.11, 0.06, 10]} />
          </mesh>
        ))}
      </group>
      {building && !ghost && <Scaffold progress={progress} height={0.5} />}
    </group>
  );
}

function Steam() {
  const puffs = useRef<THREE.Mesh[]>([]);
  useFrame((_, dt) => {
    puffs.current.forEach((p, i) => {
      if (!p) return;
      p.position.y += dt * 0.25;
      const life = (p.position.y - 0.85) / 0.6;
      if (life > 1) p.position.y = 0.85 + (i * 0.2) % 0.6;
      const s = 0.08 + Math.max(0, life) * 0.12;
      p.scale.setScalar(s / 0.1);
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) puffs.current[i] = el;
          }}
          position={[0, 0.85 + i * 0.2, 0]}
          material={MAT.steam}
          raycast={noRaycast}
        >
          <icosahedronGeometry args={[0.1, 0]} />
        </mesh>
      ))}
    </group>
  );
}

export function Reactor({ ghost, progress }: BuildingProps) {
  const building = progress !== undefined;
  const m = (mat: THREE.Material) => ghost ?? mat;
  const scale = building ? 0.25 + 0.75 * progress : 1;

  return (
    <group>
      <group scale={[1, scale, 1]}>
        <mesh position={[-0.1, 0, -0.08]} geometry={towerGeometry} material={m(MAT.tower)} raycast={noRaycast} />
        <mesh position={[-0.1, 0.68, -0.08]} material={m(MAT.towerBand)} raycast={noRaycast}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 14, 1, true]} />
        </mesh>
        <mesh position={[0.24, 0.1, 0.24]} material={m(MAT.dome)} raycast={noRaycast}>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 12]} />
        </mesh>
        <mesh position={[0.24, 0.2, 0.24]} material={m(MAT.dome)} raycast={noRaycast}>
          <sphereGeometry args={[0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      {!building && !ghost && !reducedMotion && (
        <group position={[-0.1, 0, -0.08]}>
          <Steam />
        </group>
      )}
      {building && !ghost && <Scaffold progress={progress} height={0.9} />}
    </group>
  );
}

export function Tree({ x, y }: { x: number; y: number }) {
  const s = 0.7 + hash(x, y, 2) * 0.5;
  const ox = (hash(x, y, 3) - 0.5) * 0.4;
  const oz = (hash(x, y, 4) - 0.5) * 0.4;
  return (
    <group position={[ox, 0, oz]} scale={s}>
      <mesh position={[0, 0.08, 0]} material={MAT.trunk} raycast={noRaycast}>
        <cylinderGeometry args={[0.03, 0.04, 0.16, 5]} />
      </mesh>
      <mesh position={[0, 0.28, 0]} material={hash(x, y, 5) > 0.5 ? MAT.leaves : MAT.leaves2} raycast={noRaycast}>
        <coneGeometry args={[0.15, 0.34, 6]} />
      </mesh>
    </group>
  );
}

export function Mountain({ x, y }: { x: number; y: number }) {
  const h = 0.45 + hash(x, y, 6) * 0.45;
  const snowy = h > 0.7;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={hash(x, y, 7) > 0.5 ? MAT.rock : MAT.rockDark} raycast={noRaycast}>
        <coneGeometry args={[0.44, h, 6]} />
      </mesh>
      {snowy && (
        <mesh position={[0, h - 0.09, 0]} material={MAT.snow} raycast={noRaycast}>
          <coneGeometry args={[0.13, 0.18, 6]} />
        </mesh>
      )}
    </group>
  );
}

/** Pâté de maisons ; les fenêtres s'éteignent quand la ville manque d'électricité. */
export function CityBlock({ x, y, power }: { x: number; y: number; power: number }) {
  const blocks = useMemo(
    () =>
      [
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
      ].map(([ox, oz], i) => ({ ox, oz, h: 0.15 + hash(x, y, 10 + i) * 0.5, dark: hash(x, y, 20 + i) > 0.5, lightRank: hash(x, y, 30 + i) })),
    [x, y],
  );
  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={[b.ox, 0, b.oz]}>
          <mesh position={[0, b.h / 2, 0]} material={b.dark ? MAT.houseDark : MAT.house} raycast={noRaycast}>
            <boxGeometry args={[0.3, b.h, 0.3]} />
          </mesh>
          <mesh position={[0, b.h * 0.6, 0.151]} material={b.lightRank < power ? lightOn : lightOff} raycast={noRaycast}>
            <boxGeometry args={[0.18, Math.min(0.1, b.h * 0.3), 0.005]} />
          </mesh>
          {b.h < 0.3 && (
            <mesh position={[0, b.h + 0.06, 0]} rotation={[0, Math.PI / 4, 0]} material={MAT.roof} raycast={noRaycast}>
              <coneGeometry args={[0.24, 0.12, 4]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Repère doré au-dessus d'un secret déjà trouvé. */
export function EggMarker() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current && !reducedMotion) {
      ref.current.rotation.y = state.clock.elapsedTime;
      ref.current.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0.55, 0]} material={MAT.egg} raycast={noRaycast}>
      <octahedronGeometry args={[0.1, 0]} />
    </mesh>
  );
}
