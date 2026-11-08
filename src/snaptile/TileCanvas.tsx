import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { deleteCue, setDeleteAnchor } from "./delete-anchor";
import * as THREE from "three";
import { clock } from "./finale-clock";
import { orbitLock } from "./orbit";
import { guidanceCount, PUZZLES } from "./puzzles";
import { meshLift, roofAlpha, roofHingeY, sockets, TILE, visualCenter, facingOf, pickPads } from "./space";
import { useSnap } from "./store";
import { pieceKey, sameKind, samePiece, TILE_HEX, type Cutout, type Piece } from "./tiles";

const geos = {
  square: makeSquare("none"),
  window: makeSquare("window"),
  door: makeSquare("door"),
  arch: makeSquare("arch"),
  triangle: makeTriangle(),
  right: makeRight(),
};

function makeSquare(cutout: Cutout) {
  const shape = new THREE.Shape();
  const s = TILE / 2;
  shape.moveTo(-s, -s);
  shape.lineTo(s, -s);
  shape.lineTo(s, s);
  shape.lineTo(-s, s);
  shape.closePath();
  if (cutout === "window") {
    const panes: [number, number, number, number][] = [
      [-0.27, -0.27, -0.05, -0.05],
      [0.05, -0.27, 0.27, -0.05],
      [-0.27, 0.05, -0.05, 0.27],
      [0.05, 0.05, 0.27, 0.27],
    ];
    for (const [x0, y0, x1, y1] of panes) {
      const hole = new THREE.Path();
      hole.moveTo(x0, y0);
      hole.lineTo(x1, y0);
      hole.lineTo(x1, y1);
      hole.lineTo(x0, y1);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  if (cutout === "door") {
    const hole = new THREE.Path();
    hole.moveTo(-0.18, -s);
    hole.lineTo(-0.18, 0.1);
    hole.lineTo(0.18, 0.1);
    hole.lineTo(0.18, -s);
    hole.closePath();
    shape.holes.push(hole);
  }
  if (cutout === "arch") {
    const hole = new THREE.Path();
    hole.moveTo(-0.18, -s);
    hole.lineTo(-0.18, 0);
    for (let i = 0; i <= 8; i++) {
      const angle = Math.PI - (i / 8) * Math.PI;
      hole.lineTo(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18);
    }
    hole.lineTo(0.18, -s);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
  geo.translate(0, 0, -0.045);
  return geo;
}

function makeRight() {
  const s = TILE / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-s, -s);
  shape.lineTo(s, -s);
  shape.lineTo(-s, s);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
  geo.translate(0, 0, -0.045);
  return geo;
}
function makeTriangle() {
  const side = TILE;
  const h = (side * Math.sqrt(3)) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-side / 2, -h / 2);
  shape.lineTo(side / 2, -h / 2);
  shape.lineTo(0, h / 2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
  geo.translate(0, 0, -0.045);
  return geo;
}

const edges = {
  square: new THREE.EdgesGeometry(geos.square, 20),
  window: new THREE.EdgesGeometry(geos.window, 20),
  door: new THREE.EdgesGeometry(geos.door, 20),
  arch: new THREE.EdgesGeometry(geos.arch, 20),
  triangle: new THREE.EdgesGeometry(geos.triangle, 20),
  right: new THREE.EdgesGeometry(geos.right, 20),
};

function WindowTrim({ ghost }: { ghost?: boolean }) {
  const bars: [number, number, number, number][] = [
    [0, 0.32, 0.72, 0.08],
    [0, -0.32, 0.72, 0.08],
    [0.32, 0, 0.08, 0.64],
    [-0.32, 0, 0.08, 0.64],
    [0, 0, 0.08, 0.64],
    [0, 0, 0.64, 0.08],
  ];
  return (
    <group>
      {[-1, 1].map((side) =>
        bars.map(([x, y, w, h], index) => (
          <mesh key={`${side}-${index}`} position={[x, y, side * 0.06]} raycast={() => null}>
            <boxGeometry args={[w, h, 0.025]} />
            <meshStandardMaterial color="#fffefb" roughness={0.4} transparent opacity={ghost ? 0.9 : 1} />
          </mesh>
        )),
      )}
    </group>
  );
}

function rimOf(hex: string) {
  const color = new THREE.Color(hex);
  color.multiplyScalar(0.42);
  return "#" + color.getHexString();
}

function TileMesh({
  piece,
  ghost,
  bright,
  guide,
  hidden,
  selected,
  arrive,
  order,
  onPick,
}: {
  piece: Piece;
  ghost?: boolean;
  bright?: boolean;
  guide?: boolean;
  hidden?: boolean;
  selected?: boolean;
  arrive?: boolean;
  order?: number;
  onPick?: () => void;
}) {
  const placedColor = TILE_HEX[piece.color];
  const color = ghost && !hidden && (!guide || bright) ? "#ffffff" : placedColor;
  const geo =
    piece.shape === "right"
      ? geos.right
      : piece.shape === "triangle"
        ? geos.triangle
        : piece.cutout === "window"
          ? geos.window
          : piece.cutout === "door"
            ? geos.door
            : piece.cutout === "arch"
              ? geos.arch
              : geos.square;
  const edge =
    piece.shape === "right"
      ? edges.right
      : piece.shape === "triangle"
        ? edges.triangle
        : piece.cutout === "door"
          ? edges.door
          : piece.cutout === "arch"
            ? edges.arch
            : edges.square;
  const rim = ghost ? "#5c567f" : rimOf(color);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const born = useRef(arrive ? performance.now() : 0);
  const litSince = useRef(0);
  const wasLit = useRef(false);
  const { camera, gl } = useThree();
  const spot = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const now = performance.now();
    let scale = 1;
    let lift = 0;
    let wobble = 0;
    if (arrive && born.current) {
      const age = now - born.current;
      const punch = clock.punch && !clock.reduced;
      if (punch) {
        if (age < 200) {
          const t = age / 200;
          scale = 0.72 + 0.28 * t + Math.sin(t * Math.PI) * (1 - t) * 0.42;
          lift = (1 - t) * 0.62;
        } else if (age < 320) {
          scale = 1.15;
        } else if (age < 500) {
          const t = (age - 320) / 180;
          scale = 1.15 - 0.15 * (1 - (1 - t) ** 3);
        }
      } else {
        const t = Math.min(1, age / 160);
        const overshoot = Math.sin(t * Math.PI) * (1 - t) * 0.18;
        scale = 0.86 + 0.14 * t + overshoot;
        lift = (1 - t) * 0.28;
      }
    }
    const lit = order != null && clock.on && order < clock.lit;
    if (lit && !wasLit.current) {
      wasLit.current = true;
      litSince.current = now;
    }
    if (!lit) wasLit.current = false;
    if (lit && litSince.current && !clock.reduced) {
      const t = Math.min(1, (now - litSince.current) / 320);
      scale += Math.sin(t * Math.PI) * (1 - t) * 0.12;
    }
    if (selected && !ghost && !clock.on) {
      lift += 0.12;
      wobble = Math.sin(now / 90) * 0.08;
      node.getWorldPosition(spot);
      spot.y += 0.45;
      spot.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      setDeleteAnchor({
        on: true,
        x: rect.left + (spot.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-spot.y * 0.5 + 0.5) * rect.height,
      });
    }
    if (deleteCue.shrink) {
      const t = Math.min(1, (now - deleteCue.shrink) / 160);
      scale *= 1 - t;
    }
    let flash = 0;
    if (clock.on && !clock.reduced && clock.flashUntil && order != null) {
      const start = clock.flashUntil - 120;
      const age = now - start;
      if (age >= 0 && age < 320) flash = age < 120 ? 1 : 1 - (age - 120) / 200;
    }
    if (mat.current) {
      if (flash > 0.02) {
        mat.current.emissive.set("#ffffff");
        mat.current.emissiveIntensity = 1.1 * flash;
      } else if (lit) {
        mat.current.emissive.set("#fff4cf");
        mat.current.emissiveIntensity = 0.55;
      } else if (selected && !ghost) {
        mat.current.emissive.set("#ffffff");
        mat.current.emissiveIntensity = 0.28;
      } else if (ghost && bright && guide && !hidden) {
        mat.current.emissive.set("#ffffff");
        mat.current.emissiveIntensity = 0.16;
      } else {
        mat.current.emissive.set("#000000");
        mat.current.emissiveIntensity = 0;
      }
    }
    node.scale.setScalar(Math.max(0.001, scale));
    node.position.y = lift;
    node.rotation.z = wobble;
  });
  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        onClick={
          onPick
            ? (event) => {
                event.stopPropagation();
                orbitLock.picked = true;
                if (orbitLock.moved) return;
                onPick();
              }
            : undefined
        }
      >
        <meshPhysicalMaterial
          ref={mat}
          color={color}
          roughness={0.12}
          metalness={0.02}
          clearcoat={ghost && !hidden ? 0.2 : 0.8}
          transparent
          opacity={hidden ? 0 : ghost ? (guide ? (bright ? 0.92 : 0.4) : 0.72) : 0.94}
          emissive={selected || (ghost && bright && guide && !hidden) ? "#ffffff" : "#000000"}
          emissiveIntensity={selected ? 0.28 : ghost && bright && guide && !hidden ? 0.16 : 0}
          depthWrite={!hidden}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={ghost ? -2 : 1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {hidden || piece.cutout !== "window" || piece.shape !== "square" ? null : <WindowTrim ghost={ghost} />}
      {hidden ? null : (
        <lineSegments geometry={edge} raycast={() => null}>
          <lineBasicMaterial color={rim} transparent opacity={0.85} />
        </lineSegments>
      )}
    </group>
  );
}

