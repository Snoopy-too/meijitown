// Pure & stateful lateral lane-keeping and collision-avoidance steering for street agents
const AGENT_PROFILES = {
    fire_cart: { radius: 0.27, maxLateral: 0.35, baseOffset: 0.0, minSpeedFactor: 0.85 },
    rickshaw: { radius: 0.25, maxLateral: 0.35, baseOffset: -0.12, minSpeedFactor: 0.55 },
    pedestrian: { radius: 0.16, maxLateral: 0.46, baseOffset: -0.30, minSpeedFactor: 0.45 }
};

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function getProfile(kind) {
    return AGENT_PROFILES[kind] || AGENT_PROFILES.pedestrian;
}

// Initialize per-agent steering state along initial road segment
export function initAgentSteering(agent, kind) {
    const profile = getProfile(kind);
    const p0 = agent.waypoints?.[0];
    const p1 = agent.waypoints?.[1];
    let fx = 0, fz = 1;
    if (p0 && p1) {
        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        const len = Math.hypot(dx, dz);
        if (len > 0.001) {
            fx = dx / len;
            fz = dz / len;
        }
    }
    const baseOffset = kind === 'pedestrian'
        ? -(0.27 + Math.random() * 0.07)
        : profile.baseOffset;

    agent.kind = kind;
    agent.baseOffset = baseOffset;
    agent.lateralOffset = baseOffset;
    agent.curFwdX = fx;
    agent.curFwdZ = fz;
    agent.avoidSide = 0;
    agent.avoidTimer = 0;
    agent.speedFactor = 1.0;

    if (agent.mesh?.position) {
        const rx = -fz;
        const rz = fx;
        agent.mesh.position.x += rx * baseOffset;
        agent.mesh.position.z += rz * baseOffset;
        agent.mesh.rotation.y = Math.atan2(fx, fz);
    }
}

// Collect lightweight spatial snapshots of all moving street agents for this frame
export function buildActiveAgentSnapshots(dispatchedCarts, ambientAgents) {
    const snapshots = [];
    const pushList = (list) => {
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (!a || a.isFinished || !a.mesh?.position) continue;
            const profile = getProfile(a.kind);
            snapshots.push({
                agent: a,
                kind: a.kind || 'pedestrian',
                x: a.mesh.position.x,
                z: a.mesh.position.z,
                fwdX: a.curFwdX ?? 0,
                fwdZ: a.curFwdZ ?? 1,
                speed: a.speed || 1.3,
                radius: profile.radius,
                maxLateral: profile.maxLateral
            });
        }
    };
    pushList(dispatchedCarts);
    pushList(ambientAgents);
    return snapshots;
}

