import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCardTexture } from './generateCardTexture';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * DoctorStation:
 * Minimalist clinical consultation booth at the vanishing point (z = -8.5).
 * Built with simple 3D primitives and CanvasTexture signage.
 */
function DoctorStation({ isMobile }) {
  const stationSignTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e050c';
      ctx.fillRect(0, 0, 512, 160);

      // Border
      ctx.strokeStyle = '#FF2D55';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 504, 152);

      // Header Room Pill
      ctx.fillStyle = '#FF2D55';
      ctx.beginPath();
      ctx.arc(40, 48, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(40, 48, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = '#fff0f3';
      ctx.fillText('CONSULTATION ROOM 1', 65, 56);

      // Doctor status
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillStyle = '#FF6B8B';
      ctx.fillText('DR. SHARMA (ACTIVE)', 35, 120);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      stationSignTexture.dispose();
    };
  }, [stationSignTexture]);

  return (
    <group position={[0, 0.7, -8.5]}>
      {/* 1. Backdrop Wall Portal */}
      <mesh position={[0, 0.7, -0.3]}>
        <boxGeometry args={[4.2, 2.5, 0.1]} />
        <meshStandardMaterial
          color="#1a040b"
          roughness={0.4}
          metalness={0.2}
          emissive="#FF2D55"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* 2. Doctor Room Signboard */}
      <mesh position={[0, 1.45, -0.2]}>
        <planeGeometry args={[2.8, 0.85]} />
        <meshBasicMaterial map={stationSignTexture} transparent opacity={0.95} />
      </mesh>

      {/* 3. Sleek Clinical Consultation Counter Desk */}
      <mesh position={[0, -0.1, 0.4]}>
        <boxGeometry args={[3.8, 0.45, 1.2]} />
        <meshStandardMaterial
          color="#24050f"
          roughness={0.3}
          metalness={0.3}
          emissive="#FF2D55"
          emissiveIntensity={0.18}
        />
      </mesh>

      {/* 4. Glowing Crimson Top Trim on Desk */}
      <mesh position={[0, 0.14, 0.98]}>
        <boxGeometry args={[3.82, 0.04, 0.06]} />
        <meshBasicMaterial color="#FF2D55" />
      </mesh>

      {/* 5. Active Consultation Status Beacon Sphere */}
      <mesh position={[1.4, 0.28, 0.5]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#10B981" />
      </mesh>

      {/* 6. Crimson Focal Point Light */}
      <pointLight
        color="#FF2D55"
        intensity={isMobile ? 1.8 : 2.8}
        distance={12}
        decay={2}
        position={[0, 1.2, 0.5]}
      />
    </group>
  );
}

/**
 * TokenCard3D:
 * Individual 3D token card built from a thin box primitive and crisp 2D canvas texture.
 * Features subtle micro-levitation and gentle responsiveness to mouse coordinates.
 */
function TokenCard3D({ card, index, mousePointer }) {
  const meshRef = useRef();

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

  // Dispose canvas texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Dedicated edges geometry with explicit lifecycle disposal
  const edgesGeom = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(1.86, 1.09, 0.05));
  }, []);

  useEffect(() => {
    return () => {
      edgesGeom.dispose();
    };
  }, [edgesGeom]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Gentle calm floating motion
    meshRef.current.position.y =
      card.pos[1] + Math.sin(t * 1.6 + index * 1.1) * 0.045;

    // Subtle individual tilt responding to mouse parallax
    if (mousePointer && mousePointer.current) {
      meshRef.current.rotation.y =
        card.rot[1] + mousePointer.current.x * 0.06;
      meshRef.current.rotation.x =
        card.rot[0] - mousePointer.current.y * 0.04;
    }
  });

  return (
    <group ref={meshRef} position={card.pos} rotation={card.rot}>
      {/* Front Face: Translucent Card Canvas */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[1.85, 1.08]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.94}
          roughness={0.2}
          metalness={0.1}
          emissive={card.emissiveColor || '#FF2D55'}
          emissiveIntensity={card.isYou ? 0.45 : 0.22}
        />
      </mesh>

      {/* 3D Glass Slab Body */}
      <mesh>
        <boxGeometry args={[1.86, 1.09, 0.05]} />
        <meshStandardMaterial
          color={card.isYou ? '#3a0817' : '#1a040b'}
          transparent
          opacity={0.85}
          roughness={0.25}
          metalness={0.25}
          emissive={card.borderColor || '#FF2D55'}
          emissiveIntensity={card.isYou ? 0.3 : 0.12}
        />
      </mesh>

      {/* Card High-Contrast Border Rim */}
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial
          color={card.borderColor || '#FF2D55'}
          linewidth={card.isYou ? 2 : 1}
          transparent
          opacity={card.isYou ? 0.98 : 0.65}
        />
      </lineSegments>
    </group>
  );
}

