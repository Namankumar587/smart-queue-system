import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCardTexture } from './generateCardTexture';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * DoctorStation3D:
 * Sleek, minimalist 3D consultation podium at the destination of the queue.
 * Displays Room 101 and the estimated wait time passed strictly from props.
 */
function DoctorStation3D({ estimatedWaitMinutes, patientsAhead }) {
  const billboardTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark glass container
      const grad = ctx.createLinearGradient(0, 0, 512, 200);
      grad.addColorStop(0, '#22040e');
      grad.addColorStop(1, '#0c0105');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 200);

      // Glowing crimson border
      ctx.strokeStyle = '#FF2D55';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 188);

      // Status pill
      ctx.fillStyle = patientsAhead === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 45, 85, 0.2)';
      ctx.beginPath();
      ctx.roundRect(24, 18, 230, 34, 17);
      ctx.fill();
      ctx.strokeStyle = patientsAhead === 0 ? '#10B981' : '#FF2D55';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing status dot
      ctx.fillStyle = patientsAhead === 0 ? '#10B981' : '#FF2D55';
      ctx.beginPath();
      ctx.arc(40, 35, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        patientsAhead === 0 ? 'DOCTOR READY' : 'ACTIVE CONSULTATION',
        56,
        40
      );

      // Room Title
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('CONSULTATION ROOM 101', 24, 88);

      // Estimated Wait Display
      ctx.font = '900 38px system-ui, sans-serif';
      ctx.fillStyle = '#FF2D55';
      ctx.fillText(`WAIT: ~${estimatedWaitMinutes} MINS`, 24, 140);

      // Queue status line
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillStyle = '#E2B4BE';
      ctx.fillText(
        patientsAhead === 0
          ? '● NO PATIENTS AHEAD - READY'
          : `● ${patientsAhead} PATIENT(S) IN QUEUE AHEAD`,
        24,
        175
      );
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [estimatedWaitMinutes, patientsAhead]);

  useEffect(() => {
    return () => {
      billboardTexture.dispose();
    };
  }, [billboardTexture]);

  return (
    <group position={[-0.4, 0.4, -6.0]}>
      {/* Sleek Dark Pedestal Desk */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[3.2, 0.8, 0.7]} />
        <meshStandardMaterial
          color="#160208"
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Glowing Neon LED Top Rim */}
      <mesh position={[0, 0.11, 0.36]}>
        <boxGeometry args={[3.22, 0.04, 0.04]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Floating Holographic Signboard */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[2.8, 1.25, 0.06]} />
        <meshStandardMaterial
          map={billboardTexture}
          roughness={0.15}
          metalness={0.2}
          emissive="#ffffff"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Ambient Room Light */}
      <pointLight position={[0, 1.2, 0.6]} intensity={2.2} color="#FF2D55" distance={7} />
    </group>
  );
}

/**
 * QueueCard3D:
 * Genuine 3D floating token card with realistic elevation, smooth hover bobbing,
 * glossy face, and a dynamic floor contact shadow.
 */
