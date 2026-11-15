// Project Meiji - Winter Roof Snow & Street Agent Collision-Avoidance Tests
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 128,
                height: 48,
                getContext: () => ({
                    fillStyle: '',
                    beginPath: () => {},
                    rect: () => {},
                    roundRect: () => {},
                    fill: () => {},
                    stroke: () => {},
                    fillText: () => {}
                })
            };
        }
        return {
            style: {},
            classList: { add: () => {}, remove: () => {} },
            appendChild: () => {},
            addEventListener: () => {}
        };
    }
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720
};

const THREE = await import('three');
const { CONFIG } = await import('../public/js/config.js');
const { CityGridModel } = await import('../public/js/grid.js');
const { TrafficManager } = await import('../public/js/renderer/traffic_manager.js');
const { initAgentSteering } = await import('../public/js/renderer/trafficSteering.js');
const { WeatheringShaderSystem } = await import('../public/js/renderer/weatheringShader.js');

console.log('=== Testing Winter Roof Snow & Cart/Pedestrian Avoidance ===');

// -----------------------------------------------------------------------------
// 1. Winter Roof Snow Shader & Seasonal Uniform Transitions
// -----------------------------------------------------------------------------
console.log('1. Testing WeatheringShaderSystem winter roof snow transitions & shader wiring...');

WeatheringShaderSystem.setSeasonSnow(1, true);
assert.strictEqual(WeatheringShaderSystem._sharedUniforms.uSnowAmount.value, 0.85,
    'Immediate January snap must set uSnowAmount to 0.85');

WeatheringShaderSystem.setSeasonSnow(7, false);
WeatheringShaderSystem.update(0.15, false, 0.0, 7);
const midMelt = WeatheringShaderSystem._sharedUniforms.uSnowAmount.value;
assert.ok(midMelt < 0.85 && midMelt > 0.0, `Summer transition must smoothly melt roof snow (got ${midMelt})`);

for (let i = 0; i < 30; i++) WeatheringShaderSystem.update(0.2, false, 0.0, 7);
assert.ok(WeatheringShaderSystem._sharedUniforms.uSnowAmount.value < 0.01,
    'Summer roof snow must converge to 0.0');

for (let i = 0; i < 30; i++) WeatheringShaderSystem.update(0.2, false, 0.0, 11);
assert.ok(Math.abs(WeatheringShaderSystem._sharedUniforms.uSnowAmount.value - 0.25) < 0.02,
    'Late autumn (November) shoulder snow must converge near 0.25');

for (let i = 0; i < 30; i++) WeatheringShaderSystem.update(0.2, false, 0.0, 12);
assert.ok(Math.abs(WeatheringShaderSystem._sharedUniforms.uSnowAmount.value - 0.85) < 0.02,
    'December winter roof snow must converge near 0.85');

const shaderSrc = fs.readFileSync(path.join(rootDir, 'public/js/renderer/weatheringShader.js'), 'utf8');
assert.ok(shaderSrc.includes('uSnowAmount') && shaderSrc.includes('bldgSnowMask') && shaderSrc.includes('vBldgWorldNormal.y'),
    'weatheringShader.js must mask roof snow to upward-facing roof normals via uSnowAmount');

const rendererSrc = fs.readFileSync(path.join(rootDir, 'public/js/renderer.js'), 'utf8');
assert.ok(rendererSrc.includes('WeatheringShaderSystem.setSeasonSnow(month)'),
    'renderer.js updateSeason must invoke WeatheringShaderSystem.setSeasonSnow(month)');
assert.ok(rendererSrc.includes('WeatheringShaderSystem.update(delta, isStorm, lightingState ? lightingState.emissiveIntensity : 0.0, this.state?.currentMonth'),
    'renderer.js animate loop must forward currentMonth to WeatheringShaderSystem.update');

console.log('✓ Winter roof snow shader uniforms & renderer wiring passed.');

// -----------------------------------------------------------------------------
// Helpers for TrafficManager Scenarios
// -----------------------------------------------------------------------------
function makeTrafficHarness(roadCoords) {
    const mockScene = { add: () => {}, remove: () => {} };
    const grid = new CityGridModel(16, 16);
    for (const [x, y] of roadCoords) {
        grid.setTile(x, y, CONFIG.TYPES.ROAD);
    }
    const getPos = (x, y) => ({ x: (x + 0.5) * CONFIG.TILE_SIZE, z: (y + 0.5) * CONFIG.TILE_SIZE });
    const tm = new TrafficManager(mockScene, grid, getPos, null);
    tm.ambientSpawnTimer = -9999; // Suppress random spawning during deterministic tests
    return { tm, getPos };
}

function addManualAgent(tm, getPos, tileCoords, kind, speed) {
    const waypoints = tileCoords.map(([x, y]) => {
        const p = getPos(x, y);
        return new THREE.Vector3(p.x, 0, p.z);
    });
    const mesh = kind === 'pedestrian' ? tm.createPedestrianMesh() : tm.createRickshawMesh();
    mesh.position.set(waypoints[0].x, 0, waypoints[0].z);
    const entry = {
        mesh,
        waypoints,
        waypointIndex: 0,
        progress: 0,
        speed,
        isRickshaw: kind === 'rickshaw',
        reverseOnComplete: false
    };
    initAgentSteering(entry, kind);
    tm.ambientAgents.push(entry);
    return entry;
}

