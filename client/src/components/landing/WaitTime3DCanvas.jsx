import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCardTexture } from './generateCardTexture';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * ClinicPortal3D:
 * Futuristic 3D consultation room portal with neon pillars, glowing doorway light,
 * and high-resolution holographic heads-up display showing the active doctor station and wait time.
 */
function ClinicPortal3D({ estimatedWaitMinutes, patientsAhead }) {
  const billboardTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark glass container with gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 220);
      grad.addColorStop(0, 'rgba(28, 4, 12, 0.96)');
      grad.addColorStop(1, 'rgba(10, 1, 5, 0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 220);

      // Glowing border
      ctx.strokeStyle = '#FF2D55';
      ctx.lineWidth = 5;
      ctx.strokeRect(6, 6, 500, 208);

      // Status pill badge
      ctx.fillStyle = patientsAhead === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 45, 85, 0.2)';
      ctx.beginPath();
      ctx.roundRect(24, 20, 260, 36, 18);
      ctx.fill();
      ctx.strokeStyle = patientsAhead === 0 ? '#10B981' : '#FF2D55';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing indicator dot
      ctx.fillStyle = patientsAhead === 0 ? '#10B981' : '#FF2D55';
      ctx.beginPath();
      ctx.arc(42, 38, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        patientsAhead === 0 ? 'DOCTOR READY FOR YOU' : 'ACTIVE CONSULTATION',
        58,
        43
      );

      // Room Title
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('CONSULTATION ROOM 101', 24, 92);

      // Estimated Wait Display
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.fillStyle = '#FF2D55';
      ctx.fillText(`WAIT: ~${estimatedWaitMinutes} MINS`, 24, 150);

      // Queue status line
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.fillStyle = '#E2B4BE';
      ctx.fillText(
        patientsAhead === 0
          ? '● NO PATIENTS AHEAD - PROCEED DIRECTLY'
          : `● ${patientsAhead} PATIENT(S) IN QUEUE AHEAD`,
        24,
        188
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

  const portalLightRef = useRef();
  useFrame((state) => {
    if (portalLightRef.current) {
      portalLightRef.current.intensity = 2.4 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group position={[0, 0, -8.2]}>
      {/* Left Glowing Neon Pillar */}
      <mesh position={[-2.3, 1.3, 0]}>
        <boxGeometry args={[0.22, 3.5, 0.22]} />
        <meshStandardMaterial color="#22040d" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[-2.3, 1.3, 0.12]}>
        <boxGeometry args={[0.08, 3.4, 0.05]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Right Glowing Neon Pillar */}
      <mesh position={[2.3, 1.3, 0]}>
        <boxGeometry args={[0.22, 3.5, 0.22]} />
        <meshStandardMaterial color="#22040d" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[2.3, 1.3, 0.12]}>
        <boxGeometry args={[0.08, 3.4, 0.05]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Top Header Lintel Beam */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[4.8, 0.32, 0.35]} />
        <meshStandardMaterial color="#1a0309" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 3.05, 0.18]}>
        <boxGeometry args={[4.7, 0.08, 0.05]} />
        <meshBasicMaterial color="#FF6B8B" />
      </mesh>

      {/* Doorway Holographic Glass Pane */}
      <mesh position={[0, 1.3, -0.05]}>
        <planeGeometry args={[4.4, 3.2]} />
        <meshStandardMaterial
          color="#160209"
          emissive="#3b0515"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.5}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Floating Holographic Signboard */}
      <mesh position={[0, 1.75, 0.3]}>
        <boxGeometry args={[3.6, 1.55, 0.08]} />
        <meshStandardMaterial
          map={billboardTexture}
          roughness={0.15}
          metalness={0.2}
          emissive="#ffffff"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Doorway Floor Threshold Beam */}
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[4.6, 0.08, 0.4]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Volumetric Consultation Glow Lights */}
      <pointLight
        ref={portalLightRef}
        position={[0, 2.2, 0.8]}
        intensity={2.8}
        color="#FF2D55"
        distance={9}
      />
      <pointLight position={[0, 1.0, 0.2]} intensity={1.8} color="#10B981" distance={6} />
    </group>
  );
}

/**
 * QueueRunway3D:
 * The illuminated floor corridor leading directly to the consultation portal,
 * featuring dual neon edge rails and dynamic flowing queue arrows.
 */