/**
 * QueueFloorGuide:
 * Subtle converging perspective floor track guiding the eye toward the doctor counter.
 */
function QueueFloorGuide() {
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f0206';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(255, 45, 85, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 24);
    return tex;
  }, []);

  // Dispose floor texture on unmount
  useEffect(() => {
    return () => {
      gridTexture.dispose();
    };
  }, [gridTexture]);

  return (
    <mesh position={[0, -0.65, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 20]} />
      <meshStandardMaterial
        map={gridTexture}
        color="#180309"
        roughness={0.7}
        metalness={0.1}
        transparent
        opacity={0.75}
      />
    </mesh>
  );
}

/**
 * SceneController:
 * Applies smooth lerp mouse parallax and scroll-linked camera translation.
 */
function SceneController({ isMobile, mousePointer, scrollYRef }) {
  useFrame(({ camera }) => {
    const mx = mousePointer.current.x;
    const my = mousePointer.current.y;
    const sy = scrollYRef.current;

    // 1. Mouse Parallax target calculation (clamped to subtle range)
    const targetX = mx * (isMobile ? 0.2 : 0.45);
    const targetY = 1.05 + my * (isMobile ? 0.12 : 0.25);

    // 2. Scroll-linked camera travel (gently moves forward along Z as user scrolls down page)
    const scrollFraction = Math.min(Math.max(sy / 450, 0), 1);
    const targetZ = (isMobile ? 5.6 : 4.8) - scrollFraction * 1.5;

    // 3. Smooth dampening / lerp
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);

    // Camera continuously aims toward the consultation station vanishing point
    camera.lookAt(0, 0.5, -4.5);
  });

  return null;
}

/**
 * Hero3DCanvas:
 * The primary 3D Scene export for the Landing Page Hero section.
 * Clamps DPR, reduces card count on mobile, and manages mouse/scroll events.
 */