function TileView({
  piece,
  ox,
  oy,
  oz,
  ghost,
  bright,
  guide,
  hidden,
  selected,
  arrive,
  order,
  onPick,
  seat,
}: {
  piece: Piece;
  ox: number;
  oy: number;
  oz: number;
  ghost?: boolean;
  bright?: boolean;
  guide?: boolean;
  hidden?: boolean;
  selected?: boolean;
  arrive?: boolean;
  order?: number;
  onPick?: () => void;
  seat?: number;
}) {
  const mesh = <TileMesh piece={piece} ghost={ghost} bright={bright} guide={guide} hidden={hidden} selected={selected} arrive={arrive} order={order} onPick={onPick} />;
  const at = (x: number, y: number, z: number): [number, number, number] => [x - ox, y - oy, z - oz];
  if (piece.shape === "wheel") {
    const outward = 0.34;
    const y = piece.y + 0.22;
    const pos = piece.plane === "wallz" ? at(piece.x, y, piece.z + 0.5 + piece.lean * outward) : at(piece.x + 0.5 + piece.lean * outward, y, piece.z);
    const spin = piece.plane === "wallz" ? ([Math.PI / 2, 0, 0] as const) : ([0, 0, Math.PI / 2] as const);
    return (
      <mesh
        position={pos}
        rotation={spin}
        onClick={
          onPick
            ? (event) => {
                event.stopPropagation();
                orbitLock.picked = true;
                if (orbitLock.moved) return;
                onPick();
              }
            : undefined
        }
      >
        <cylinderGeometry args={[0.22, 0.22, 0.12, 24]} />
        <meshPhysicalMaterial
          color={ghost && !hidden ? "#ffffff" : TILE_HEX[piece.color]}
          roughness={0.35}
          transparent
          opacity={hidden ? 0 : ghost ? 0.72 : 1}
          depthWrite={!hidden}
        />
      </mesh>
    );
  }
  if (piece.shape === "right" && piece.plane !== "roofx" && piece.plane !== "roofz") {
    const step = piece.rot % 8;
    const spin = Math.floor(step / 2) % 4;
    const pitched = step % 2 === 1;
    const s = TILE / 2;
    if (piece.plane === "floor") {
      return (
        <group position={at(piece.x, piece.y, piece.z)} rotation={[0, spin * (Math.PI / 2), 0]}>
          <group position={[0, 0, s]} rotation={[pitched ? Math.PI / 4 : 0, 0, 0]}>
            <group position={[0, 0, -s]} rotation={[-Math.PI / 2, 0, 0]}>
              {mesh}
            </group>
          </group>
        </group>
      );
    }
    const base = piece.plane === "wallz" ? at(piece.x, piece.y + 0.5, piece.z + 0.5) : at(piece.x + 0.5, piece.y + 0.5, piece.z);
    const yaw = piece.plane === "wallx" ? Math.PI / 2 : 0;
    return (
      <group position={base} rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, -spin * (Math.PI / 2)]}>
          <group position={[0, -s, 0]}>
            <group rotation={[pitched ? Math.PI / 4 : 0, 0, 0]}>
              <group position={[0, s, 0]}>{mesh}</group>
            </group>
          </group>
        </group>
      </group>
    );
  }
  if (piece.plane === "floor") {
    return (
      <group position={at(piece.x, piece.y, piece.z)} rotation={[0, piece.rot * (Math.PI / 2), 0]}>
        <group rotation={[-Math.PI / 2, 0, 0]}>{mesh}</group>
      </group>
    );
  }
  if (piece.plane === "wallz" || piece.plane === "wallx") {
    const drop = piece.shape === "triangle" && piece.rot % 2 === 0 ? (roofReach(piece.shape) - TILE) / 2 : 0;
    const base = piece.plane === "wallz" ? at(piece.x, piece.y + 0.5, piece.z + 0.5) : at(piece.x + 0.5, piece.y + 0.5, piece.z);
    const yaw = piece.plane === "wallx" ? Math.PI / 2 : 0;
    return (
      <group position={base} rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, -piece.rot * (Math.PI / 2)]}>
          <group position={[0, drop, 0]}>{mesh}</group>
        </group>
      </group>
    );
  }
  const alpha = roofAlpha(piece.shape);
  const lift = meshLift(piece.shape);
  const hinge = seat ?? piece.y + 1;
  if (piece.plane === "roofx") {
    return (
      <group position={at(piece.x, hinge, piece.z + 0.5)} rotation={[piece.lean * alpha, 0, 0]}>
        <group position={[0, lift, 0]}>{mesh}</group>
      </group>
    );
  }
  return (
    <group position={at(piece.x + 0.5, hinge, piece.z)} rotation={[0, 0, -piece.lean * alpha]}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <group position={[0, lift, 0]}>{mesh}</group>
      </group>
    </group>
  );
}

