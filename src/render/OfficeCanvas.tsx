'use client';

import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { GameState, RoleId } from '@/game';
import {
  deskSlot,
  depthZ,
  isoToScreen,
  seatOffset,
  TILE_SPRITE_H,
  TILE_W,
} from '@/render/iso';

const CHAR_ROLES: RoleId[] = [
  'sales',
  'dev',
  'designer',
  'hr',
  'recruiter',
  'marketer',
  'lead_gen',
  'team_lead',
  'accountant',
];

type FrameKind = 'idle' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'work0' | 'work1';

const ASSET_V = '22';

/** Pixel height of drawn back walls. */
const WALL_H = 40;
const WALL_N = 0x1c2c3e;
const WALL_W = 0x152434;
const WALL_TOP = 0x7ec4d8;
const WALL_BASE = 0x4a7a92;
const WALL_WIN = 0x8ec8e0;

function charUrl(role: RoleId, kind: FrameKind): string {
  return `/assets/chars/${role}_${kind}_sm.png?v=${ASSET_V}`;
}

function fallbackRole(role: RoleId): RoleId {
  if (CHAR_ROLES.includes(role)) return role;
  return 'dev';
}

function sceneKey(state: GameState): string {
  return state.rooms
    .map(
      (r) =>
        `${r.id}:${r.desks.map((d) => d.employeeId ?? '-').join(',')}`,
    )
    .join('|');
}

/**
 * Extrude an isometric wall face upward from a base edge on the floor.
 * Base runs along a room perimeter; top gets a cyan cap like the prototype art.
 */
function drawWallFace(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: number,
  windows: boolean,
) {
  g.poly([
    { x: x0, y: y0 },
    { x: x1, y: y1 },
    { x: x1, y: y1 - WALL_H },
    { x: x0, y: y0 - WALL_H },
  ]);
  g.fill({ color: fill });

  // Top rail
  g.moveTo(x0, y0 - WALL_H);
  g.lineTo(x1, y1 - WALL_H);
  g.stroke({ width: 2.5, color: WALL_TOP });

  // Base rail (sits on floor edge)
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke({ width: 1.5, color: WALL_BASE });

  if (!windows) return;

  const segs = 4;
  for (let i = 0; i < segs; i++) {
    if (i % 2 === 0) continue;
    const t0 = (i + 0.25) / segs;
    const t1 = (i + 0.75) / segs;
    const ax = x0 + (x1 - x0) * t0;
    const ay = y0 + (y1 - y0) * t0;
    const bx = x0 + (x1 - x0) * t1;
    const by = y0 + (y1 - y0) * t1;
    const top = 10;
    const bot = 18;
    g.poly([
      { x: ax, y: ay - WALL_H + top },
      { x: bx, y: by - WALL_H + top },
      { x: bx, y: by - WALL_H + bot },
      { x: ax, y: ay - WALL_H + bot },
    ]);
    g.fill({ color: WALL_WIN, alpha: 0.55 });
  }
}

/** Back walls grounded on the north + west floor perimeter (prototype layout). */
function buildRoomWalls(ox: number, oy: number, grid: number): Graphics {
  const g = new Graphics();
  // Grid corners just outside the floor diamond — coincides with tile tips
  const corner = isoToScreen(ox - 0.5, oy - 0.5);
  const northEnd = isoToScreen(ox + grid - 0.5, oy - 0.5);
  const westEnd = isoToScreen(ox - 0.5, oy + grid - 0.5);

  // Pull base 1px onto the floor so the rail kisses the tile edge
  const lift = 1;
  drawWallFace(
    g,
    corner.x,
    corner.y + lift,
    northEnd.x,
    northEnd.y + lift,
    WALL_N,
    true,
  );
  drawWallFace(
    g,
    corner.x,
    corner.y + lift,
    westEnd.x,
    westEnd.y + lift,
    WALL_W,
    false,
  );
  g.roundPixels = true;
  return g;
}

