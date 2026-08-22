"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
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
  count = 260,
  magnetRadius = 10,
  ringRadius = 4.5,
  waveSpeed = 0.8,
  waveAmplitude = 0.8,
  particleSize = 0.5,
  lerpSpeed = 0.18,
  color = '#6366f1',
  autoAnimate = true,
  particleVariance = 0.4,
  rotationSpeed = 0.2,
  depthFactor = 0.3,
  pulseSpeed = 2.5,
  particleShape = 'sphere',
  fieldStrength = 10,
  opacity = 0.85
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const mouseRef = useRef({ x: 0, y: 0, hasMoved: false });
  const lastMoveTimeRef = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.hasMoved = true;
      lastMoveTimeRef.current = performance.now();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 50;
    const height = viewport.height || 38;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.012 + Math.random() * 0.016;

      const x = (Math.random() - 0.5) * (width * 1.2);
      const y = (Math.random() - 0.5) * (height * 1.2);
      const z = (Math.random() - 0.5) * 2;

      const randomRadiusOffset = (Math.random() - 0.5) * 1.2;

      temp.push({
        t,
        speed,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        randomRadiusOffset
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { viewport: v } = state;

    let destX = (mouseRef.current.x * v.width) / 2;
    let destY = (mouseRef.current.y * v.height) / 2;

    const isIdle = !mouseRef.current.hasMoved || performance.now() - lastMoveTimeRef.current > 1500;
    if (autoAnimate && isIdle) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 1.4) * (v.height / 4);
    }

    const smoothFactor = Math.min(1, delta * 9);
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;
    const time = state.clock.getElapsedTime();
    const globalRotation = time * rotationSpeed;
    const magnetRadiusSq = magnetRadius * magnetRadius;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += p.speed;

      const dx = p.mx - targetX;
      const dy = p.my - targetY;
      const distSq = dx * dx + dy * dy;

      let targetPosX = p.mx;
      let targetPosY = p.my;
      let targetPosZ = p.mz * depthFactor;
      let scaleMultiplier = 1;

      if (distSq < magnetRadiusSq) {
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx) + globalRotation;
        const wave = Math.sin(p.t * waveSpeed + angle) * (0.4 * waveAmplitude);
        const currentRingRadius = ringRadius + wave + p.randomRadiusOffset;

        targetPosX = targetX + currentRingRadius * Math.cos(angle);
        targetPosY = targetY + currentRingRadius * Math.sin(angle);
        targetPosZ = p.mz * depthFactor + Math.sin(p.t) * (0.3 * waveAmplitude);

        const distFromRing = Math.abs(dist - ringRadius);
        scaleMultiplier = Math.max(0.75, 1.2 - distFromRing / 6);
      }

      p.cx += (targetPosX - p.cx) * lerpSpeed;
      p.cy += (targetPosY - p.cy) * lerpSpeed;
      p.cz += (targetPosZ - p.cz) * lerpSpeed;

      dummy.position.set(p.cx, p.cy, p.cz);

      const pulse = 1 + Math.sin(p.t * pulseSpeed) * 0.1 * particleVariance;
      const finalScale = scaleMultiplier * pulse * particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.02, 0.08, 4, 6]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.032, 8, 8]} />}
      {particleShape === 'box' && <boxGeometry args={[0.04, 0.04, 0.04]} />}
      {particleShape === 'tetrahedron' && <tetrahedronGeometry args={[0.05]} />}
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </instancedMesh>
  );
};

export const Antigravity: React.FC<AntigravityProps> = props => {
  return (
    <div className={`w-full h-full pointer-events-none ${props.className || ''}`}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: false, alpha: true }}
      >
        <AntigravityInner {...props} />
      </Canvas>
    </div>
  );
};

export default Antigravity;
