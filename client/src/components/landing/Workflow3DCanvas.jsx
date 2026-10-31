import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKFLOW_STATIONS } from './WorkflowData';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * HeroWireframeTorus:
 * The signature 3D holographic wireframe mesh corridor featured in the reference video.
 * Rotates on multiple axes in direct sync with scroll progress and clock time.
 */
function HeroWireframeTorus({ motionRef }) {
  const outerTorusRef = useRef();
  const innerTorusRef = useRef();

  const outerGeo = useMemo(() => new THREE.TorusGeometry(3.6, 1.25, 24, 72), []);
  const innerGeo = useMemo(() => new THREE.TorusGeometry(2.1, 0.22, 16, 48), []);

  const outerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FF2D55',
        emissive: '#7E22CE',
        emissiveIntensity: 0.9,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.8
      }),
    []
  );

  const innerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FF6B8B',
        wireframe: true,
        transparent: true,
        opacity: 0.32
      }),
    []
  );

  useEffect(() => {
    return () => {
      outerGeo.dispose();
      innerGeo.dispose();
      outerMat.dispose();
      innerMat.dispose();
    };
  }, [outerGeo, innerGeo, outerMat, innerMat]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const p = motionRef.current.smoothProgress;

    if (outerTorusRef.current) {
      outerTorusRef.current.rotation.x = Math.PI * 0.28 + p * Math.PI * 1.4 + time * 0.08;
      outerTorusRef.current.rotation.y = p * Math.PI * 1.8 + time * 0.12;
      outerTorusRef.current.rotation.z = Math.sin(p * Math.PI) * 0.35;

      outerTorusRef.current.position.x = -1.6 + Math.cos(p * Math.PI) * 0.8;
      outerTorusRef.current.position.y = -0.3 + Math.sin(p * Math.PI * 1.5) * 0.4;
      outerTorusRef.current.position.z = -1.2 + p * 1.0;
    }

    if (innerTorusRef.current) {
      innerTorusRef.current.rotation.x = -Math.PI * 0.2 + p * -Math.PI * 1.2 - time * 0.1;
      innerTorusRef.current.rotation.y = -p * Math.PI * 1.5 - time * 0.14;
      innerTorusRef.current.rotation.z = -Math.sin(p * Math.PI) * 0.3;

      innerTorusRef.current.position.x = -1.6 + Math.cos(p * Math.PI) * 0.8;
      innerTorusRef.current.position.y = -0.3 + Math.sin(p * Math.PI * 1.5) * 0.4;
      innerTorusRef.current.position.z = -1.2 + p * 1.0;
    }
  });

  return (
    <group>
      <mesh ref={outerTorusRef} geometry={outerGeo} material={outerMat} />
      <mesh ref={innerTorusRef} geometry={innerGeo} material={innerMat} />
    </group>
  );
}

/**
 * PerspectiveGridSystem:
 * Floor and ceiling perspective grids providing spatial depth and speed perception.
 */
function PerspectiveGridSystem({ motionRef }) {
  const floorGridRef = useRef();

  useFrame(() => {
    if (floorGridRef.current) {
      const p = motionRef.current.smoothProgress;
      floorGridRef.current.position.z = -4 - (p * 4 % 2);
    }
  });

  return (
    <group>
      {/* Floor Grid extending deep into perspective */}
      <gridHelper
        ref={floorGridRef}
        args={[50, 40, '#FF2D55', '#240510']}
        position={[0, -2.8, -4]}
        rotation={[0, 0, 0]}
      />

      {/* Subtle distant boundary glow disc */}
      <mesh position={[0, 0, -12]} rotation={[0, 0, 0]}>
        <circleGeometry args={[9, 32]} />
        <meshBasicMaterial
          color="#3B0715"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * BackgroundParticles:
 * Floating cosmic dust providing spatial depth layers and motion parallax.
 */
function BackgroundParticles() {
  const count = 150;
  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    return pos;
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    return g;
  }, [particles]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.075,
        color: '#FF6B8B',
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  const pointsRef = useRef();
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
    }
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}

/**
 * CameraRig:
 * Continuous 60fps camera traversal tracking the scroll progress smoothly.
 */
function CameraRig({ motionRef }) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const p = motionRef.current.smoothProgress;

    const desiredCamX = -0.4 + p * 0.8;
    const desiredCamY = 0.8 - p * 0.4;
    const desiredCamZ = 5.2 - p * 0.9;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCamX, 5.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCamY, 5.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCamZ, 5.0, delta);

    lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, -0.2 + p * 0.4, 5.0, delta);
    lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, 0, 5.0, delta);
    lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, -1.0, 5.0, delta);

    camera.lookAt(lookTarget.current);
  });

  return null;
}

/**
 * SceneContent:
 * Bridges scroll progress directly into the 60fps Three.js animation loop.
 */
function SceneContent({ scrollProgressRef, motionRef }) {
  useFrame((_, delta) => {
    const rawTarget = scrollProgressRef?.current ?? 0;
    motionRef.current.targetProgress = rawTarget;
    motionRef.current.smoothProgress = THREE.MathUtils.damp(
      motionRef.current.smoothProgress,
      rawTarget,
      5.5,
      delta
    );
    motionRef.current.continuousIndex = motionRef.current.smoothProgress * 4.0;
  });

  return (
    <>
      <color attach="background" args={['#060105']} />
      <fog attach="fog" args={['#060105', 6, 26]} />
      <ambientLight intensity={0.9} color="#2b0514" />
      <directionalLight position={[4, 6, 4]} intensity={1.5} color="#fff0f3" />
      <pointLight position={[-2, 2, 2]} intensity={3.5} color="#FF2D55" distance={18} />
      <pointLight position={[3, -1, 1]} intensity={2.2} color="#9333EA" distance={16} />

      {/* Perspective Floor Grid */}
      <PerspectiveGridSystem motionRef={motionRef} />

      {/* 3D Holographic Wireframe Torus Corridor */}
      <HeroWireframeTorus motionRef={motionRef} />

      {/* Ambient Floating Dust Embers */}
      <BackgroundParticles />

      {/* Camera Flight Motion */}
      <CameraRig motionRef={motionRef} />
    </>
  );
}

/**
 * Workflow3DCanvas:
 * Interactive 3D scene rendering Scene B matching the reference scroll corridor video.
 * Supports direct wheel scrubbing & touch/mouse dragging over canvas.
 */
export default function Workflow3DCanvas({
  activeStationId,
  onSelectStation,
  scrollProgressRef,
  onScrub
}) {
  const containerRef = useRef(null);
  const isCanvasActive = useCanvasVisibility(containerRef);

  // Shared continuous motion state read directly by useFrame
  const motionRef = useRef({
    targetProgress: 0,
    smoothProgress: 0,
    continuousIndex: 0
  });

  // Direct wheel scrubbing on canvas
  const handleWheel = useCallback(
    (e) => {
      if (onScrub) {
        onScrub(e.deltaY * 0.0018);
      }
    },
    [onScrub]
  );

  // Mouse drag scrubbing on canvas
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !onScrub) return;
    const deltaY = dragStartYRef.current - e.clientY;
    dragStartYRef.current = e.clientY;
    onScrub(deltaY * -0.003);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'auto';
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'auto',
        cursor: 'grab'
      }}
    >
      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.8, 5.2], fov: 52 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <SceneContent
          scrollProgressRef={scrollProgressRef}
          motionRef={motionRef}
        />
      </Canvas>
    </div>
  );
}