// -----------------------------------------------------------------------------
// 2. Cart Overtaking Slower Pedestrian on Straight Corridor
// -----------------------------------------------------------------------------
console.log('2. Testing faster rickshaw overtaking slow pedestrian without collision...');
{
    const corridor = [];
    for (let x = 2; x <= 13; x++) corridor.push([x, 5]);
    const { tm, getPos } = makeTrafficHarness(corridor);

    const pedCoords = [];
    for (let x = 4; x <= 13; x++) pedCoords.push([x, 5]);
    const cartCoords = [];
    for (let x = 2; x <= 13; x++) cartCoords.push([x, 5]);

    const ped = addManualAgent(tm, getPos, pedCoords, 'pedestrian', 1.3);
    const cart = addManualAgent(tm, getPos, cartCoords, 'rickshaw', 2.8);

    let minSep = Infinity;
    let passedPedestrian = false;
    for (let step = 0; step < 120; step++) {
        tm.update(1.0, 0.05);
        if (!tm.ambientAgents.includes(cart) || !tm.ambientAgents.includes(ped)) break;
        const dx = cart.mesh.position.x - ped.mesh.position.x;
        const dz = cart.mesh.position.z - ped.mesh.position.z;
        minSep = Math.min(minSep, Math.hypot(dx, dz));
        assert.ok(Math.abs(cart.lateralOffset) <= 0.36, `Cart lateralOffset out of track bounds: ${cart.lateralOffset}`);
        assert.ok(Math.abs(ped.lateralOffset) <= 0.47, `Pedestrian lateralOffset out of track bounds: ${ped.lateralOffset}`);
        if (cart.mesh.position.x > ped.mesh.position.x + 1.0) {
            passedPedestrian = true;
            break;
        }
    }

    assert.ok(passedPedestrian, 'Faster rickshaw must successfully overtake slower pedestrian');
    assert.ok(minSep >= 0.48, `Expected overtaking separation >= 0.48m, got ${minSep.toFixed(3)}`);
    console.log(`✓ Overtake completed cleanly with min center separation ${minSep.toFixed(3)}m.`);
}

// -----------------------------------------------------------------------------
// 3. Head-On Oncoming Rickshaw vs Pedestrian
// -----------------------------------------------------------------------------
console.log('3. Testing head-on oncoming rickshaw vs pedestrian avoidance...');
{
    const corridor = [];
    for (let x = 2; x <= 12; x++) corridor.push([x, 5]);
    const { tm, getPos } = makeTrafficHarness(corridor);

    const eastbound = [];
    for (let x = 2; x <= 12; x++) eastbound.push([x, 5]);
    const westbound = [...eastbound].reverse();

    const ped = addManualAgent(tm, getPos, eastbound, 'pedestrian', 1.3);
    const cart = addManualAgent(tm, getPos, westbound, 'rickshaw', 2.8);

    let minSep = Infinity;
    let crossed = false;
    for (let step = 0; step < 120; step++) {
        tm.update(1.0, 0.05);
        if (!tm.ambientAgents.includes(cart) || !tm.ambientAgents.includes(ped)) break;
        const dx = cart.mesh.position.x - ped.mesh.position.x;
        const dz = cart.mesh.position.z - ped.mesh.position.z;
        minSep = Math.min(minSep, Math.hypot(dx, dz));
        if (cart.mesh.position.x < ped.mesh.position.x - 1.0) crossed = true;
    }

    assert.ok(crossed, 'Head-on cart and pedestrian must pass each other completely');
    assert.ok(minSep >= 0.48, `Expected head-on separation >= 0.48m, got ${minSep.toFixed(3)}`);
    console.log(`✓ Head-on crossing completed with min center separation ${minSep.toFixed(3)}m.`);
}

// -----------------------------------------------------------------------------
// 4. Emergency Fire Cart Passing Pedestrians Around 90-Degree Turn
// -----------------------------------------------------------------------------
console.log('4. Testing dispatched brigade cart overtaking pedestrians & turning 90 degrees...');
{
    const lRoute = [
        [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
        [6, 6], [6, 7], [6, 8], [6, 9]
    ];
    const { tm, getPos } = makeTrafficHarness(lRoute);

    const ped1 = addManualAgent(tm, getPos, lRoute.slice(1), 'pedestrian', 1.2);
    const ped2 = addManualAgent(tm, getPos, lRoute.slice(4), 'pedestrian', 1.2);

    let fireArrived = false;
    tm.dispatchBrigadeCart(lRoute.map(([x, y]) => ({ x, y })), () => { fireArrived = true; });
    const fireCart = tm.dispatchedCarts[0];

    let minSep = Infinity;
    for (let step = 0; step < 120 && !fireArrived; step++) {
        tm.update(1.0, 0.05);
        for (const p of [ped1, ped2]) {
            if (!tm.ambientAgents.includes(p)) continue;
            const dx = fireCart.mesh.position.x - p.mesh.position.x;
            const dz = fireCart.mesh.position.z - p.mesh.position.z;
            minSep = Math.min(minSep, Math.hypot(dx, dz));
        }
        assert.ok(Math.abs(fireCart.lateralOffset) <= 0.36, `Fire cart exceeded road bounds: ${fireCart.lateralOffset}`);
    }

    assert.strictEqual(fireArrived, true, 'Dispatched fire cart must still arrive cleanly at fire site');
    assert.ok(minSep >= 0.49, `Expected fire cart min separation >= 0.49m, got ${minSep.toFixed(3)}`);
    console.log(`✓ Fire cart arrived cleanly around L-corner with min separation ${minSep.toFixed(3)}m.`);
}

console.log('\n🎉 ALL ROOF SNOW & TRAFFIC AVOIDANCE TESTS PASSED!');