function roofReach(shape: Piece["shape"]) {
  return shape === "triangle" ? (TILE * Math.sqrt(3)) / 2 : TILE;
}

function FitCamera({ yaw, pitch, span, zoom = 1 }: { yaw: number; pitch: number; span: number; zoom?: number }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const blend = useRef(0);
  const spin = useRef(0);
  useLayoutEffect(() => {
    if (clock.stage) return;
    const playDist = Math.max(7.3, span * 1.85) / zoom;
    const horiz = Math.cos(pitch) * playDist;
    camera.position.set(Math.sin(yaw) * horiz, Math.sin(pitch) * playDist, Math.cos(yaw) * horiz);
    camera.lookAt(0, 0, 0);
  }, [camera, yaw, pitch, span, zoom]);
  useFrame((_, dt) => {
    if (clock.reduced) blend.current = clock.stage ? 1 : 0;
    else blend.current = THREE.MathUtils.damp(blend.current, clock.stage ? 1 : 0, 4, dt);
    if (!clock.on) {
      blend.current = 0;
      spin.current = 0;
    } else if (clock.spin && !clock.reduced) {
      spin.current += dt * ((Math.PI * 2) / 8);
    }
    const playDist = Math.max(7.3, span * 1.85) / zoom;
    const aspect = size.width / Math.max(1, size.height);
    const vfov = (32 * Math.PI) / 180;
    const stageDist = span / 0.55 / Math.max(0.45, aspect) / (2 * Math.tan(vfov / 2));
    const dist = THREE.MathUtils.lerp(playDist, stageDist, blend.current);
    const lookShift = blend.current * 0.24 * dist * Math.tan(vfov / 2);
    const yawNow = yaw + spin.current;
    const horiz = Math.cos(pitch) * dist;
    camera.position.set(Math.sin(yawNow) * horiz, Math.sin(pitch) * dist, Math.cos(yawNow) * horiz);
    camera.lookAt(0, -lookShift, 0);
  });
  return null;
}

