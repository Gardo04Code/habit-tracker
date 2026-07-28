import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Text } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import type { Group, Mesh } from "three";
import type { StatusBreakdownPoint } from "../../types/dashboard";
import type { HabitStatus } from "../../types/habit";
import { getStatusColorVar } from "../../utils/habitStatus";
import { useTheme } from "../../hooks/useTheme";
import { Skeleton } from "../ui/Skeleton";

interface StatusDonut3DProps {
  data: StatusBreakdownPoint[];
  activeStatus: HabitStatus | null;
  onHoverStatus: (status: HabitStatus | null) => void;
}

interface Segment {
  status: HabitStatus;
  startAngle: number;
  endAngle: number;
  percent: number;
}

// Segmentos por debajo de este porcentaje no tienen arco suficiente para
// que el texto quepa sin desbordarse; se omite la etiqueta en esos casos.
const MIN_PERCENT_FOR_LABEL = 6;

const INNER_RADIUS = 1.05;
const OUTER_RADIUS = 1.75;
const THICKNESS = 0.42;
const GAP_RADIANS = 0.045;

function resolveCssColor(cssVarExpression: string): string {
  const match = /var\((--[a-z0-9-]+)\)/i.exec(cssVarExpression);
  const name = match ? match[1] : cssVarExpression;
  if (typeof window === "undefined") return "#4c7cf0";
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || "#4c7cf0";
}

function buildAnnulusSector(startAngle: number, endAngle: number): THREE.Shape {
  // startAngle > endAngle (sweep proceeds clockwise, i.e. decreasing angle);
  // the outer arc therefore sweeps clockwise=true, the inner arc back the
  // other way sweeps clockwise=false, or absarc takes the long way around.
  const shape = new THREE.Shape();
  shape.moveTo(OUTER_RADIUS * Math.cos(startAngle), OUTER_RADIUS * Math.sin(startAngle));
  shape.absarc(0, 0, OUTER_RADIUS, startAngle, endAngle, true);
  shape.lineTo(INNER_RADIUS * Math.cos(endAngle), INNER_RADIUS * Math.sin(endAngle));
  shape.absarc(0, 0, INNER_RADIUS, endAngle, startAngle, false);
  shape.closePath();
  return shape;
}

function computeSegments(data: StatusBreakdownPoint[]): Segment[] {
  const visible = data.filter((point) => point.count > 0);
  const total = visible.reduce((sum, point) => sum + point.count, 0);
  if (total === 0) return [];

  const totalGap = GAP_RADIANS * visible.length;
  let cursor = Math.PI / 2 - GAP_RADIANS / 2;
  const segments: Segment[] = [];

  for (const point of visible) {
    const span = (point.count / total) * (Math.PI * 2 - totalGap);
    const startAngle = cursor;
    const endAngle = cursor - span;
    const percent = Math.round((point.count / total) * 100);
    segments.push({ status: point.status, startAngle, endAngle, percent });
    cursor = endAngle - GAP_RADIANS;
  }

  return segments;
}

const extrudeSettings = {
  depth: THICKNESS,
  bevelEnabled: true,
  bevelThickness: 0.025,
  bevelSize: 0.025,
  bevelSegments: 3,
  curveSegments: 48,
};

interface DonutSegmentMeshProps {
  segment: Segment;
  color: string;
  isActive: boolean;
  isDimmed: boolean;
  onHover: (status: HabitStatus | null) => void;
}

function DonutSegmentMesh({ segment, color, isActive, isDimmed, onHover }: DonutSegmentMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const shape = useMemo(() => buildAnnulusSector(segment.startAngle, segment.endAngle), [segment]);

  useFrame(() => {
    if (!meshRef.current) return;
    const targetY = isActive ? 0.16 : 0;
    meshRef.current.position.y = THREE.MathUtils.damp(meshRef.current.position.y, targetY, 8, 0.02);
  });

  const midAngle = (segment.startAngle + segment.endAngle) / 2;
  const midRadius = (INNER_RADIUS + OUTER_RADIUS) / 2;
  const labelPosition: [number, number, number] = [
    midRadius * Math.cos(midAngle),
    midRadius * Math.sin(midAngle),
    THICKNESS + 0.04,
  ];

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(segment.status);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
    >
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.32}
        metalness={0.12}
        clearcoat={0.55}
        clearcoatRoughness={0.28}
        emissive={color}
        emissiveIntensity={isActive ? 0.22 : 0}
        transparent
        opacity={isDimmed ? 0.35 : 1}
      />
      {segment.percent >= MIN_PERCENT_FOR_LABEL && (
        <Text
          position={labelPosition}
          fontSize={0.26}
          color="white"
          outlineWidth={0.012}
          outlineColor="#0b1220"
          anchorX="center"
          anchorY="middle"
          fillOpacity={isDimmed ? 0.35 : 1}
          outlineOpacity={isDimmed ? 0.35 : 1}
        >
          {segment.percent}%
        </Text>
      )}
    </mesh>
  );
}

interface DonutRingProps {
  segments: Segment[];
  colors: Record<string, string>;
  activeStatus: HabitStatus | null;
  onHoverStatus: (status: HabitStatus | null) => void;
  autoRotate: boolean;
}

function DonutRing({ segments, colors, activeStatus, onHoverStatus, autoRotate }: DonutRingProps) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!autoRotate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.16;
  });

  return (
    <group ref={groupRef} rotation={[0, autoRotate ? 0 : 0.55, 0]}>
      {segments.map((segment) => (
        <DonutSegmentMesh
          key={segment.status}
          segment={segment}
          color={colors[segment.status] ?? "#4c7cf0"}
          isActive={activeStatus === segment.status}
          isDimmed={activeStatus !== null && activeStatus !== segment.status}
          onHover={onHoverStatus}
        />
      ))}
    </group>
  );
}

function DonutScene({ data, activeStatus, onHoverStatus }: StatusDonut3DProps) {
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const segments = useMemo(() => computeSegments(data), [data]);

  const colors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const point of data) {
      map[point.status] = resolveCssColor(getStatusColorVar(point.status));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolvedTheme changes what the CSS variables resolve to; it must retrigger this even though it isn't read directly.
  }, [data, resolvedTheme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- resolvedTheme changes what the CSS variable resolves to; it must retrigger this even though it isn't read directly.
  const accentColor = useMemo(() => resolveCssColor("var(--color-primary)"), [resolvedTheme]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2.5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3.5, 2.2, -2]} intensity={0.35} color={accentColor} />
      <DonutRing
        segments={segments}
        colors={colors}
        activeStatus={activeStatus}
        onHoverStatus={onHoverStatus}
        autoRotate={!prefersReducedMotion}
      />
      <ContactShadows position={[0, -0.65, 0]} opacity={0.5} scale={6.5} blur={2.4} far={3} resolution={256} color="#000000" />
    </>
  );
}

export function StatusDonut3D({ data, activeStatus, onHoverStatus }: StatusDonut3DProps) {
  return (
    <div className="h-[280px] w-[280px] shrink-0" aria-hidden="true">
      <Suspense fallback={<Skeleton className="h-full w-full rounded-full" />}>
        <Canvas
          dpr={[1, 1.75]}
          shadows
          camera={{ position: [0, 6.2, 7.9], fov: 24 }}
          gl={{ antialias: true, alpha: true }}
        >
          <DonutScene data={data} activeStatus={activeStatus} onHoverStatus={onHoverStatus} />
        </Canvas>
      </Suspense>
    </div>
  );
}