function QueueRunway3D() {
  const runwayLength = 9.2;
  const runwayWidth = 3.6;

  const chevronMats = useMemo(() => {
    return [0, 1, 2, 3, 4].map(
      () =>
        new THREE.MeshBasicMaterial({
          color: '#FF2D55',
          transparent: true,
          opacity: 0.6
        })
    );
  }, []);

  useEffect(() => {
    return () => {
      chevronMats.forEach((m) => m.dispose());
    };
  }, [chevronMats]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    chevronMats.forEach((mat, i) => {
      mat.opacity = 0.25 + 0.6 * Math.sin(time * 3 - i * 0.9);
    });
  });

  return (
    <group position={[0, -0.45, -4.0]}>
      {/* Reflective Dark Obsidian Runway Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[runwayWidth, runwayLength]} />
        <meshStandardMaterial
          color="#060105"
          roughness={0.12}
          metalness={0.85}
        />
      </mesh>

      {/* Left Neon Guide Rail */}
      <mesh position={[-runwayWidth / 2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.04, runwayLength]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Right Neon Guide Rail */}
      <mesh position={[runwayWidth / 2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.04, runwayLength]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* Pulsing Directional Floor Chevrons (Point toward Consultation Portal) */}
      {[0, 1, 2, 3, 4].map((idx) => (
        <mesh
          key={idx}
          position={[0, 0.02, 3.6 - idx * 1.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={chevronMats[idx]}
        >
          <planeGeometry args={[0.6, 0.28]} />
        </mesh>
      ))}

      {/* Surrounding Ambient Grid Floor */}
      <gridHelper
        args={[28, 28, '#4a0818', '#140207']}
        position={[0, -0.01, 0]}
      />
    </group>
  );
}

/**
 * QueueCard3D:
 * Individual floating 3D glassmorphic card with smooth levitation,
 * 3D bevel edge, and matching illuminated floor pedestal ring.
 */
function QueueCard3D({ card, index }) {
  const meshRef = useRef();
  const ringRef = useRef();

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
    if (meshRef.current) {
      // Gentle floating levitation animation
      const hoverOffset = Math.sin(t * 2.2 + index * 0.75) * 0.04;
      meshRef.current.position.y = card.position[1] + hoverOffset;

      // Subtle 3D breathing rotation for tactile spatial depth
      meshRef.current.rotation.y = card.rotation[1] + Math.sin(t * 1.4 + index * 0.6) * 0.03;
      meshRef.current.rotation.x = card.rotation[0] + Math.sin(t * 1.8 + index * 0.5) * 0.015;
    }

    if (ringRef.current && card.isYou) {
      ringRef.current.material.opacity = 0.65 + Math.sin(t * 4) * 0.3;
    }
  });

  return (
    <group>
      {/* 3D Floating Token Card */}
      <mesh
        ref={meshRef}
        position={card.position}
        rotation={card.rotation}
      >
        <boxGeometry args={[1.52, 0.89, 0.05]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={card.isYou ? 0.98 : 0.88}
          roughness={0.12}
          metalness={0.35}
          emissive={card.isYou ? '#FF2D55' : '#881337'}
          emissiveIntensity={card.isYou ? 0.15 : 0.05}
        />
      </mesh>

      {/* Laser Pedestal Ring Projected on Runway Floor */}
      <mesh
        ref={ringRef}
        position={[card.position[0], -0.43, card.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.38, 0.46, 32]} />
        <meshBasicMaterial
          color={card.isYou ? '#FF2D55' : '#FF6B8B'}
          transparent
          opacity={card.isYou ? 0.75 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * DynamicQueueCards:
 * Arranges the receding queue in a dynamic staggered 3D curved corridor.
 * Guarantees every single card is distinct and unobstructed in perspective.
 */
function DynamicQueueCards({ patientsAhead }) {
  const cardCount = Math.min(patientsAhead, 8);

  const cardsData = useMemo(() => {
    const list = [];

    // If patients are ahead, render each ahead token in queue
    for (let i = 0; i < cardCount; i++) {
      // Progress along the queue track: 0 is closest to door, 1 is closest to user
      const progress = (i + 1) / (cardCount + 1);
      const zPos = -6.2 + progress * 5.2;
      // Stagger X left and right so each card is completely visible without overlap
      const xOffset = (i % 2 === 0 ? -0.58 : 0.52);
      const yPos = 0.36 + progress * 0.08;
      const yRot = (i % 2 === 0 ? 0.18 : -0.16);

      list.push({
        id: `card-ahead-${i}`,
        code: `T-00${i + 1}`,
        position: [xOffset, yPos, zPos],
        rotation: [0.05, yRot, 0],
        isYou: false,
        badgeText: `PATIENT #${i + 1}`,
        badgeBg: 'rgba(255, 60, 95, 0.18)',
        badgeTextColor: '#FF94AB',
        subtext: i === 0 ? 'Now Approaching Desk' : 'Waiting in Queue',
        borderColor: 'rgba(255, 75, 110, 0.45)',
        glowColor: '#FF6B8B',
        bgStart: '#250612',
        bgEnd: '#0f0207'
      });
    }

    // Prominent "YOU" card anchored at the queue entrance with vibrant ruby accents
    const youZ = cardCount === 0 ? -4.5 : 0.4;
    const youX = cardCount === 0 ? 0 : 0.08;

    list.push({
      id: 'card-you',
      code: `T-00${patientsAhead + 1}`,
      position: [youX, 0.45, youZ],
      rotation: [0.06, -0.04, 0],
      isYou: true,
      badgeText: 'YOU • NEXT IN LINE',
      badgeBg: '#FF2D55',
      badgeTextColor: '#ffffff',
      subtext: `Queue Position #${patientsAhead + 1}`,
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
 * CosmicFloatingEmbers:
 * Floating micro-particles that catch the neon point lights,
 * enhancing true 3D spatial volumetric depth.
 */
function CosmicFloatingEmbers() {
  const count = 90;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 5 - 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
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
        size: 0.055,
        color: '#FF6B8B',
        transparent: true,
        opacity: 0.4,
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
      ref.current.rotation.y = state.clock.elapsedTime * 0.015;
    }
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

/**
 * SceneCameraRig:
 * Cinematic 3/4 isometric vantage point with buttery smooth mouse parallax
 * and drag-to-inspect rotation.
 */
function SceneCameraRig({ dragOffset }) {
  const { camera } = useThree();
  const pointerRef = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const { pointer } = state;
    pointerRef.current.x = THREE.MathUtils.damp(pointerRef.current.x, pointer.x, 3.5, delta);
    pointerRef.current.y = THREE.MathUtils.damp(pointerRef.current.y, pointer.y, 3.5, delta);

    // Dynamic isometric vantage angle
    const targetX = 1.9 + pointerRef.current.x * 0.9 + dragOffset.x;
    const targetY = 2.1 - pointerRef.current.y * 0.4 + dragOffset.y;
    const targetZ = 3.6;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4.0, delta);

    camera.lookAt(-0.15, 0.55, -3.2);
  });

  return null;
}

/**
 * WaitTime3DCanvas:
 * Interactive 3D scene visualising the wait time parameters in rich 3D spatial depth.
 * IMPORTANT: Strictly does NOT calculate or own the wait estimation result.
 */
export default function WaitTime3DCanvas({ patientsAhead = 4, estimatedWaitMinutes = 32 }) {
  const containerRef = useRef(null);
  const isCanvasActive = useCanvasVisibility(containerRef);

  // Drag interaction state for manual 3D orbit inspection
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
      x: Math.max(-1.5, Math.min(1.5, prev.x - dx)),
      y: Math.max(-0.6, Math.min(0.8, prev.y + dy))
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
        height: '420px',
        position: 'relative',
        background: '#010003',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 60, 95, 0.25)',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(255, 45, 85, 0.12)',
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
          padding: '0.38rem 0.95rem',
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
        <span>3D Queue Depth Visualizer • Interactive 3D Perspective</span>
      </div>

      {/* Floating 3D Navigation Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '18px',
          zIndex: 10,
          background: 'rgba(14, 2, 6, 0.75)',
          border: '1px solid rgba(255, 60, 95, 0.2)',
          borderRadius: '9999px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.68rem',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none'
        }}
      >
        Drag or hover to orbit 3D angle
      </div>

      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [1.9, 2.1, 3.6], fov: 46 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#010003']} />
        <fog attach="fog" args={['#010003', 6, 22]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.4} color="#150208" />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#fff2f5" />
        <pointLight position={[-2, 3, 1]} intensity={2.2} color="#FF2D55" distance={12} />
        <pointLight position={[3, 2, -2]} intensity={1.8} color="#9333EA" distance={10} />

        {/* Illuminated Runway with Chevrons and Grid Floor */}
        <QueueRunway3D />

        {/* 3D Doctor Consultation Portal at vanishing point */}
        <ClinicPortal3D
          estimatedWaitMinutes={estimatedWaitMinutes}
          patientsAhead={patientsAhead}
        />

        {/* Dynamic Staggered Queue Cards Receding in 3D Perspective */}
        <DynamicQueueCards patientsAhead={patientsAhead} />

        {/* Ambient Cosmic Particles */}
        <CosmicFloatingEmbers />

        {/* Interactive Camera Parallax & Orbit Rig */}
        <SceneCameraRig dragOffset={dragOffset} />
      </Canvas>
    </div>
  );
}