function bounds(pieces: Piece[], family: Piece[] = pieces) {
  if (pieces.length === 0) return { ox: 2, oy: 0.6, oz: 2, span: 4 };
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const piece of pieces) {
    const [x, y, z] = visualCenter(piece, family);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  return {
    ox: (minX + maxX) / 2,
    oy: (minY + maxY) / 2,
    oz: (minZ + maxZ) / 2,
    span: Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1.6) + 1.2,
  };
}

function PreviewScene({ pieces, yaw, pitch, zoom = 1 }: { pieces: Piece[]; yaw: number; pitch: number; zoom?: number }) {
  const box = useMemo(() => bounds(pieces), [pieces]);
  return (
    <>
      <FitCamera yaw={yaw} pitch={pitch} span={box.span} zoom={zoom} />
      {pieces.map((piece, index) => (
        <TileView
          key={`r-${index}-${pieceKey(piece)}`}
          piece={piece}
          ox={box.ox}
          oy={box.oy}
          oz={box.oz}
          seat={roofHingeY(piece, pieces)}
        />
      ))}
    </>
  );
}

function ClearColor() {
  const { gl, scene } = useThree();
  const solid = useMemo(() => new THREE.Color("#e7e4fb"), []);
  useFrame(() => {
    if (clock.on && clock.clear) {
      scene.background = null;
      gl.setClearColor(0x000000, 0);
    } else {
      scene.background = solid;
      gl.setClearColor(solid, 1);
    }
  });
  return null;
}