// Compute desired lateral lane offset and speed modulation against nearby agents
function computeAvoidanceTarget(agent, profile, posX, posZ, fwdX, fwdZ, snapshots, delta) {
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const lookAhead = agent.kind === 'pedestrian' ? 2.2 : 3.2;

    let strongestThreat = 0;
    let desiredSide = 0;
    let minSpeedFactor = 1.0;

    for (let i = 0; i < snapshots.length; i++) {
        const other = snapshots[i];
        if (other.agent === agent) continue;

        const dx = other.x - posX;
        const dz = other.z - posZ;
        const fwdDist = dx * fwdX + dz * fwdZ;
        const latDist = dx * rightX + dz * rightZ;
        const sameDir = (fwdX * other.fwdX + fwdZ * other.fwdZ) > 0.2;
        const reqClear = profile.radius + other.radius + 0.16;

        // Faster cart approaching from behind: slower pedestrian steps left onto shoulder
        if (sameDir && other.speed > (agent.speed || 1.3) + 0.35 && fwdDist < 0.2 && fwdDist > -2.4) {
            if (Math.abs(latDist) < reqClear + 0.22) {
                const threat = (2.4 + fwdDist) / 2.4;
                if (threat > strongestThreat) {
                    strongestThreat = threat;
                    desiredSide = -1;
                }
            }
            continue;
        }

        if (fwdDist < -0.35 || fwdDist > lookAhead) continue;
        if (Math.abs(latDist) > reqClear + 0.30) continue;

        const proximity = 1.0 - Math.max(0, fwdDist) / lookAhead;
        if (proximity > strongestThreat) {
            strongestThreat = proximity;
            if (sameDir) {
                // Carts overtake slower traffic on the right unless other is already hugging right edge
                const otherLat = other.agent.lateralOffset ?? 0;
                if ((agent.speed || 1.3) > other.speed + 0.2) {
                    desiredSide = otherLat > 0.14 ? -1 : 1;
                } else {
                    desiredSide = otherLat >= 0 ? -1 : 1;
                }
            } else {
                // Oncoming traffic keeps left (-1 in own heading frame), or steps opposite other
                desiredSide = latDist < -0.10 ? 1 : -1;
            }
        }

        // Slow gently while squeezing past very close blocking agent
        if (fwdDist > 0.05 && fwdDist < 1.05 && Math.abs(latDist) < profile.radius + other.radius + 0.08) {
            minSpeedFactor = Math.min(minSpeedFactor, profile.minSpeedFactor);
        }
    }

    if (strongestThreat > 0.05) {
        if (agent.avoidTimer <= 0 || agent.avoidSide === 0) {
            agent.avoidSide = desiredSide;
        }
        agent.avoidTimer = 0.45;
    } else {
        agent.avoidTimer = Math.max(0, (agent.avoidTimer || 0) - delta);
        if (agent.avoidTimer <= 0) agent.avoidSide = 0;
    }

    agent.speedFactor += (minSpeedFactor - (agent.speedFactor ?? 1.0)) * Math.min(1, delta * 8);

    const sideShift = agent.avoidSide !== 0
        ? agent.avoidSide * (profile.maxLateral * Math.max(0.55, strongestThreat))
        : 0;
    const rawTarget = (agent.baseOffset ?? 0) + sideShift;
    return clamp(rawTarget, -profile.maxLateral, profile.maxLateral);
}

// Advance one agent along waypoints with smooth corner heading, lateral steering, and deck grounding
export function stepAgentNavigation(agent, snapshots, speedMult, delta, getSurfacePose) {
    const from = agent.waypoints[agent.waypointIndex];
    const to = agent.waypoints[agent.waypointIndex + 1];
    if (!from || !to) return 'arrived';

    const segDX = to.x - from.x;
    const segDZ = to.z - from.z;
    const dist = Math.hypot(segDX, segDZ);
    const invDist = dist > 0.001 ? 1 / dist : 1;
    const segFwdX = dist > 0.001 ? segDX * invDist : (agent.curFwdX ?? 0);
    const segFwdZ = dist > 0.001 ? segDZ * invDist : (agent.curFwdZ ?? 1);

    // Smooth forward heading across 90-degree road turns (snap safely on 180-degree reversal)
    const dot = (agent.curFwdX ?? segFwdX) * segFwdX + (agent.curFwdZ ?? segFwdZ) * segFwdZ;
    if (dot < -0.9) {
        agent.curFwdX = segFwdX;
        agent.curFwdZ = segFwdZ;
    } else {
        const turnRate = Math.min(1, delta * 10 * Math.max(0.5, speedMult));
        const nx = (agent.curFwdX ?? segFwdX) + (segFwdX - (agent.curFwdX ?? segFwdX)) * turnRate;
        const nz = (agent.curFwdZ ?? segFwdZ) + (segFwdZ - (agent.curFwdZ ?? segFwdZ)) * turnRate;
        const nLen = Math.hypot(nx, nz);
        if (nLen > 0.001) {
            agent.curFwdX = nx / nLen;
            agent.curFwdZ = nz / nLen;
        }
    }

    const profile = getProfile(agent.kind);
    const curX = agent.mesh.position.x;
    const curZ = agent.mesh.position.z;
    const targetOffset = computeAvoidanceTarget(
        agent, profile, curX, curZ, agent.curFwdX, agent.curFwdZ, snapshots, delta
    );

    const step = ((agent.speed || 1.3) * (agent.speedFactor ?? 1.0) * speedMult * delta) / Math.max(0.01, dist);
    agent.progress += step;

    if (agent.progress >= 1.0) {
        agent.waypointIndex++;
        agent.progress = 0;
    }

    const activeFrom = agent.waypoints[agent.waypointIndex];
    const activeTo = agent.waypoints[agent.waypointIndex + 1];
    const t = activeTo ? agent.progress : 1.0;
    const pA = activeTo ? activeFrom : from;
    const pB = activeTo ? activeTo : to;

    const centerX = pA.x + (pB.x - pA.x) * t;
    const centerZ = pA.z + (pB.z - pA.z) * t;

    const latRate = Math.min(1, delta * 6.5 * Math.max(0.5, speedMult));
    const prevLat = agent.lateralOffset ?? 0;
    agent.lateralOffset = clamp(prevLat + (targetOffset - prevLat) * latRate, -profile.maxLateral, profile.maxLateral);

    const rightX = -agent.curFwdZ;
    const rightZ = agent.curFwdX;
    const worldX = centerX + rightX * agent.lateralOffset;
    const worldZ = centerZ + rightZ * agent.lateralOffset;

    agent.mesh.position.x = worldX;
    agent.mesh.position.z = worldZ;

    const steerYaw = clamp((targetOffset - prevLat) * 0.55, -0.35, 0.35);
    agent.mesh.rotation.y = Math.atan2(agent.curFwdX, agent.curFwdZ) + steerYaw;

    const pose = getSurfacePose(worldX, worldZ, agent.curFwdX, agent.curFwdZ);
    agent.mesh.position.y = pose.y;
    return pose;
}

