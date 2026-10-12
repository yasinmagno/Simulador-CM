import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Line, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulation } from '@/store/simulation';
import { STATE_HEX } from '@/lib/estado';

type LinkStatus = 'ativo' | 'espera' | 'falha' | 'sem-energia';

// ── Static geometry data ────────────────────────────────────────
const HCM_WINDOWS: [number, number, number][] = [
  [-0.8, 2.8, -1.27], [0, 2.8, -1.27], [0.8, 2.8, -1.27],
  [-0.8, 1.8, -1.27], [0, 1.8, -1.27], [0.8, 1.8, -1.27],
];
const GUA_WINDOWS: [number, number, number][] = [
  [-0.7, 1.0, -1.02], [0.7, 1.0, -1.02],
  [-0.7, 0.2, -1.02], [0.7, 0.2, -1.02],
];

// ── Sky / ambient light per state ────────────────────────────────
const SKY_BG: Record<string, string> = {
  NORMAL: '#87ceeb',
  DEGRADADO: '#c8b86e',
  'EMERGÊNCIA': '#c49040',
  'CRÍTICO': '#c07070',
  FALHA: '#8b3030',
};
const AMB_LIGHT: Record<string, { color: string; intensity: number }> = {
  NORMAL: { color: '#ffffff', intensity: 0.4 },
  DEGRADADO: { color: '#f5e8a0', intensity: 0.5 },
  'EMERGÊNCIA': { color: '#f5c880', intensity: 0.5 },
  'CRÍTICO': { color: '#ff9090', intensity: 0.3 },
  FALHA: { color: '#ff6060', intensity: 0.3 },
};

function beamColor(status: LinkStatus, cor: string): string {
  if (status === 'ativo') return cor;
  if (status === 'falha') return '#ef4444';
  if (status === 'sem-energia') return '#64748b';
  return '#cbd5e1';
}

// ── Battery bar ──────────────────────────────────────────────────
function BatteryBar({ pct, position }: { pct: number; position: [number, number, number] }) {
  const fill = Math.max(0, Math.min(100, pct)) / 100;
  const fillColor = fill > 0.5 ? '#22c55e' : fill > 0.25 ? '#eab308' : '#ef4444';
  const W = 1.5;
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[W, 0.2, 0.05]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-(W * (1 - fill)) / 2, 0, 0.03]}>
        <boxGeometry args={[Math.max(W * fill, 0.001), 0.2, 0.05]} />
        <meshStandardMaterial color={fillColor} />
      </mesh>
    </group>
  );
}

// ── Satellite (animated vertical bob) ───────────────────────────
function SatelliteNode({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = 12 + Math.sin(clock.getElapsedTime() * ((2 * Math.PI) / 3)) * 0.4;
    }
  });
  return (
    <group ref={groupRef} position={[0, 12, -3]}>
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={active ? '#e2e8f0' : '#fecaca'} />
      </mesh>
      <mesh position={[-1.2, 0, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.5]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.5]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <Text position={[0, 0.8, 0]} fontSize={0.38} color="white" anchorX="center" anchorY="middle">
        {active ? 'SAT' : 'SAT ✕'}
      </Text>
    </group>
  );
}

// ── Internet Cloud ───────────────────────────────────────────────
function InternetCloud({ externo }: { externo: string }) {
  const hasConn = externo !== 'Nenhum';
  const cloudColor = hasConn ? '#f0f4f8' : '#fecaca';
  const subLabel =
    externo === 'ISP/fibra' ? 'via fibra' :
    externo === '4G/5G' ? 'via 4G/5G' :
    externo === 'Satélite' ? 'via satélite' : 'sem internet';
  return (
    <group position={[-10, 8, -4]}>
      <mesh>
        <sphereGeometry args={[0.9, 14, 14]} />
        <meshStandardMaterial color={cloudColor} emissive={hasConn ? '#22c55e' : '#ef4444'} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-0.7, 0.3, 0]}>
        <sphereGeometry args={[0.6, 10, 10]} />
        <meshStandardMaterial color={cloudColor} />
      </mesh>
      <mesh position={[0.7, 0.3, 0]}>
        <sphereGeometry args={[0.65, 10, 10]} />
        <meshStandardMaterial color={cloudColor} />
      </mesh>
      <Text position={[0, 1.4, 0]} fontSize={0.45} color="white" anchorX="center">
        Internet
      </Text>
      <Text position={[0, 0.8, 0]} fontSize={0.35} color={hasConn ? '#a3e635' : '#fca5a5'} anchorX="center">
        {subLabel}
      </Text>
    </group>
  );
}

