import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_AVATAR_CONFIG, RANK_AURA, type AvatarConfig } from '../lib/avatarConfig';

/**
 * HunterAvatar3D — modular, data-driven 3D hunter avatar renderer.
 *
 * Implements the 3D report's core items on the existing
 * three/@react-three/fiber/@react-three/drei stack (no new 3D deps):
 *   #1/#5  R3F + drei on the existing React/Vite/TS stack
 *   #9/#18 Data-driven avatar "slots" (body/skin/armor/hair/sigil/aura) as JSON
 *   #37    Rank-tier aura/glow that intensifies E -> S
 *   #48    Subtle idle breathing animation
 *   #56/#59/#85  Stylized low-poly, flat-shaded — cheap to render and visually
 *                distinct from Solo Leveling photorealism (IP-risk aware)
 *   #75    Silhouette-readable at thumbnail sizes
 *   #92    frameloop="demand" under reduced motion (render-on-demand)
 *   #109   Cheap contact "blob" shadows instead of shadow maps
 *   #257   Honors prefers-reduced-motion
 *
 * Config types/defaults live in ../lib/avatarConfig so UI code can import them
 * without pulling three.js into its chunk (#95 lazy-loading).
 */

const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
};

const FlatMaterial: React.FC<{ color: string; roughness?: number; metalness?: number }> = ({
  color,
  roughness = 0.75,
  metalness = 0.15,
}) => <meshStandardMaterial color={color} flatShading roughness={roughness} metalness={metalness} />;

