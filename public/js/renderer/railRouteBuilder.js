// Project Meiji - Rail Graph Discovery, Branch/Loop Ordering, Spline Smoothing & Arc-Length Sampling

import { CONFIG } from '../config.js';

const RAIL_ORTHO_DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
];

function isRailTile(t) {
    return Boolean(t && (t.type === CONFIG.TYPES.RAIL ||
        (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT)));
}

export function isDepotTile(t) {
    return Boolean(t && t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT);
}

export function evaluateBezier(p0, p1, p2, t) {
    const inv = 1 - t;
    return {
        x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
        z: inv * inv * p0.z + 2 * inv * t * p1.z + t * t * p2.z
    };
}

export function evaluateBezierTangent(p0, p1, p2, t) {
    const inv = 1 - t;
    return {
        x: 2 * inv * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
        z: 2 * inv * (p1.z - p0.z) + 2 * t * (p2.z - p1.z)
    };
}

export function findRailNetworks(grid) {
    const visited = new Set();
    const networks = [];
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const key = `${x},${y}`;
            if (visited.has(key) || !isRailTile(grid.getTile(x, y))) continue;

            const component = [];
            const queue = [{ x, y }];
            visited.add(key);
            let head = 0;
            while (head < queue.length) {
                const curr = queue[head++];
                component.push(curr);
                for (const d of RAIL_ORTHO_DIRS) {
                    const nx = curr.x + d.dx;
                    const ny = curr.y + d.dy;
                    const nKey = `${nx},${ny}`;
                    if (!visited.has(nKey) && isRailTile(grid.getTile(nx, ny))) {
                        visited.add(nKey);
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
            if (component.length >= 2) networks.push(component);
        }
    }
    return networks;
}

export function computeNetworkSignature(network) {
    return network.map(t => `${t.x},${t.y}`).sort().join('|');
}

function orderNetworkTiles(networkTiles, grid) {
    if (!networkTiles || networkTiles.length < 2) return null;
    const tileSet = new Set(networkTiles.map(t => `${t.x},${t.y}`));
    const getAdj = (t) => {
        const list = [];
        for (const d of RAIL_ORTHO_DIRS) {
            if (tileSet.has(`${t.x + d.dx},${t.y + d.dy}`)) {
                list.push({ x: t.x + d.dx, y: t.y + d.dy });
            }
        }
        return list;
    };

    const terminals = [];
    let hasJunction = false;
    for (const t of networkTiles) {
        const deg = getAdj(t).length;
        if (deg === 1) terminals.push(t);
        if (deg >= 3) hasJunction = true;
    }

    // Closed pure loop (all degree === 2)
    if (!hasJunction && terminals.length === 0) {
        const start = networkTiles.find(t => isDepotTile(grid.getTile(t.x, t.y))) || networkTiles[0];
        const ordered = [start];
        const seen = new Set([`${start.x},${start.y}`]);
        let curr = start;
        while (ordered.length < networkTiles.length) {
            const next = getAdj(curr).find(n => !seen.has(`${n.x},${n.y}`));
            if (!next) break;
            seen.add(`${next.x},${next.y}`);
            ordered.push(next);
            curr = next;
        }
        return { tiles: ordered, isLoop: ordered.length >= 4 };
    }

    const start = terminals[0] || networkTiles.find(t => isDepotTile(grid.getTile(t.x, t.y))) || networkTiles[0];
    if (!hasJunction) {
        const ordered = [start];
        const seen = new Set([`${start.x},${start.y}`]);
        let curr = start;
        while (true) {
            const next = getAdj(curr).find(n => !seen.has(`${n.x},${n.y}`));
            if (!next) break;
            seen.add(`${next.x},${next.y}`);
            ordered.push(next);
            curr = next;
        }
        return { tiles: ordered, isLoop: false };
    }

    // Adjacency-strict DFS covering every connected branch without off-track shortcuts
    const ordered = [start];
    const visited = new Set([`${start.x},${start.y}`]);
    const dfs = (curr, prevDir) => {
        const neighbors = getAdj(curr).sort((a, b) => {
            if (!prevDir) return 0;
            const dotA = (a.x - curr.x) * prevDir.x + (a.y - curr.y) * prevDir.y;
            const dotB = (b.x - curr.x) * prevDir.x + (b.y - curr.y) * prevDir.y;
            return dotB - dotA;
        });
        for (const n of neighbors) {
            const nKey = `${n.x},${n.y}`;
            if (visited.has(nKey)) continue;
            visited.add(nKey);
            ordered.push(n);
            dfs(n, { x: n.x - curr.x, y: n.y - curr.y });
            if (visited.size < networkTiles.length) ordered.push(curr);
        }
    };
    dfs(start, null);
    return { tiles: ordered, isLoop: false };
}

function computeRouteMetrics(waypoints, isLoop) {
    const count = waypoints.length;
    const segCount = isLoop ? count : count - 1;
    const cumDist = new Array(segCount + 1).fill(0);
    const segLens = new Array(segCount).fill(0);
    for (let i = 0; i < segCount; i++) {
        const a = waypoints[i];
        const b = waypoints[(i + 1) % count];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        segLens[i] = len;
        cumDist[i + 1] = cumDist[i] + len;
    }
    return { waypoints, isLoop, segCount, cumDist, segLens, totalLen: cumDist[segCount] };
}

export function buildRailRouteData(networkTiles, grid, getTileWorldPos) {
    const orderedInfo = orderNetworkTiles(networkTiles, grid);
    if (!orderedInfo || orderedInfo.tiles.length < 2) return null;

    const { tiles, isLoop } = orderedInfo;
    const n = tiles.length;
    const waypoints = [];
    const pushWp = (x, z, depot, depotCoord) => {
        const last = waypoints[waypoints.length - 1];
        if (last && Math.hypot(last.x - x, last.z - z) < 0.005) {
            if (depot) {
                last.isDepot = true;
                last.depotCoord = depotCoord;
            }
            return;
        }
        waypoints.push({ x, y: 0.065, z, isDepot: depot, depotCoord: depot ? depotCoord : null });
    };

    for (let i = 0; i < n; i++) {
        const curr = tiles[i];
        const center = getTileWorldPos(curr.x, curr.y);
        const depot = isDepotTile(grid.getTile(curr.x, curr.y));
        const depotCoord = depot ? { x: curr.x, y: curr.y } : null;
        const prev = isLoop ? tiles[(i - 1 + n) % n] : (i > 0 ? tiles[i - 1] : null);
        const next = isLoop ? tiles[(i + 1) % n] : (i < n - 1 ? tiles[i + 1] : null);

        if (!prev || !next) {
            pushWp(center.x, center.z, depot, depotCoord);
            continue;
        }

        const dirIn = { x: Math.sign(curr.x - prev.x), y: Math.sign(curr.y - prev.y) };
        const dirOut = { x: Math.sign(next.x - curr.x), y: Math.sign(next.y - curr.y) };
        const isStraight = dirIn.x === dirOut.x && dirIn.y === dirOut.y;
        const isUTurn = dirIn.x === -dirOut.x && dirIn.y === -dirOut.y;

        if (isStraight || isUTurn || (Math.abs(dirIn.x) + Math.abs(dirIn.y) !== 1) || (Math.abs(dirOut.x) + Math.abs(dirOut.y) !== 1)) {
            pushWp(center.x, center.z, depot, depotCoord);
        } else {
            const off = 0.52;
            const p0 = { x: center.x - dirIn.x * off, z: center.z - dirIn.y * off };
            const p1 = { x: center.x, z: center.z };
            const p2 = { x: center.x + dirOut.x * off, z: center.z + dirOut.y * off };
            for (let step = 0; step <= 4; step++) {
                const pt = evaluateBezier(p0, p1, p2, step / 4);
                pushWp(pt.x, pt.z, depot && step === 2, depotCoord);
            }
        }
    }

    if (waypoints.length < 2) return null;
    return {
        waypoints,
        isLoop,
        metrics: computeRouteMetrics(waypoints, isLoop),
        networkSignature: computeNetworkSignature(networkTiles),
        networkTileKeys: new Set(networkTiles.map(t => `${t.x},${t.y}`))
    };
}

export function sampleRouteAtDistance(metrics, s) {
    const { waypoints, isLoop, segCount, cumDist, segLens, totalLen } = metrics;
    if (totalLen <= 0.001) {
        const w0 = waypoints[0];
        return { x: w0.x, y: w0.y, z: w0.z, dirX: 0, dirZ: -1, wpIdx: 0, progress: 0 };
    }
    const d = isLoop ? ((s % totalLen) + totalLen) % totalLen : Math.max(0, Math.min(totalLen, s));
    let idx = 0;
    while (idx < segCount - 1 && cumDist[idx + 1] < d) idx++;
    const len = segLens[idx];
    const t = len > 0.0001 ? Math.max(0, Math.min(1, (d - cumDist[idx]) / len)) : 0;
    const a = waypoints[idx];
    const b = waypoints[(idx + 1) % waypoints.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const norm = Math.hypot(dx, dz) || 1;
    return { x: a.x + dx * t, y: a.y, z: a.z + dz * t, dirX: dx / norm, dirZ: dz / norm, wpIdx: idx, progress: t };
}

export function projectPositionOntoRoute(wx, wz, metrics, dirHint = null) {
    const { waypoints, segCount, cumDist } = metrics;
    let best = { s: 0, wpIdx: 0, progress: 0, dist: Infinity, score: Infinity };
    for (let i = 0; i < segCount; i++) {
        const a = waypoints[i];
        const b = waypoints[(i + 1) % waypoints.length];
        const vx = b.x - a.x;
        const vz = b.z - a.z;
        const lenSq = vx * vx + vz * vz;
        const len = Math.sqrt(lenSq);
        const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((wx - a.x) * vx + (wz - a.z) * vz) / lenSq)) : 0;
        const px = a.x + vx * t;
        const pz = a.z + vz * t;
        const dist = Math.hypot(wx - px, wz - pz);
        let penalty = 0;
        if (dirHint && len > 0.001 && ((vx / len) * dirHint.x + (vz / len) * dirHint.z) < -0.2) {
            penalty = 1.5;
        }
        const score = dist + penalty;
        if (score < best.score) best = { s: cumDist[i] + len * t, wpIdx: i, progress: t, dist, score };
    }
    return best;
}
