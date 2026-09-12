import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const CrystalCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -state.clock.elapsedTime * 0.5;
      innerRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5}>
        <mesh ref={meshRef}>
          <octahedronGeometry args={[2.2, 0]} />
          <meshPhysicalMaterial
            color="#7c6ef0"
            emissive="#7c6ef0"
            emissiveIntensity={0.4}
            roughness={0.05}
            metalness={0.9}
            transparent
            opacity={0.25}
            wireframe={false}
          />
        </mesh>
        <mesh ref={meshRef} scale={1.01}>
          <octahedronGeometry args={[2.2, 0]} />
          <meshBasicMaterial color="#a594f5" wireframe transparent opacity={0.6} />
        </mesh>
        <mesh ref={innerRef} scale={0.55}>
          <octahedronGeometry args={[2.2, 0]} />
          <meshPhysicalMaterial
            color="#2dd4bf"
            emissive="#2dd4bf"
            emissiveIntensity={0.8}
            roughness={0.0}
            metalness={1.0}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>
    </>
  );
};

const FloatingRing = ({ radius, color, speed }: { radius: number; color: string; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * speed;
      ref.current.rotation.x = Math.PI / 3 + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.02, 8, 80]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
};

export const ThreeScene: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 9]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={3} color="#2dd4bf" />
        <pointLight position={[-5, -5, 5]} intensity={2} color="#7c6ef0" />
        <pointLight position={[0, 0, -5]} intensity={1} color="#a594f5" />

        <CrystalCore />
        <FloatingRing radius={3.5} color="#7c6ef0" speed={0.3} />
        <FloatingRing radius={4.5} color="#2dd4bf" speed={-0.2} />
        <FloatingRing radius={5.5} color="#a594f5" speed={0.15} />

        <Stars radius={80} depth={50} count={6000} factor={3} saturation={0} fade speed={0.8} />
      </Canvas>
    </div>
  );
};