export default function Hero3DCanvas() {
  const containerRef = useRef(null);
  const isCanvasActive = useCanvasVisibility(containerRef);
  const [isMobile, setIsMobile] = useState(false);
  const mousePointer = useRef({ x: 0, y: 0 });
  const scrollYRef = useRef(0);

  // Responsive & scroll listener setup
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();

    const handleMouseMove = (e) => {
      // Normalized coordinates [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mousePointer.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny))
      };
    };

    const handleScroll = () => {
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    };

    window.addEventListener('resize', checkMobile);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Cards configuration adhering to PROMPT 28 specifications:
  // - Cyan card labelled YOU
  // - Amber card for senior priority
  // - Translucent receding queue cards toward glowing doctor counter
  const cards = useMemo(() => {
    const list = [
      // 1. "YOU" Card - Foreground Cosmic Crimson
      {
        id: 'you',
        isYou: true,
        code: 'T-004',
        badgeText: '● YOUR TOKEN',
        badgeBg: 'rgba(255, 45, 85, 0.35)',
        badgeTextColor: '#fff0f3',
        subtext: '2 Ahead • Est. wait: 12 min',
        borderColor: '#FF2D55',
        glowColor: '#FF6B8B',
        emissiveColor: '#c01538',
        bgStart: '#3d0818',
        bgEnd: '#180208',
        pos: [-0.75, 0.05, -0.9],
        rot: [0.03, 0.16, -0.02]
      },

      // 2. Senior Priority Card - Amber
      {
        id: 'senior',
        isYou: false,
        code: 'T-002',
        badgeText: '★ SENIOR PRIORITY',
        badgeBg: 'rgba(245, 158, 11, 0.35)',
        badgeTextColor: '#fef3c7',
        subtext: 'Next in Queue • Est. 4 min',
        borderColor: '#f59e0b',
        glowColor: '#fbbf24',
        emissiveColor: '#b45309',
        bgStart: '#3b2308',
        bgEnd: '#1e1103',
        pos: [0.85, 0.42, -2.7],
        rot: [0.02, -0.18, 0.02]
      },

      // 3. Now Serving Card - Near Doctor Station
      {
        id: 'serving',
        isYou: false,
        code: 'T-001',
        badgeText: '● NOW SERVING',
        badgeBg: 'rgba(16, 185, 129, 0.35)',
        badgeTextColor: '#d1fae5',
        subtext: 'In Consultation Room 1',
        borderColor: '#10b981',
        glowColor: '#34d399',
        emissiveColor: '#059669',
        bgStart: '#064e3b',
        bgEnd: '#022c22',
        pos: [-0.2, 0.72, -4.8],
        rot: [0.01, 0.08, -0.01]
      }
    ];

    // Additional cards on desktop for full queue depth
    if (!isMobile) {
      list.push(
        {
          id: 'waiting-1',
          isYou: false,
          code: 'T-003',
          badgeText: 'IN QUEUE',
          badgeBg: 'rgba(255, 60, 95, 0.18)',
          badgeTextColor: '#E2B4BE',
          subtext: '1 Ahead • Est. 8 min',
          borderColor: 'rgba(255, 60, 95, 0.28)',
          glowColor: '#FF6B8B',
          emissiveColor: '#1a0309',
          bgStart: '#20050e',
          bgEnd: '#0d0105',
          pos: [0.65, 0.58, -4.0],
          rot: [0.02, -0.12, 0.01]
        },
        {
          id: 'waiting-2',
          isYou: false,
          code: 'T-005',
          badgeText: 'QUEUED',
          badgeBg: 'rgba(255, 60, 95, 0.15)',
          badgeTextColor: '#E2B4BE',
          subtext: '3 Ahead • Est. 18 min',
          borderColor: 'rgba(255, 60, 95, 0.25)',
          glowColor: '#FF6B8B',
          emissiveColor: '#150207',
          bgStart: '#1d040b',
          bgEnd: '#0a0104',
          pos: [0.95, -0.15, 0.6],
          rot: [0.04, -0.22, 0.03]
        }
      );
    }

    return list;
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        maxHeight: '480px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(28, 5, 14, 0.9) 0%, rgba(10, 1, 5, 0.98) 100%)',
        border: '1px solid rgba(255, 60, 95, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 45, 85, 0.15)'
      }}
    >
      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        camera={{
          position: [0, 1.1, isMobile ? 5.6 : 4.8],
          fov: isMobile ? 52 : 45,
          near: 0.1,
          far: 25
        }}
        dpr={[1, isMobile ? 1.2 : 1.5]} // Clamped pixel ratio to prevent battery burn
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <color attach="background" args={['#080004']} />
        {/* Calm, Cosmic Lighting */}
        <ambientLight color="#2d0812" intensity={1.3} />
        <directionalLight color="#FF2D55" intensity={1.8} position={[4, 6, 4]} />
        <directionalLight color="#FF6B8B" intensity={1.0} position={[-4, 3, -2]} />

        {/* Doctor Consultation Station */}
        <DoctorStation isMobile={isMobile} />

        {/* Floor Perspective Guide */}
        <QueueFloorGuide />

        {/* Receding Token Cards */}
        {cards.map((card, idx) => (
          <TokenCard3D
            key={card.id}
            card={card}
            index={idx}
            mousePointer={mousePointer}
          />
        ))}

        {/* Mouse Parallax & Scroll-Linked Camera Controller */}
        <SceneController
          isMobile={isMobile}
          mousePointer={mousePointer}
          scrollYRef={scrollYRef}
        />
      </Canvas>

      {/* Floating Clinical UI HUD overlay */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          borderRadius: '9999px',
          background: 'rgba(28, 5, 14, 0.85)',
          border: '1px solid rgba(255, 70, 100, 0.35)',
          backdropFilter: 'blur(12px)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#FF6B8B',
          pointerEvents: 'none',
          userSelect: 'none',
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
        <span>Live 3D Perspective Queue</span>
      </div>
    </div>
  );
}