export function OfficeCanvas({ state }: { state: GameState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const texturesRef = useRef<Record<string, Texture>>({});
  const animRef = useRef(0);
  const stateRef = useRef(state);
  const keyRef = useRef('');
  const readyRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    let destroyed = false;
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    appRef.current = app;

    (async () => {
      try {
        await app.init({
          background: '#0a141e',
          antialias: false,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          resizeTo: host,
        });
      } catch (err) {
        console.error('Pixi init failed', err);
        return;
      }
      if (destroyed) {
        app.destroy(true);
        return;
      }
      while (host.firstChild) host.removeChild(host.firstChild);
      host.appendChild(app.canvas);

      const urls = [
        `/assets/tiles/tile_t1_sm.png?v=${ASSET_V}`,
        `/assets/furniture/desk_sm.png?v=${ASSET_V}`,
        `/assets/furniture/plant_sm.png?v=${ASSET_V}`,
        `/assets/furniture/coffee_sm.png?v=${ASSET_V}`,
        ...CHAR_ROLES.flatMap((role) =>
          (['idle', 'walk0', 'walk1', 'walk2', 'walk3', 'work0', 'work1'] as FrameKind[]).map(
            (k) => charUrl(role, k),
          ),
        ),
      ];

      const textures: Record<string, Texture> = {};
      await Promise.all(
        urls.map(async (url) => {
          try {
            const tex = await Assets.load(url);
            if (tex?.source) {
              tex.source.scaleMode = 'nearest';
              tex.source.autoGenerateMipmaps = false;
            }
            textures[url] = tex;
          } catch {
            /* missing frame */
          }
        }),
      );
      if (destroyed) return;
      texturesRef.current = textures;

      const world = new Container();
      worldRef.current = world;
      app.stage.addChild(world);
      readyRef.current = true;
      keyRef.current = '';

      app.ticker.add(() => {
        if (!readyRef.current || !worldRef.current) return;
        animRef.current += 0.08;
        const s = stateRef.current;
        const key = sceneKey(s);
        const rebuild = key !== keyRef.current;
        if (rebuild) keyRef.current = key;
        paint(
          worldRef.current,
          texturesRef.current,
          s,
          animRef.current,
          app.screen.width,
          app.screen.height,
          rebuild,
        );
      });
    })();

    return () => {
      destroyed = true;
      readyRef.current = false;
      try {
        appRef.current?.destroy(true, { children: true });
      } catch {
        /* already destroyed */
      }
      appRef.current = null;
      worldRef.current = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 320,
        borderRadius: 2,
        overflow: 'hidden',
        imageRendering: 'pixelated',
      }}
    />
  );
}

type CharNode = { sprite: Sprite; empId: string; role: RoleId; deskIndex: number };

const runtimeChars = new WeakMap<Container, CharNode[]>();

