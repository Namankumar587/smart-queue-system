import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCardTexture } from './generateCardTexture';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * DoctorBillboard:
 * 3D Consultation Counter displaying the active room and wait time passed from props.
 * Strictly does NOT compute the wait time.
 */
function DoctorBillboard({ estimatedWaitMinutes, patientsAhead }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e050c';
      ctx.fillRect(0, 0, 512, 200);

      ctx.strokeStyle = '#FF2D55';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 188);

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(40, 45, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('CONSULTATION ROOM 101', 65, 52);

      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillStyle = '#FF2D55';
      ctx.fillText(`WAIT: ~${estimatedWaitMinutes} MINS`, 35, 120);

      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#E2B4BE';
      ctx.fillText(
        patientsAhead === 0
          ? '● NO PATIENTS AHEAD - READY'
          : `● ${patientsAhead} PATIENT(S) IN QUEUE AHEAD`,
        35,
        165
      );
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [estimatedWaitMinutes, patientsAhead]);

  // Dispose texture on unmount or updates
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <group position={[0, 0.7, -8.5]}>
      {/* Desk Base */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[4.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#260610" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Glowing Signboard */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.2, 1.2, 0.08]} />
        <meshStandardMaterial map={texture} roughness={0.2} metalness={0.2} />
      </mesh>

      {/* Room light */}
      <pointLight position={[0, 1.2, 0.5]} intensity={2.0} color="#FF2D55" distance={7} />
    </group>
  );
}

/**
 * QueueCard3D:
 * Individual token card with texture lifecycle disposal.
 */
function QueueCard3D({ card }) {
  const texture = useMemo(() => {
    return generateCardTexture({
      code: card.code,
      badgeText: card.badgeText,
      badgeBg: card.badgeBg,
      badgeTextColor: card.badgeTextColor,
      subtext: card.subtext,
      borderColor: card.borderColor,
      glowColor: card.glowColor,
      bgStart: card.bgStart,
      bgEnd: card.bgEnd,
      isYou: card.isYou
    });
  }, [card]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <mesh position={card.position}>
      <boxGeometry args={[1.5, 0.88, 0.04]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={card.isYou ? 0.98 : 0.76}
        roughness={0.15}
        metalness={0.35}
      />
    </mesh>
  );
}

/**
 * DynamicQueueCards:
 * Renders exactly `patientsAhead` visual token cards receding in 3D perspective,
 * plus the cosmic crimson "YOU" card at the front.
 */
function DynamicQueueCards({ patientsAhead }) {
  // Clamp visual cards in 3D to max 8 to prevent visual crowding
  const cardCount = Math.min(patientsAhead, 8);

  const cardsData = useMemo(() => {
    const list = [];

    // Add intermediate patients ahead
    for (let i = 0; i < cardCount; i++) {
      const zPos = -1.5 - i * 0.9;
      const xOffset = Math.sin(i * 0.8) * 0.25;
      list.push({
        id: `card-ahead-${i}`,
        code: `T-00${i + 2}`,
        position: [xOffset, 0.15, zPos],
        isYou: false,
        badgeText: `AHEAD #${i + 1}`,
        badgeBg: 'rgba(255, 60, 95, 0.15)',
        badgeTextColor: '#E2B4BE',
        subtext: 'In Queue',
        borderColor: 'rgba(255, 60, 95, 0.25)',
        glowColor: '#FF6B8B',
        bgStart: '#20050e',
        bgEnd: '#0f0206'
      });
    }

    // Add the YOU card
    list.push({
      id: 'card-you',
      code: `T-00${patientsAhead + 1}`,
      position: [0, 0.35, -0.4],
      isYou: true,
      badgeText: 'YOU',
      badgeBg: '#FF2D55',
      badgeTextColor: '#ffffff',
      subtext: `Position #${patientsAhead + 1}`,
      borderColor: '#FF2D55',
      glowColor: '#FF6B8B',
      bgStart: '#3a0817',
      bgEnd: '#150308'
    });

    return list;
  }, [cardCount, patientsAhead]);

  return (
    <group>
      {cardsData.map((card) => (
        <QueueCard3D key={card.id} card={card} />
      ))}
    </group>
  );
}

/**
 * SceneParallaxRig:
 * Subtle mouse parallax for Scene C.
 */
function SceneParallaxRig() {
  const pointerRef = useRef({ x: 0, y: 0 });

  return useFrame((state, delta) => {
    const { pointer, camera } = state;
    pointerRef.current.x = THREE.MathUtils.damp(pointerRef.current.x, pointer.x, 3, delta);
    pointerRef.current.y = THREE.MathUtils.damp(pointerRef.current.y, pointer.y, 3, delta);

    camera.position.x = pointerRef.current.x * 0.45;
    camera.position.y = 1.3 - pointerRef.current.y * 0.25;
    camera.lookAt(0, 0.4, -4.5);
  });
}

/**
 * WaitTime3DCanvas:
 * 3D scene visualising the wait time parameters.
 * IMPORTANT: Strictly does NOT calculate or own the wait estimation result.
 */
export default function WaitTime3DCanvas({ patientsAhead = 4, estimatedWaitMinutes = 32 }) {
  const containerRef = useRef(null);
  const isCanvasActive = useCanvasVisibility(containerRef);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '380px',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(28, 5, 14, 0.9) 0%, rgba(10, 1, 5, 0.98) 100%)',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 60, 95, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 45, 85, 0.12)'
      }}
    >
      {/* 3D Scene Badge */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          zIndex: 10,
          background: 'rgba(28, 5, 14, 0.85)',
          border: '1px solid rgba(255, 70, 100, 0.35)',
          borderRadius: '9999px',
          padding: '0.35rem 0.85rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#FF6B8B',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 15px rgba(255, 45, 85, 0.15)'
        }}
      >
        <span
          className="beacon-pulse"
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#FF2D55',
            display: 'inline-block'
          }}
        />
        <span>3D Queue Depth Visualizer</span>
      </div>

      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.4, 2.5], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#080004']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} color="#fff0f3" />

        {/* Floor grid */}
        <gridHelper args={[20, 20, '#4a0d1d', '#180309']} position={[0, -0.45, -4]} />

        {/* Doctor counter at vanishing point */}
        <DoctorBillboard
          estimatedWaitMinutes={estimatedWaitMinutes}
          patientsAhead={patientsAhead}
        />

        {/* Dynamic visual cards matching props */}
        <DynamicQueueCards patientsAhead={patientsAhead} />

        {/* Subtle camera parallax */}
        <SceneParallaxRig />
      </Canvas>
    </div>
  );
}
