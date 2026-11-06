import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
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
  onPick,
}: {
  piece: Piece;
  ghost?: boolean;
  bright?: boolean;
  guide?: boolean;
  hidden?: boolean;
  selected?: boolean;
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
  return (
    <group>
      <mesh
        geometry={geo}
        onClick={
          onPick
            ? (event) => {
                event.stopPropagation();
                if (orbitLock.moved) return;
                onPick();
              }
            : undefined
        }
      >
        <meshPhysicalMaterial
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
  onPick?: () => void;
  seat?: number;
}) {
  const mesh = <TileMesh piece={piece} ghost={ghost} bright={bright} guide={guide} hidden={hidden} selected={selected} onPick={onPick} />;
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

function FitCamera({ yaw, pitch, span }: { yaw: number; pitch: number; span: number }) {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    const distance = Math.max(8.6, span * 2.15);
    const horiz = Math.cos(pitch) * distance;
    camera.position.set(Math.sin(yaw) * horiz, Math.sin(pitch) * distance, Math.cos(yaw) * horiz);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, yaw, pitch, span]);
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

function PreviewScene({ pieces, yaw, pitch }: { pieces: Piece[]; yaw: number; pitch: number }) {
  const box = useMemo(() => bounds(pieces), [pieces]);
  return (
    <>
      <FitCamera yaw={yaw} pitch={pitch} span={box.span} />
      {pieces.map((piece, index) => (
        <TileView key={`r-${index}-${pieceKey(piece)}`} piece={piece} ox={box.ox} oy={box.oy} oz={box.oz} seat={roofHingeY(piece, pieces)} />
      ))}
    </>
  );
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
  const box = useMemo(() => bounds(shown, family), [shown, family]);

  return (
    <>
      <FitCamera yaw={yaw} pitch={pitch} span={box.span} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2 - box.ox, -0.06 - box.oy, 2 - box.oz]} raycast={() => null}>
        <circleGeometry args={[4.2, 40]} />
        <meshStandardMaterial color="#f6f3ff" />
      </mesh>
      <gridHelper args={[6, 6, "#ddd6f5", "#efeafc"]} position={[2 - box.ox, -0.05 - box.oy, 2 - box.oz]} raycast={() => null} />
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
          onPick={puzzle ? undefined : () => selectPiece(index)}
        />
      ))}
    </>
  );
}

export function TileCanvas({ yaw, pitch, preview, quiet }: { yaw: number; pitch: number; preview?: Piece[]; quiet?: boolean }) {
  return (
    <Canvas camera={{ position: [4.2, 3.2, 4.2], fov: 32, near: 0.1, far: 80 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#e7e4fb"]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#fff4ea", "#c9d4f5", 0.55]} />
      <directionalLight position={[4, 8, 3]} intensity={1.25} />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} />
      {preview ? <PreviewScene pieces={preview} yaw={yaw} pitch={pitch} /> : <Scene yaw={yaw} pitch={pitch} quiet={quiet} />}
    </Canvas>
  );
}