const HunterFigure: React.FC<{ config: AvatarConfig; animate: boolean; rotate: boolean }> = ({
  config,
  animate,
  rotate,
}) => {
  const group = useRef<THREE.Group>(null);
  const aura = RANK_AURA[config.rank] ?? RANK_AURA.E;
  const scale = config.bodyType === 'slim' ? 0.92 : config.bodyType === 'broad' ? 1.1 : 1;

  // Subtle breathing idle (#48), disabled under reduced motion (#257)
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (animate) {
      group.current.scale.y = scale * (1 + Math.sin(t * 1.6) * 0.012);
      group.current.position.y = -0.4 + Math.sin(t * 1.6) * 0.02;
    }
    if (rotate) {
      // Gentle turntable for showcase contexts (landing hero)
      group.current.rotation.y = t * 0.35;
    }
  });

  return (
    <group ref={group} position={[0, -0.4, 0]} scale={scale}>
      {/* Torso */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 1.05, 7]} />
        <FlatMaterial color={config.armorColor} />
      </mesh>
      {/* Chest accent plate */}
      <mesh position={[0, 0.45, 0.36]}>
        <boxGeometry args={[0.34, 0.4, 0.1]} />
        <FlatMaterial color={config.accentColor} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Shoulders */}
      {[-1, 1].map((side) => (
        <mesh key={`sh-${side}`} position={[side * 0.58, 0.62, 0]}>
          <sphereGeometry args={[0.2, 7, 6]} />
          <FlatMaterial color={config.armorColor} />
        </mesh>
      ))}
      {/* Arms */}
      {[-1, 1].map((side) => (
        <mesh key={`arm-${side}`} position={[side * 0.62, -0.05, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.85, 6]} />
          <FlatMaterial color={config.skinTone} roughness={0.8} metalness={0} />
        </mesh>
      ))}
      {/* Head */}
      <mesh position={[0, 1.08, 0]}>
        <icosahedronGeometry args={[0.32, 1]} />
        <FlatMaterial color={config.skinTone} roughness={0.8} metalness={0} />
      </mesh>
      {/* Hair variants (slot-based #18) */}
      {(config.hairStyle === 'short' || config.hairStyle === 'topknot') && (
        <mesh position={[0, 1.22, -0.02]} scale={[1.02, 0.7, 1.02]}>
          <sphereGeometry args={[0.33, 7, 6]} />
          <FlatMaterial color={config.hairColor} roughness={0.9} metalness={0} />
        </mesh>
      )}
      {config.hairStyle === 'topknot' && (
        <mesh position={[0, 1.52, 0]}>
          <sphereGeometry args={[0.13, 6, 5]} />
          <FlatMaterial color={config.hairColor} roughness={0.9} metalness={0} />
        </mesh>
      )}
      {config.hairStyle === 'swept' && (
        <mesh position={[0, 1.18, -0.06]} rotation={[0.35, 0, 0]} scale={[1.04, 0.62, 1.1]}>
          <sphereGeometry args={[0.33, 7, 6]} />
          <FlatMaterial color={config.hairColor} roughness={0.9} metalness={0} />
        </mesh>
      )}
      {config.hairStyle === 'hood' && (
        <mesh position={[0, 1.14, -0.02]} scale={[1.12, 0.95, 1.12]}>
          <sphereGeometry args={[0.36, 7, 6]} />
          <FlatMaterial color={config.accentColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {/* Legs */}
      {[-1, 1].map((side) => (
        <mesh key={`leg-${side}`} position={[side * 0.2, -0.75, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.85, 6]} />
          <FlatMaterial color={config.armorColor} />
        </mesh>
      ))}
      {/* Class sigil (#29/#39): small held prop per hunter class */}
      {config.classSigil === 'sword' && (
        <mesh position={[0.68, -0.1, 0.18]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.07, 0.95, 0.07]} />
          <meshStandardMaterial color="#c0c7d1" flatShading metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      {config.classSigil === 'dagger' && (
        <mesh position={[0.68, -0.05, 0.18]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.05, 0.5, 0.05]} />
          <meshStandardMaterial color="#c0c7d1" flatShading metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      {config.classSigil === 'tome' && (
        <mesh position={[0.68, 0.02, 0.18]}>
          <boxGeometry args={[0.28, 0.36, 0.1]} />
          <FlatMaterial color={config.accentColor} roughness={0.6} metalness={0} />
        </mesh>
      )}
      {config.classSigil === 'bow' && (
        <mesh position={[0.68, 0, 0.18]} rotation={[0, Math.PI / 2, 0.2]}>
          <torusGeometry args={[0.32, 0.03, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#8a5a2b" flatShading roughness={0.8} metalness={0} />
        </mesh>
      )}
      {config.classSigil === 'orb' && (
        <Float speed={2} floatIntensity={0.6} rotationIntensity={0.6}>
          <mesh position={[0.68, 0.1, 0.18]}>
            <icosahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial
              color={config.accentColor}
              emissive={config.accentColor}
              emissiveIntensity={0.7}
              flatShading
            />
          </mesh>
        </Float>
      )}
      {/* Rank aura (#37): light + translucent shell, intensifies with rank */}
      {aura.intensity > 0 && (
        <pointLight position={[0, 0.4, 0]} intensity={aura.intensity * 1.2} color={aura.color} distance={3.2} />
      )}
      {aura.intensity >= 0.5 && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[1.15, 12, 10]} />
          <meshBasicMaterial
            color={aura.color}
            transparent
            opacity={0.06 + aura.intensity * 0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
};

export const HunterAvatar3D: React.FC<{
  config?: Partial<AvatarConfig>;
  height?: number;
  className?: string;
  /** Gentle turntable rotation for showcase contexts (disabled by reduced motion). */
  rotate?: boolean;
}> = ({ config = {}, height = 320, className = '', rotate = false }) => {
  const merged = useMemo<AvatarConfig>(() => ({ ...DEFAULT_AVATAR_CONFIG, ...config }), [config]);
  const reducedMotion = useReducedMotion();

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <Canvas
        frameloop={reducedMotion ? 'demand' : 'always'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 1.35, 4.6], fov: 38 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <pointLight position={[-3, 2, 2]} intensity={0.5} color={merged.accentColor} />
        <Suspense fallback={null}>
          <HunterFigure config={merged} animate={!reducedMotion} rotate={rotate && !reducedMotion} />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={6} blur={2.4} far={2} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HunterAvatar3D;