function Table({ pad, cells, oy }: { pad: number; cells: number; oy: number }) {
  const fade = useRef(1);
  const disc = useRef<THREE.MeshStandardMaterial>(null);
  const grid = useRef<THREE.GridHelper>(null);
  useFrame((_, dt) => {
    const target = clock.on ? clock.floor : 1;
    fade.current = THREE.MathUtils.damp(fade.current, target, target < fade.current ? 14 : 8, dt);
    if (disc.current) {
      disc.current.opacity = fade.current;
      disc.current.transparent = true;
    }
    const helper = grid.current;
    if (helper) {
      const mats = Array.isArray(helper.material) ? helper.material : [helper.material];
      for (const material of mats) {
        material.transparent = true;
        material.opacity = fade.current;
      }
      helper.visible = fade.current > 0.03;
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06 - oy, 0]} raycast={() => null}>
        <circleGeometry args={[pad, 48]} />
        <meshStandardMaterial ref={disc} color="#f6f3ff" transparent />
      </mesh>
      <gridHelper ref={grid} args={[cells, cells, "#ddd6f5", "#efeafc"]} position={[0, -0.05 - oy, 0]} raycast={() => null} />
    </group>
  );
}

function Pedestal({ oy, span }: { oy: number; span: number }) {
  const group = useRef<THREE.Group>(null);
  const rim = useRef<THREE.MeshStandardMaterial>(null);
  const rise = useRef(0);
  const radius = Math.max(1.25, span * 0.46);
  useLayoutEffect(() => {
    if (group.current) {
      group.current.scale.y = 0.001;
      group.current.visible = false;
    }
  }, []);
  useFrame((_, dt) => {
    const target = clock.stage ? 1 : 0;
    rise.current = THREE.MathUtils.damp(rise.current, target, 7, dt);
    if (group.current) {
      group.current.scale.y = Math.max(0.001, rise.current);
      group.current.visible = rise.current > 0.02;
    }
    if (rim.current && clock.pedestal) {
      rim.current.color.set(clock.pedestal);
      rim.current.emissive.set(clock.pedestal);
    }
  });
  return (
    <group ref={group} position={[0, -oy - 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
        <circleGeometry args={[radius * 1.2, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>
      <mesh position={[0, 0.08, 0]} raycast={() => null}>
        <cylinderGeometry args={[radius, radius * 1.05, 0.16, 40]} />
        <meshStandardMaterial ref={rim} color={clock.pedestal} emissive={clock.pedestal} emissiveIntensity={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} raycast={() => null}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, 0.07, 40]} />
        <meshStandardMaterial color="#f6f1e6" roughness={0.5} />
      </mesh>
    </group>
  );
}

function BuildSparkles({ pieces, box }: { pieces: Piece[]; box: { ox: number; oy: number; oz: number } }) {
  const tex = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}celebrate/sparkle.webp`);
  const group = useRef<THREE.Group>(null);
  const alive = useRef<{ sprite: THREE.Sprite; born: number; y: number }[]>([]);
  const seen = useRef(0);
  const nextTwinkle = useRef(0);
  useFrame(() => {
    const root = group.current;
    if (!root) return;
    const now = performance.now();
    if (clock.lit < seen.current) seen.current = clock.lit;
    if (clock.on && clock.lit > seen.current) {
      const target = Math.min(clock.lit, pieces.length);
      const jump = target - seen.current;
      const spawn = jump > 3 ? pieces.filter((_, index) => index % Math.ceil(pieces.length / 4) === 0) : pieces.slice(seen.current, target);
      for (const piece of spawn) {
        const [x, y, z] = visualCenter(piece, pieces);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        sprite.position.set(x - box.ox, y - box.oy + 0.3, z - box.oz);
        sprite.scale.set(0.45, 0.45, 0.45);
        root.add(sprite);
        alive.current.push({ sprite, born: now, y: sprite.position.y });
      }
      seen.current = target;
    }
    if (clock.spin && pieces.length && now > nextTwinkle.current) {
      nextTwinkle.current = now + 2800;
      const piece = pieces[Math.floor(Math.random() * pieces.length)]!;
      const [x, y, z] = visualCenter(piece, pieces);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.position.set(x - box.ox, y - box.oy + 0.35, z - box.oz);
      root.add(sprite);
      alive.current.push({ sprite, born: now, y: sprite.position.y });
    }
    alive.current = alive.current.filter((item) => {
      const t = (now - item.born) / 700;
      if (t >= 1) {
        root.remove(item.sprite);
        item.sprite.material.dispose();
        return false;
      }
      item.sprite.material.opacity = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      item.sprite.position.y = item.y + t * 0.35;
      item.sprite.scale.setScalar(0.35 + t * 0.4);
      return true;
    });
  });
  return <group ref={group} />;
}

function Scene({ yaw, pitch, quiet }: { yaw: number; pitch: number; quiet?: boolean }) {
  const placed = useSnap((s) => s.placed);
  const puzzleId = useSnap((s) => s.puzzleId);
  const selected = useSnap((s) => s.selected);
  const trayShape = useSnap((s) => s.trayShape);
  const trayColor = useSnap((s) => s.trayColor);
  const trayCutout = useSnap((s) => s.trayCutout);
  const trayFacing = useSnap((s) => s.trayFacing);
  const trayRot = useSnap((s) => s.trayRot);
  const held = useSnap((s) => s.held);
  const placeSocket = useSnap((s) => s.placeSocket);
  const placeTarget = useSnap((s) => s.placeTarget);
  const selectPiece = useSnap((s) => s.selectPiece);
  const hintSpot = useSnap((s) => s.hintSpot);
  const puzzle = PUZZLES.find((p) => p.id === puzzleId) ?? null;

  const ghosts = useMemo(() => {
    if (!puzzle || quiet) return [];
    const count = guidanceCount(puzzle.pieces.length, puzzle.id);
    const guided = new Set(puzzle.pieces.slice(0, count).map(pieceKey));
    if (hintSpot) guided.add(hintSpot);
    return puzzle.pieces.filter((target) => guided.has(pieceKey(target)) && !placed.some((have) => samePiece(have, target)));
  }, [puzzle, placed, quiet, hintSpot]);

  const silent = useMemo(() => {
    if (!puzzle || quiet || !held) return [];
    const shown = new Set(ghosts.map(pieceKey));
    return puzzle.pieces.filter(
      (target) => sameKind(held, target) && !shown.has(pieceKey(target)) && !placed.some((have) => samePiece(have, target)),
    );
  }, [puzzle, placed, quiet, held, ghosts]);

  const pads = useMemo(() => {
    if (puzzle || quiet) return [];
    const shape = trayShape === "right" ? "square" : trayShape;
    const cutout = shape === "square" ? trayCutout : "none";
    const raw =
      placed.length === 0
        ? trayFacing === "roof"
          ? []
          : [
              trayFacing === "wall"
                ? { shape, color: trayColor, cutout, rot: 0 as const, plane: "wallz" as const, lean: 1 as const, x: 2, y: 0, z: 2 }
                : { shape, color: trayColor, cutout: "none" as const, rot: 0 as const, plane: "floor" as const, lean: 1 as const, x: 2, y: 0, z: 2 },
            ]
        : sockets(placed, shape, trayColor, cutout);
    const open = raw
      .filter((piece) => {
        if (trayFacing === "roof") return facingOf(piece.plane) === "roof";
        return facingOf(piece.plane) === trayFacing;
      })
      .map((piece) => {
        const lid = piece.plane === "floor" && piece.y > 0;
        return { ...piece, shape: lid ? "square" as const : piece.shape, cutout: lid ? "none" as const : cutout, rot: trayFacing === "roof" && !lid ? 0 as const : trayRot };
      });
    return pickPads(open, placed, trayFacing);
  }, [puzzle, placed, trayShape, trayColor, trayCutout, trayFacing, trayRot, quiet]);

  const family = puzzle ? puzzle.pieces : placed;
  const shown = useMemo(() => [...placed, ...ghosts, ...pads], [placed, ghosts, pads]);
  const framed = puzzle ? puzzle.pieces : shown;
  const box = useMemo(() => bounds(framed, family), [framed, family]);
  const pad = Math.max(4.2, box.span * 0.75);
  const grid = Math.max(6, Math.ceil(pad * 1.5));

  return (
    <>
      <FitCamera yaw={yaw} pitch={pitch} span={box.span} />
      <Table pad={pad} cells={grid} oy={box.oy} />
      <Pedestal oy={box.oy} span={box.span} />
      <BuildSparkles pieces={placed} box={box} />
      {pads.map((piece) => (
        <TileView
          key={`s-${pieceKey(piece)}`}
          piece={piece}
          ox={box.ox}
          oy={box.oy}
          oz={box.oz}
          ghost
          bright
          seat={roofHingeY(piece, family)}
          onPick={() => placeSocket(piece)}
        />
      ))}
      {ghosts.map((piece) => (
        <TileView
          key={`g-${pieceKey(piece)}`}
          piece={piece}
          ox={box.ox}
          oy={box.oy}
          oz={box.oz}
          ghost
          guide
          seat={roofHingeY(piece, family)}
          bright={Boolean(held && sameKind(held, piece))}
          onPick={() => placeTarget(piece)}
        />
      ))}
      {silent.map((piece) => (
        <TileView
          key={`q-${pieceKey(piece)}`}
          piece={piece}
          ox={box.ox}
          oy={box.oy}
          oz={box.oz}
          ghost
          hidden
          seat={roofHingeY(piece, family)}
          onPick={() => placeTarget(piece)}
        />
      ))}
      {placed.map((piece, index) => (
        <TileView
          key={`p-${index}-${pieceKey(piece)}`}
          piece={piece}
          ox={box.ox}
          oy={box.oy}
          oz={box.oz}
          seat={roofHingeY(piece, family)}
          selected={selected === index}
          arrive={index === placed.length - 1}
          order={index}
          onPick={puzzle ? undefined : () => selectPiece(index)}
        />
      ))}
    </>
  );
}

export function TileCanvas({ yaw, pitch, preview, quiet, zoom = 1 }: { yaw: number; pitch: number; preview?: Piece[]; quiet?: boolean; zoom?: number }) {
  return (
    <Canvas camera={{ position: [4.2, 3.2, 4.2], fov: 32, near: 0.1, far: 80 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ClearColor />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#fff4ea", "#c9d4f5", 0.55]} />
      <directionalLight position={[4, 8, 3]} intensity={1.25} />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} />
      {preview ? <PreviewScene pieces={preview} yaw={yaw} pitch={pitch} zoom={zoom} /> : <Scene yaw={yaw} pitch={pitch} quiet={quiet} />}
    </Canvas>
  );
}