function paint(
  world: Container,
  textures: Record<string, Texture>,
  state: GameState,
  anim: number,
  viewW: number,
  viewH: number,
  rebuild: boolean,
) {
  if (rebuild) {
    world.removeChildren();
    runtimeChars.set(world, []);

    const v = ASSET_V;
    const floorTex = textures[`/assets/tiles/tile_t1_sm.png?v=${v}`];
    const deskTex = textures[`/assets/furniture/desk_sm.png?v=${v}`];
    const plantTex = textures[`/assets/furniture/plant_sm.png?v=${v}`];
    const coffeeTex = textures[`/assets/furniture/coffee_sm.png?v=${v}`];

    // Walls → floor → furniture (sorted) → characters (always above furniture).
    // Characters must not share a sort bucket with desks: a neighbor desk with
    // higher gx+gy otherwise paints over people at the previous pod.
    const wallLayer = new Container();
    const floorLayer = new Container();
    const propLayer = new Container();
    const spriteLayer = new Container();
    world.addChild(wallLayer, floorLayer, propLayer, spriteLayer);

    type DrawItem = { z: number; node: Sprite };
    const props: DrawItem[] = [];
    const chars: CharNode[] = [];
    const roomGapX = 14;
    // Anchor on the top-face center so the thick tile side hangs downward
    const floorAnchorY = 10 / TILE_SPRITE_H;

    state.rooms.forEach((room, roomIndex) => {
      const ox = roomIndex * roomGapX;
      const oy = 0;
      const grid = 8 + Math.min(4, Math.floor(room.desks.length / 3));

      wallLayer.addChild(buildRoomWalls(ox, oy, grid));

      if (floorTex) {
        for (let y = 0; y < grid; y++) {
          for (let x = 0; x < grid; x++) {
            const { x: sx, y: sy } = isoToScreen(ox + x, oy + y);
            const spr = new Sprite(floorTex);
            spr.anchor.set(0.5, floorAnchorY);
            spr.width = TILE_W;
            spr.height = TILE_SPRITE_H;
            spr.x = sx;
            spr.y = sy;
            spr.roundPixels = true;
            spr.zIndex = depthZ(ox + x, oy + y);
            floorLayer.addChild(spr);
          }
        }
      }

      room.desks.forEach((desk, di) => {
        const slot = deskSlot(di);
        const gx = ox + slot.gx;
        const gy = oy + slot.gy;
        const screen = isoToScreen(gx, gy);

        if (deskTex) {
          const deskSpr = new Sprite(deskTex);
          deskSpr.anchor.set(0.5, 0.82);
          deskSpr.x = screen.x;
          deskSpr.y = screen.y + 4;
          const deskH = 52;
          if (deskSpr.texture.height > 0) {
            deskSpr.scale.set(deskH / deskSpr.texture.height);
          }
          deskSpr.roundPixels = true;
          // Depth at the desk front edge so the top doesn't bury the sitter
          props.push({ z: depthZ(gx + 0.2, gy + 0.55, 1), node: deskSpr });
        }

        const emp = state.employees.find((e) => e.id === desk.employeeId);
        if (emp) {
          const seat = seatOffset(gx, gy);
          const seatScreen = isoToScreen(seat.gx, seat.gy);
          const role = fallbackRole(emp.role);
          const tex =
            textures[charUrl(role, 'idle')] ?? textures[charUrl('dev', 'idle')];
          if (tex) {
            const char = new Sprite(tex);
            char.anchor.set(0.5, 1);
            char.x = seatScreen.x;
            char.y = seatScreen.y + 2;
            char.scale.set(0.92);
            char.roundPixels = true;
            const meta: CharNode = {
              sprite: char,
              empId: emp.id,
              role,
              deskIndex: di,
            };
            chars.push(meta);
            spriteLayer.addChild(char);
          }
        }
      });

      if (roomIndex === 0) {
        if (plantTex) {
          const pgx = ox + grid - 1.4;
          const pgy = oy + 1.4;
          const p = isoToScreen(pgx, pgy);
          const plant = new Sprite(plantTex);
          plant.anchor.set(0.5, 1);
          plant.x = p.x;
          plant.y = p.y;
          if (plant.texture.height > 0) {
            plant.scale.set(48 / plant.texture.height);
          }
          plant.roundPixels = true;
          props.push({ z: depthZ(pgx, pgy, 2), node: plant });
        }
        if (coffeeTex) {
          const cgx = ox + 1.2;
          const cgy = oy + grid - 2.2;
          const p = isoToScreen(cgx, cgy);
          const coffee = new Sprite(coffeeTex);
          coffee.anchor.set(0.5, 1);
          coffee.x = p.x;
          coffee.y = p.y;
          if (coffee.texture.height > 0) {
            coffee.scale.set(56 / coffee.texture.height);
          }
          coffee.roundPixels = true;
          props.push({ z: depthZ(cgx, cgy, 2), node: coffee });
        }
      }
    });

    floorLayer.sortableChildren = true;
    props.sort((a, b) => a.z - b.z);
    for (const it of props) propLayer.addChild(it.node);
    runtimeChars.set(world, chars);

    const bounds = world.getLocalBounds();
    if (bounds.width > 0 && bounds.height > 0) {
      world.x = viewW / 2 - (bounds.x + bounds.width / 2);
      world.y = Math.max(24, viewH / 2 - (bounds.y + bounds.height / 2) - 20);
    }
  }

  const chars = runtimeChars.get(world) ?? [];
  for (const c of chars) {
    const emp = state.employees.find((e) => e.id === c.empId);
    if (!emp) continue;
    let kind: FrameKind = 'idle';
    if (emp.status === 'working') {
      kind = Math.floor(anim) % 2 === 0 ? 'work0' : 'work1';
    } else {
      const phase = Math.floor(anim + c.deskIndex) % 8;
      if (phase < 4) {
        kind = (['walk0', 'walk1', 'walk2', 'walk3'] as const)[phase]!;
      }
    }
    const tex =
      textures[charUrl(c.role, kind)] ??
      textures[charUrl(c.role, 'idle')] ??
      textures[charUrl('dev', 'idle')];
    if (tex && c.sprite.texture !== tex) c.sprite.texture = tex;
  }
}