// ── Packet spheres animated along a path ─────────────────────────
function PacketSpheres({ points, count, color, speed }: {
  points: THREE.Vector3[];
  count: number;
  color: string;
  speed: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tsRef = useRef<number[]>([]);
  if (tsRef.current.length !== count) {
    tsRef.current = Array.from({ length: count }, (_, i) => i / count);
  }
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const n = points.length;
    for (let i = 0; i < count; i++) {
      const dir = i < Math.ceil(count / 2) ? 1 : -1;
      tsRef.current[i] = ((tsRef.current[i] + dir * delta * speed) % 1 + 1) % 1;
      // Smooth interpolation so spheres glide along the path (not jump between indices)
      const f = tsRef.current[i] * (n - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(i0 + 1, n - 1);
      dummy.position.lerpVectors(points[i0], points[i1], f - i0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} toneMapped={false} />
    </instancedMesh>
  );
}

// ── PtP Beam ─────────────────────────────────────────────────────
const PTP_PTS: [number, number, number][] = [[-7.2, 5.2, -0.3], [8.8, 3.8, -0.3]];

function PtPBeam({ status, cor }: { status: LinkStatus; cor: string }) {
  const color = beamColor(status, cor);
  const vectors = useMemo(() => PTP_PTS.map(p => new THREE.Vector3(...p)), []);
  return (
    <>
      <Line
        points={PTP_PTS}
        color={color}
        lineWidth={status === 'ativo' ? 3 : 2}
        dashed={status !== 'ativo'}
        dashSize={0.8}
        gapSize={0.4}
      />
      {status === 'ativo' && <PacketSpheres points={vectors} count={4} color={cor} speed={0.4} />}
    </>
  );
}

// ── 4G/5G Local Beam ─────────────────────────────────────────────
function G4Beam({ status, cor }: { status: LinkStatus; cor: string }) {
  const color = beamColor(status, cor);
  const { pts, vecs } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.5, 0.5, 0.3),
      new THREE.Vector3(0, 5.5, 2),
      new THREE.Vector3(8.5, 0.5, 0.3),
    ]);
    const v = curve.getPoints(50);
    return {
      pts: v.map(p => [p.x, p.y, p.z] as [number, number, number]),
      vecs: v,
    };
  }, []);
  return (
    <>
      <Line
        points={pts}
        color={color}
        lineWidth={status === 'ativo' ? 3 : 2}
        dashed={status !== 'ativo'}
        dashSize={0.8}
        gapSize={0.4}
      />
      {status === 'ativo' && <PacketSpheres points={vecs} count={4} color={cor} speed={0.2} />}
    </>
  );
}

// ── Satellite Beam ───────────────────────────────────────────────
function SatBeam({ status, cor }: { status: LinkStatus; cor: string }) {
  const color = beamColor(status, cor);
  const { pts, vecs } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.2, 5.2, -0.3),
      new THREE.Vector3(-5, 10, -2),
      new THREE.Vector3(0, 12, -3),
    ]);
    const v = curve.getPoints(50);
    return {
      pts: v.map(p => [p.x, p.y, p.z] as [number, number, number]),
      vecs: v,
    };
  }, []);
  return (
    <>
      <Line
        points={pts}
        color={color}
        lineWidth={status === 'ativo' ? 3 : 2}
        dashed={status !== 'ativo'}
        dashSize={0.8}
        gapSize={0.4}
      />
      {status === 'ativo' && <PacketSpheres points={vecs} count={2} color={cor} speed={0.15} />}
    </>
  );
}

// ── Rain system ──────────────────────────────────────────────────
function RainSystem({ intensity }: { intensity: number }) {
  const [geo, posAttr] = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 32;
      arr[i * 3 + 1] = Math.random() * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const a = new THREE.BufferAttribute(arr, 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', a);
    return [g, a] as const;
  }, []);

  useFrame((_, delta) => {
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < 200; i++) {
      arr[i * 3 + 1] -= delta * 8;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 16;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial color="#3b82f6" size={0.12} transparent opacity={intensity} sizeAttenuation />
    </points>
  );
}