function QueueCard3D({ card, index }) {
  const groupRef = useRef();
  const shadowRef = useRef();

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

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const hover = Math.sin(t * 2.2 + index * 0.8) * 0.045;

    // Smooth hover bobbing on Y axis
    if (groupRef.current) {
      groupRef.current.position.y = card.position[1] + hover;
      groupRef.current.rotation.y = card.rotation[1] + Math.sin(t * 1.5 + index * 0.5) * 0.03;
      groupRef.current.rotation.x = card.rotation[0] + Math.sin(t * 1.8 + index * 0.6) * 0.015;
    }

    // Dynamic contact shadow scales and dims as card hovers
    if (shadowRef.current) {
      const scaleFactor = 1 - hover * 2.5;
      shadowRef.current.scale.set(scaleFactor, scaleFactor, 1);
      if (shadowRef.current.material) {
        shadowRef.current.material.opacity = card.isYou ? 0.75 - hover * 2 : 0.4 - hover * 1.5;
      }
    }
  });

  return (
    <group>
      {/* 3D Floating Token Card Mesh */}
      <group
        ref={groupRef}
        position={card.position}
        rotation={card.rotation}
      >
        {/* Front & Back Card Slab */}
        <mesh>
          <boxGeometry args={[1.5, 0.9, 0.05]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.12}
            metalness={0.35}
            emissive={card.isYou ? '#FF2D55' : '#55081c'}
            emissiveIntensity={card.isYou ? 0.18 : 0.04}
          />
        </mesh>

        {/* 3D Chamfered Glowing Edge Trim */}
        <mesh position={[0, 0, -0.005]}>
          <boxGeometry args={[1.53, 0.93, 0.04]} />
          <meshBasicMaterial color={card.isYou ? '#FF2D55' : '#881337'} />
        </mesh>
      </group>

      {/* Realistic Soft Contact Shadow on Floor */}
      <mesh
        ref={shadowRef}
        position={[card.position[0], -0.38, card.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial
          color={card.isYou ? '#FF2D55' : '#000000'}
          transparent
          opacity={card.isYou ? 0.65 : 0.45}
        />
      </mesh>
    </group>
  );
}

/**
 * DynamicQueueCards:
 * Arranges the receding queue tokens cleanly in 3D perspective without overlap.
 */
function DynamicQueueCards({ patientsAhead }) {
  const cardCount = Math.min(patientsAhead, 6);

  const cardsData = useMemo(() => {
    const list = [];

    // Receding queue of patients ahead (from doctor station to near foreground)
    for (let i = 0; i < cardCount; i++) {
      const progress = (i + 1) / (cardCount + 1);
      const zPos = -4.8 + progress * 4.2;
      // Stagger slightly left/right so every card is clearly visible
      const xOffset = (i % 2 === 0 ? -0.55 : 0.35);
      const yPos = 0.28 + progress * 0.05;
      const yRot = (i % 2 === 0 ? 0.16 : -0.14);

      list.push({
        id: `card-ahead-${i}`,
        code: `T-00${i + 1}`,
        position: [xOffset, yPos, zPos],
        rotation: [0.06, yRot, 0],
        isYou: false,
        badgeText: `AHEAD #${i + 1}`,
        badgeBg: 'rgba(255, 60, 95, 0.18)',
        badgeTextColor: '#FF94AB',
        subtext: i === 0 ? 'Next in Line' : 'Waiting in Queue',
        borderColor: 'rgba(255, 75, 110, 0.45)',
        glowColor: '#FF6B8B',
        bgStart: '#250612',
        bgEnd: '#0f0207'
      });
    }

    // Prominent "YOU" card anchored at the queue entrance with vibrant ruby accents
    const youZ = cardCount === 0 ? -3.5 : 0.5;
    const youX = cardCount === 0 ? -0.4 : 0.15;

    list.push({
      id: 'card-you',
      code: `T-00${patientsAhead + 1}`,
      position: [youX, 0.38, youZ],
      rotation: [0.08, -0.06, 0],
      isYou: true,
      badgeText: 'YOU • IN QUEUE',
      badgeBg: '#FF2D55',
      badgeTextColor: '#ffffff',
      subtext: `Position #${patientsAhead + 1}`,
      borderColor: '#FF2D55',
      glowColor: '#FFFFFF',
      bgStart: '#4a081d',
      bgEnd: '#1a030a'
    });

    return list;
  }, [cardCount, patientsAhead]);

  return (
    <group>
      {cardsData.map((card, idx) => (
        <QueueCard3D key={card.id} card={card} index={idx} />
      ))}
    </group>
  );
}

/**
 * SubtleParticles:
 * Floating micro-embers in 3D volume that enhance true spatial depth.
 */
function SubtleParticles() {
  const count = 70;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 4 - 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    }
    return pos;
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.05,
        color: '#FF6B8B',
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
    []
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.012;
    }
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

