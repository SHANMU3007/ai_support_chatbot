"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface AntigravityProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: 'sphere' | 'box' | 'capsule' | 'tetrahedron';
  fieldStrength?: number;
  opacity?: number;
  className?: string;
}

const AntigravityInner: React.FC<AntigravityProps> = ({
  count = 280,
  magnetRadius = 14,
  ringRadius = 6,
  waveSpeed = 0.6,
  waveAmplitude = 0.8,
  particleSize = 0.6,
  lerpSpeed = 0.18,
  color = '#6366f1',
  autoAnimate = true,
  particleVariance = 0.8,
  rotationSpeed = 0.2,
  depthFactor = 0.6,
  pulseSpeed = 3,
  particleShape = 'sphere',
  fieldStrength = 10,
  opacity = 0.75
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 80;
    const height = viewport.height || 60;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.015 + Math.random() * 0.02;

      // Keep particles uniformly distributed across the screen without extreme close-up z-depth
      const x = (Math.random() - 0.5) * (width * 1.1);
      const y = (Math.random() - 0.5) * (height * 1.1);
      const z = (Math.random() - 0.5) * 6; // Shallow z-range keeps particle size uniform & tiny

      const randomRadiusOffset = (Math.random() - 0.5) * 1.5;

      temp.push({
        t,
        speed,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        randomRadiusOffset,
        depth: 0.5 + Math.random() * 0.5
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { viewport: v, pointer: m } = state;

    const mouseDist = Math.abs(m.x - lastMousePos.current.x) + Math.abs(m.y - lastMousePos.current.y);
    if (mouseDist > 0.0005) {
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = { x: m.x, y: m.y };
    }

    let destX = (m.x * v.width) / 2;
    let destY = (m.y * v.height) / 2;

    if (autoAnimate && Date.now() - lastMouseMoveTime.current > 1200) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.6) * (v.width / 4);
      destY = Math.cos(time * 0.6 * 1.5) * (v.height / 4);
    }

    const smoothFactor = Math.min(1, delta * 8);
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;
    const time = state.clock.getElapsedTime();
    const globalRotation = time * rotationSpeed;

    const needsRotation = particleShape !== 'sphere';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += p.speed;

      const dx = p.mx - targetX;
      const dy = p.my - targetY;
      const distSq = dx * dx + dy * dy;
      const magnetRadiusSq = magnetRadius * magnetRadius;

      let targetPosX = p.mx;
      let targetPosY = p.my;
      let targetPosZ = p.mz * depthFactor;
      let scaleFactor = 0.85;

      if (distSq < magnetRadiusSq) {
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx) + globalRotation;
        const wave = Math.sin(p.t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const currentRingRadius = ringRadius + wave + p.randomRadiusOffset;

        targetPosX = targetX + currentRingRadius * Math.cos(angle);
        targetPosY = targetY + currentRingRadius * Math.sin(angle);
        targetPosZ = p.mz * depthFactor + Math.sin(p.t) * (0.6 * waveAmplitude);

        const distFromRing = Math.abs(dist - ringRadius);
        scaleFactor = Math.max(0.4, 1.2 - distFromRing / 8);
      }

      p.cx += (targetPosX - p.cx) * lerpSpeed;
      p.cy += (targetPosY - p.cy) * lerpSpeed;
      p.cz += (targetPosZ - p.cz) * lerpSpeed;

      dummy.position.set(p.cx, p.cy, p.cz);

      if (needsRotation) {
        dummy.lookAt(targetX, targetY, p.cz);
        dummy.rotateX(Math.PI / 2);
      }

      const finalScale = scaleFactor * (0.8 + Math.sin(p.t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.02, 0.08, 4, 6]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.025, 8, 8]} />}
      {particleShape === 'box' && <boxGeometry args={[0.04, 0.04, 0.04]} />}
      {particleShape === 'tetrahedron' && <tetrahedronGeometry args={[0.05]} />}
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
};

export const Antigravity: React.FC<AntigravityProps> = props => {
  return (
    <div className={`w-full h-full pointer-events-none ${props.className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 45], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: false, alpha: true }}
      >
        <AntigravityInner {...props} />
      </Canvas>
    </div>
  );
};

export default Antigravity;