// ── HTML alert overlays ──────────────────────────────────────────
function HtmlAlerts({ guaxeneIsolada, hcmSemEnergia, guaxeneSemEnergia }: {
  guaxeneIsolada: boolean;
  hcmSemEnergia: boolean;
  guaxeneSemEnergia: boolean;
}) {
  return (
    <>
      {guaxeneIsolada && (
        <Html position={[8, 5.8, 0]} center>
          <div style={{
            background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 9999, whiteSpace: 'nowrap', animation: 'pulse 1s infinite',
          }}>
            GUAXENE ISOLADA
          </div>
        </Html>
      )}
      {hcmSemEnergia && (
        <Html position={[-8, 6.6, 0]} center>
          <div style={{
            background: '#991b1b', color: 'white', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 9999, whiteSpace: 'nowrap',
          }}>
            HCM SEM ENERGIA
          </div>
        </Html>
      )}
      {guaxeneSemEnergia && (
        <Html position={[8, 4.8, 0]} center>
          <div style={{
            background: '#991b1b', color: 'white', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 9999, whiteSpace: 'nowrap',
          }}>
            GUAXENE SEM ENERGIA
          </div>
        </Html>
      )}
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────
export function NetworkSchematic3D() {
  const { result } = useSimulation();
  if (!result) return null;

  const { input: inp, network, link_budget: lb, energy } = result;
  const estado = network.estado;
  const cor = STATE_HEX[estado] ?? '#22c55e';
  const local = network.caminho_local;
  const externo = network.caminho_externo;
  const ambos = network.hcm_com_energia && network.guaxene_com_energia;
  const hcmOk = network.hcm_com_energia;

  const ptpSemSinal = inp.ptp_ativo && !lb.modulacao_selecionada;

  const calcStatus = (ativo: boolean, emUso: boolean, comEnergia = true): LinkStatus =>
    !ativo ? 'falha' : !comEnergia ? 'sem-energia' : emUso ? 'ativo' : 'espera';

  const batPct = (wh: number, max: number) =>
    Math.max(0, Math.min(100, ((wh - max * 0.2) / (max * 0.8)) * 100));

  const ptpStatus: LinkStatus = ptpSemSinal ? 'falha' : calcStatus(inp.ptp_ativo, local === 'PtP', ambos);
  const g4Status: LinkStatus = calcStatus(inp.g4_local_disponivel, local === '4G/5G', ambos);
  const satStatus: LinkStatus = calcStatus(inp.satelite_ativo, externo === 'Satélite', hcmOk);

  const chuva = Math.min(inp.l_ambiente_db / 12, 1);
  const batHcmPct = batPct(energy.hcm_bateria_wh, 12000);
  const batGuaPct = batPct(energy.guaxene_bateria_wh, 3600);

  const skyBg = SKY_BG[estado] ?? '#87ceeb';
  const amb = AMB_LIGHT[estado] ?? { color: '#ffffff', intensity: 0.4 };

  const hcmBodyColor = network.hcm_com_energia ? '#1d4ed8' : '#334155';
  const guaBodyColor = network.guaxene_com_energia ? '#16a34a' : '#334155';
  const hcmWinColor = network.hcm_com_energia ? '#fde68a' : '#1e293b';
  const guaWinColor = network.guaxene_com_energia ? '#fde68a' : '#1e293b';
  const hcmWinEmissive = network.hcm_com_energia ? 1.2 : 0;
  const guaWinEmissive = network.guaxene_com_energia ? 1.2 : 0;

  return (
    <div className="h-full w-full relative overflow-hidden">
      <Canvas
        camera={{ fov: 50, position: [0, 14, 18] as [number, number, number] }}
        style={{ background: skyBg, width: '100%', height: '100%' }}
        shadows
      >
        {/* Scene background */}
        <color attach="background" args={[skyBg]} />

        {/* Lighting */}
        <ambientLight intensity={amb.intensity} color={amb.color} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#b0c4de" />

        {/* Camera controls */}
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.05} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 30]} />
          <meshStandardMaterial color="#c8b99a" />
        </mesh>

        {/* Estuário */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[18, 10]} />
          <meshStandardMaterial color="#1e6fa0" transparent opacity={0.8} />
        </mesh>
        <Text
          position={[0, 0.06, 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.48}
          color="#93c5fd"
          anchorX="center"
        >
          Baía de Maputo · 3,69 km
        </Text>

        {/* ── HCM ── */}
        <group position={[-8, 0.1, 0]}>
          {/* Main block */}
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[3, 4, 2.5]} />
            <meshStandardMaterial color={hcmBodyColor} />
          </mesh>
          {/* Roof cross horizontal */}
          <mesh position={[0, 4.08, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.2]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {/* Roof cross vertical */}
          <mesh position={[0, 4.08, 0]}>
            <boxGeometry args={[0.2, 0.15, 0.8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {/* Windows */}
          {HCM_WINDOWS.map((pos, i) => (
            <mesh key={i} position={pos}>
              <boxGeometry args={[0.45, 0.55, 0.05]} />
              <meshStandardMaterial
                color={hcmWinColor}
                emissive={hcmWinColor}
                emissiveIntensity={hcmWinEmissive}
              />
            </mesh>
          ))}
          {/* Antenna mast */}
          <mesh position={[0.8, 5.2, -0.3]}>
            <cylinderGeometry args={[0.05, 0.08, 2.5, 8]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          {/* Antenna head */}
          <mesh position={[0.8, 6.7, -0.3]}>
            <boxGeometry args={[0.15, 0.5, 0.08]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          {/* Label */}
          <Text position={[0, 6.2, 0]} fontSize={0.7} color="white" anchorX="center" anchorY="middle">
            HCM
          </Text>
          {/* Battery bar */}
          <BatteryBar pct={batHcmPct} position={[0, 5.0, 1.5]} />
        </group>

        {/* ── Guaxene ── */}
        <group position={[8, 0, 0]}>
          {/* Main block */}
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[2.8, 2, 2]} />
            <meshStandardMaterial color={guaBodyColor} />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 2.6, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[2.2, 1.2, 4]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          {/* Windows */}
          {GUA_WINDOWS.map((pos, i) => (
            <mesh key={i} position={pos}>
              <boxGeometry args={[0.45, 0.55, 0.05]} />
              <meshStandardMaterial
                color={guaWinColor}
                emissive={guaWinColor}
                emissiveIntensity={guaWinEmissive}
              />
            </mesh>
          ))}
          {/* Antenna mast */}
          <mesh position={[0.8, 3.8, -0.3]}>
            <cylinderGeometry args={[0.05, 0.08, 2.5, 8]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          {/* Antenna head */}
          <mesh position={[0.8, 5.3, -0.3]}>
            <boxGeometry args={[0.15, 0.5, 0.08]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          {/* Label */}
          <Text position={[0, 4.5, 0]} fontSize={0.7} color="white" anchorX="center" anchorY="middle">
            Guaxene
          </Text>
          {/* Battery bar */}
          <BatteryBar pct={batGuaPct} position={[0, 3.6, 1.2]} />
        </group>

        {/* ── BTS Tower ── */}
        <group position={[0, 0, 2]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.06, 0.12, 5, 8]} />
            <meshStandardMaterial color={inp.g4_local_disponivel ? '#475569' : '#ef4444'} />
          </mesh>
          <mesh position={[0, 5.2, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <Text position={[0, 6.2, 0]} fontSize={0.5} color="white" anchorX="center">
            BTS 4G/5G
          </Text>
        </group>

        {/* ── Satellite ── */}
        <SatelliteNode active={inp.satelite_ativo} />

        {/* ── Internet Cloud ── */}
        <InternetCloud externo={externo} />

        {/* ── Beams ── */}
        <PtPBeam status={ptpStatus} cor={cor} />
        <G4Beam status={g4Status} cor={cor} />
        <SatBeam status={satStatus} cor={cor} />

        {/* ── Rain ── */}
        {chuva > 0 && <RainSystem intensity={chuva} />}

        {/* ── HTML alerts ── */}
        <HtmlAlerts
          guaxeneIsolada={local === 'Nenhum'}
          hcmSemEnergia={!network.hcm_com_energia}
          guaxeneSemEnergia={!network.guaxene_com_energia}
        />
      </Canvas>

      {/* 2D legend */}
      <div className="absolute bottom-2 right-3 bg-white/90 rounded-md shadow-sm px-2.5 py-1.5 text-[10px] text-gray-600 flex gap-3 pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 inline-block rounded" style={{ background: cor }} />
          em uso
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dotted border-slate-300 inline-block" />
          em espera
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-red-500 inline-block" />
          em falha
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-slate-500 inline-block" />
          sem energia
        </span>
      </div>
    </div>
  );
}