// Final pairwise lateral separation pass so simultaneous spawns or cornering agents never intersect
export function resolveAgentOverlaps(snapshots) {
    for (let i = 0; i < snapshots.length; i++) {
        for (let j = i + 1; j < snapshots.length; j++) {
            const a = snapshots[i];
            const b = snapshots[j];
            const ax = a.agent.mesh.position.x;
            const az = a.agent.mesh.position.z;
            const bx = b.agent.mesh.position.x;
            const bz = b.agent.mesh.position.z;

            const dx = bx - ax;
            const dz = bz - az;
            const dist = Math.hypot(dx, dz);
            const minSep = a.radius + b.radius + 0.08;
            if (dist >= minSep) continue;

            // Project separation onto road lateral axes, weighted toward lighter pedestrian
            const aWeight = (a.kind === 'pedestrian' && b.kind !== 'pedestrian')
                ? 0.72
                : ((b.kind === 'pedestrian' && a.kind !== 'pedestrian') ? 0.28 : 0.5);
            const bWeight = 1.0 - aWeight;
            const pushNeeded = minSep - dist;

            const aFwdX = a.agent.curFwdX ?? a.fwdX;
            const aFwdZ = a.agent.curFwdZ ?? a.fwdZ;
            const bFwdX = b.agent.curFwdX ?? b.fwdX;
            const bFwdZ = b.agent.curFwdZ ?? b.fwdZ;
            const aRightX = -aFwdZ, aRightZ = aFwdX;
            const bRightX = -bFwdZ, bRightZ = bFwdX;
            let sideSign = dx * aRightX + dz * aRightZ;
            if (Math.abs(sideSign) < 0.01) {
                sideSign = (a.agent.lateralOffset ?? 0) <= (b.agent.lateralOffset ?? 0) ? 1 : -1;
            } else {
                sideSign = sideSign > 0 ? 1 : -1;
            }

            const prevLatA = a.agent.lateralOffset ?? 0;
            const nextLatA = clamp(prevLatA - sideSign * pushNeeded * aWeight, -a.maxLateral, a.maxLateral);
            const deltaA = nextLatA - prevLatA;
            a.agent.lateralOffset = nextLatA;
            a.agent.mesh.position.x += aRightX * deltaA;
            a.agent.mesh.position.z += aRightZ * deltaA;

            const prevLatB = b.agent.lateralOffset ?? 0;
            const alignSign = (aRightX * bRightX + aRightZ * bRightZ) >= 0 ? sideSign : -sideSign;
            const nextLatB = clamp(prevLatB + alignSign * pushNeeded * bWeight, -b.maxLateral, b.maxLateral);
            const deltaB = nextLatB - prevLatB;
            b.agent.lateralOffset = nextLatB;
            b.agent.mesh.position.x += bRightX * deltaB;
            b.agent.mesh.position.z += bRightZ * deltaB;
        }
    }
}
