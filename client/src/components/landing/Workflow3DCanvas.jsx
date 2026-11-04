import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCanvasVisibility } from './useCanvasVisibility';

/**
 * BackgroundParticles:
 * Floating cosmic dust embers providing subtle spatial depth and motion parallax
 * across a pristine, pitch-dark obsidian space.
 */
function BackgroundParticles() {
  const count = 120;
  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
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
        size: 0.065,
        color: '#FF4D6D',
        transparent: true,
        opacity: 0.38,
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
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.012;
    }
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}

/**
 * CameraRig:
 * Continuous 60fps camera traversal tracking the scroll progress smoothly
 * across the clean dark obsidian space.
 */
function CameraRig({ motionRef }) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const p = motionRef.current.smoothProgress;

    const desiredCamX = -0.3 + p * 0.6;
    const desiredCamY = 0.5 - p * 0.3;
    const desiredCamZ = 5.0 - p * 0.8;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCamX, 5.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCamY, 5.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCamZ, 5.0, delta);

    lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, -0.15 + p * 0.3, 5.0, delta);
    lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, 0, 5.0, delta);
    lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, -1.0, 5.0, delta);

    camera.lookAt(lookTarget.current);
  });

  return null;
}

/**
 * SceneContent:
 * Bridges scroll progress directly into the 60fps Three.js animation loop
 * in a pure, distraction-free ultra-dark environment.
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
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 8, 28]} />
      <ambientLight intensity={0.25} color="#100106" />
      <directionalLight position={[4, 6, 4]} intensity={0.6} color="#fff0f3" />
      <pointLight position={[0, 0, 2]} intensity={1.8} color="#FF2D55" distance={14} />

      {/* Subtle floating cosmic dust embers */}
      <BackgroundParticles />

      {/* Camera flight sync */}
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