/**
 * CameraRig:
 * Elevated 3/4 isometric vantage point with smooth mouse parallax and drag orbit.
 */
function CameraRig({ dragOffset }) {
  const { camera } = useThree();
  const pointerRef = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const { pointer } = state;
    pointerRef.current.x = THREE.MathUtils.damp(pointerRef.current.x, pointer.x, 3.5, delta);
    pointerRef.current.y = THREE.MathUtils.damp(pointerRef.current.y, pointer.y, 3.5, delta);

    // Elevated 3/4 perspective angle
    const targetX = 1.6 + pointerRef.current.x * 0.7 + dragOffset.x;
    const targetY = 1.7 - pointerRef.current.y * 0.3 + dragOffset.y;
    const targetZ = 3.2;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4.0, delta);

    camera.lookAt(-0.2, 0.45, -2.4);
  });

  return null;
}

/**
 * WaitTime3DCanvas:
 * Clean, simple, and distinctly 3D queue depth visualizer.
 * IMPORTANT: Strictly does NOT calculate or own the wait estimation result.
 */
export default function WaitTime3DCanvas({ patientsAhead = 4, estimatedWaitMinutes = 32 }) {
  const containerRef = useRef(null);
  const isCanvasActive = useCanvasVisibility(containerRef);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = (e.clientX - lastMousePos.current.x) * 0.005;
    const dy = (e.clientY - lastMousePos.current.y) * 0.005;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setDragOffset((prev) => ({
      x: Math.max(-1.2, Math.min(1.2, prev.x - dx)),
      y: Math.max(-0.5, Math.min(0.6, prev.y + dy))
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '400px',
        position: 'relative',
        background: '#010003',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 60, 95, 0.22)',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 35px rgba(255, 45, 85, 0.12)',
        cursor: 'grab'
      }}
    >
      {/* 3D Scene Badge */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '18px',
          zIndex: 10,
          background: 'rgba(24, 4, 11, 0.88)',
          border: '1px solid rgba(255, 70, 100, 0.4)',
          borderRadius: '9999px',
          padding: '0.36rem 0.9rem',
          fontSize: '0.76rem',
          fontWeight: 700,
          color: '#FF6B8B',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 18px rgba(255, 45, 85, 0.2)'
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
        <span>3D Queue Visualizer</span>
      </div>

      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [1.6, 1.7, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#010003']} />
        <fog attach="fog" args={['#010003', 5, 18]} />

        {/* Ambient & Key Lights for Crisp 3D Specular Highlights */}
        <ambientLight intensity={0.35} color="#150208" />
        <directionalLight position={[4, 8, 4]} intensity={1.5} color="#fff5f7" />
        <pointLight position={[-2, 3, 1]} intensity={2.0} color="#FF2D55" distance={10} />
        <pointLight position={[2, 2, -3]} intensity={1.5} color="#A855F7" distance={8} />

        {/* Subtle Dark Reflective Floor with Minimal Grid */}
        <mesh position={[0, -0.4, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial
            color="#050104"
            roughness={0.15}
            metalness={0.7}
          />
        </mesh>
        <gridHelper
          args={[20, 20, '#3a0715', '#100105']}
          position={[0, -0.39, -2.5]}
        />

        {/* Minimalist 3D Consultation Station at destination */}
        <DoctorStation3D
          estimatedWaitMinutes={estimatedWaitMinutes}
          patientsAhead={patientsAhead}
        />

        {/* Clean 3D Floating Token Cards with Dynamic Contact Shadows */}
        <DynamicQueueCards patientsAhead={patientsAhead} />

        {/* Floating Ambient Embers */}
        <SubtleParticles />

        {/* Smooth 3D Perspective Tilt Rig */}
        <CameraRig dragOffset={dragOffset} />
      </Canvas>
    </div>
  );
}
