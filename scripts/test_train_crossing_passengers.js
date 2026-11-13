// Verification Suite: Track Rerouting Around Canal, Road-Matched Crossings,
// Meiji Passenger Locomotive Consist & Road-Connected Station Passengers

import assert from 'assert';
import * as THREE from 'three';

if (typeof global.document === 'undefined') {
    global.document = {
        createElement: () => ({
            width: 128,
            height: 128,
            getContext: () => ({
                fillStyle: '',
                strokeStyle: '',
                fillRect: () => {},
                strokeRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
                putImageData: () => {}
            })
        })
    };
}
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { TrainTrafficManager } from '../public/js/renderer/trainTraffic.js';
import { TrafficManager } from '../public/js/renderer/traffic_manager.js';
import { LevelCrossingMesh } from '../public/js/renderer/levelCrossing.js';
import { RoadTextureManager } from '../public/js/renderer/road_texture.js';
import { isDepotTile } from '../public/js/renderer/railRouteBuilder.js';

function createMockScene() {
    const children = [];
    return {
        children,
        add(obj) {
            if (!children.includes(obj)) children.push(obj);
        },
        remove(obj) {
            const idx = children.indexOf(obj);
            if (idx >= 0) children.splice(idx, 1);
        }
    };
}

function getTileWorldPos(gx, gy) {
    const s = CONFIG.TILE_SIZE;
    return new THREE.Vector3(gx * s + s / 2, 0, gy * s + s / 2);
}

function isValidRailOrDepotAtWorld(grid, wx, wz) {
    const s = CONFIG.TILE_SIZE;
    const gx = Math.floor(wx / s);
    const gy = Math.floor(wz / s);
    if (!grid.isValidCoord(gx, gy)) return false;
    const tile = grid.getTile(gx, gy);
    return Boolean(tile && (tile.type === CONFIG.TYPES.RAIL || isDepotTile(tile)));
}

function placeDepot(grid, x, y) {
    grid.setTile(x, y, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
    grid.getTile(x, y).serviceType = CONFIG.SERVICES.TRAIN_DEPOT;
    grid.notifyChange(x, y);
}

console.log('=== Train Rerouting, Crossings, Consist & Station Passengers Verification ===\n');

// ---------------------------------------------------------------------------
// 1. Track destruction + bypass rebuild around extended canal (while paused & active)
// ---------------------------------------------------------------------------
console.log('1. Testing live rail rerouting when destroying track & extending canal...');
const grid1 = new CityGridModel(18, 18);
// Closed rectangular rail loop: x=4..10, y=5..9 with Depot at (4,7)
for (let x = 4; x <= 10; x++) {
    grid1.setTile(x, 5, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
    grid1.setTile(x, 9, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
}
for (let y = 6; y <= 8; y++) {
    grid1.setTile(4, y, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
    grid1.setTile(10, y, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
}
placeDepot(grid1, 4, 7);
// Canal inside loop touching (6..8, 6)
for (let x = 6; x <= 8; x++) {
    grid1.setTile(x, 6, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE);
}

const scene1 = createMockScene();
const tt1 = new TrainTrafficManager(scene1, grid1, getTileWorldPos);
tt1.spawnTrain();
assert.strictEqual(tt1.trains.length, 1, 'Train should spawn on initial loop');
const oldSig = tt1.trains[0].networkSignature;
assert.strictEqual(tt1.trains[0].isLoop, true, 'Closed loop must be flagged as isLoop=true');

// Drive train smoothly around loop toward north leg
for (let i = 0; i < 60; i++) tt1.update(0.05, 1.0);

// User PAUSES game, destroys north track tiles (6,5)-(8,5) to extend canal into y=5,
// and rebuilds rails around canal at y=3..4 -> equal or different tile count
for (let x = 6; x <= 8; x++) {
    grid1.setTile(x, 5, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE);
}
grid1.setTile(5, 4, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid1.setTile(5, 3, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
for (let x = 6; x <= 9; x++) {
    grid1.setTile(x, 3, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
}
grid1.setTile(9, 4, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid1.setTile(9, 5, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);

// Update ONCE with speedMultiplier = 0 (game paused!)
tt1.update(0.016, 0.0);
assert.notStrictEqual(tt1.trains[0].networkSignature, oldSig, 'Paused update must immediately reconcile rebuilt rail signature');
assert(
    isValidRailOrDepotAtWorld(grid1, tt1.trains[0].mesh.position.x, tt1.trains[0].mesh.position.z),
    'Locomotive must stay on valid rails immediately after canal extension while paused'
);

// Resume playing full loop cycles and verify neither loco nor coach EVER touches the canal or grass
for (let i = 0; i < 400; i++) {
    tt1.update(0.032, 1.0);
    const loco = tt1.trains[0].mesh.position;
    const coach = tt1.trains[0].coachMesh.position;
    assert(
        isValidRailOrDepotAtWorld(grid1, loco.x, loco.z),
        `Frame ${i}: Locomotive left rail onto (${loco.x.toFixed(2)}, ${loco.z.toFixed(2)})`
    );
    assert(
        isValidRailOrDepotAtWorld(grid1, coach.x, coach.z),
        `Frame ${i}: Coach left rail onto (${coach.x.toFixed(2)}, ${coach.z.toFixed(2)})`
    );
}
console.log('  ✓ Train reconciles while paused & stays strictly on rebuilt bypass rails over 400 frames.');

// Check equal-count swap detection + branching T-junction continuity + grid_reset cleanup
const tGrid = new CityGridModel(12, 12);
for (let x = 2; x <= 6; x++) tGrid.setTile(x, 4, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
tGrid.setTile(4, 5, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
tGrid.setTile(4, 6, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
const tTT = new TrainTrafficManager(createMockScene(), tGrid, getTileWorldPos);
const branchNets = tTT.findRailNetworks();
const branchRoute = tTT.buildRailRoute(branchNets[0]);
for (let i = 1; i < branchRoute.length; i++) {
    const stepDist = Math.hypot(branchRoute[i].x - branchRoute[i - 1].x, branchRoute[i].z - branchRoute[i - 1].z);
    assert(stepDist <= CONFIG.TILE_SIZE + 0.05, `Branch route jumped too far (${stepDist.toFixed(2)})`);
}
tTT.spawnTrain();
assert.strictEqual(tTT.trains.length, 1);
tGrid.loadFromMap([]); // triggers grid_reset
assert.strictEqual(tTT.trains.length, 0, 'grid_reset must immediately clear active trains');
console.log('  ✓ T-branch adjacency-strict routing and grid_reset cleanup verified.');

// ---------------------------------------------------------------------------
// 2. Road-Matched Level Crossing Geometry & Traffic Elevation
// ---------------------------------------------------------------------------
console.log('2. Testing road-matched level crossing continuity (stone & dirt tiers)...');
const grid2 = new CityGridModel(10, 10);
// NS Rail through x=4, y=3..5
grid2.setTile(4, 3, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid2.setTile(4, 4, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid2.setTile(4, 5, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
// Stone roads (tier 2) meeting at crossing (4,4) while crossing tile.roadTier starts at 1
grid2.setTile(3, 4, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 2);
grid2.setTile(5, 4, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 2);
const stoneCrossingTile = grid2.getTile(4, 4);
stoneCrossingTile.hasCrossing = true;
stoneCrossingTile.roadTier = 1; // Intentionally lower to test neighbor stone inheritance

const stoneCrossingGroup = LevelCrossingMesh.createLevelCrossingMesh(stoneCrossingTile, grid2);
const stoneMats = new Set();
const stoneApronXs = [];
stoneCrossingGroup.traverse(obj => {
    if (obj.isMesh) {
        stoneMats.add(obj.material);
        if (obj.material === RoadTextureManager.getStoneRoadMaterial() && Math.abs(obj.position.y - 0.04) < 0.002) {
            stoneApronXs.push(obj.position.x);
        }
    }
});
assert(stoneMats.has(RoadTextureManager.getStoneRoadMaterial()), 'Crossing next to Stone Paving must render matching Stone Road material');
assert(stoneMats.has(RoadTextureManager.getStoneKerbMaterial()), 'Stone crossing must include granite curbs matching adjacent stone road');
assert(stoneApronXs.includes(-0.625) && stoneApronXs.includes(0.625),
    'Stone road aprons must align symmetrically on both sides up to the rail flanges');

// Pure Dirt crossing check
const gridDirt = new CityGridModel(8, 8);
gridDirt.setTile(3, 2, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
gridDirt.setTile(3, 3, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
gridDirt.setTile(3, 4, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
gridDirt.setTile(2, 3, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
gridDirt.setTile(4, 3, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
gridDirt.getTile(3, 3).hasCrossing = true;
gridDirt.getTile(3, 3).roadTier = 1;
const dirtGroup = LevelCrossingMesh.createLevelCrossingMesh(gridDirt.getTile(3, 3), gridDirt);
const dirtMats = new Set();
dirtGroup.traverse(obj => { if (obj.isMesh) dirtMats.add(obj.material); });
assert(dirtMats.has(RoadTextureManager.getDirtRoadMaterial()), 'Dirt crossing must render matching dirt road surface');
assert(!dirtMats.has(RoadTextureManager.getStoneKerbMaterial()), 'Dirt crossing must not have stone curbs');

// Verify TrafficManager surface pose on crossing
const trafficMgr = new TrafficManager(createMockScene(), grid2, getTileWorldPos, null);
const crossingPos = getTileWorldPos(4, 4);
stoneCrossingTile.roadTier = 2;
const pose = trafficMgr.getSurfacePose(crossingPos.x, crossingPos.z, 1, 0);
assert.strictEqual(pose.y, 0.075, 'Stone level crossing surface Y must sit smoothly at 0.075');
console.log('  ✓ Stone & dirt level crossing continuous aprons, curbs & cart deck elevation verified.');

// ---------------------------------------------------------------------------
// 3. Meiji Locomotive + Passenger Coach Consist & Seated Rider Visibility
// ---------------------------------------------------------------------------
console.log('3. Testing Meiji steam locomotive, passenger coach & curve articulation...');
const train = tt1.trains[0];
assert(train.mesh.userData.isLocomotive, 'Lead vehicle must be Meiji 2-4-0 steam locomotive');
assert.strictEqual(train.mesh.userData.wheels.length, 6, 'Locomotive must have 2 leading + 4 driving wheels');
assert.strictEqual(train.mesh.userData.sideRods.length, 2, 'Locomotive must include left and right coupling side-rods');
assert(train.coachMesh.userData.isPassengerCoach, 'Trailing vehicle must be Meiji passenger carriage');
assert.strictEqual(train.coachMesh.userData.passengerSeats.length, 6, 'Passenger carriage must include 6 interior seated passengers');

train.passengerCount = 4;
tt1.update(0.05, 1.0);
const visibleSeats = train.coachMesh.userData.passengerSeats.filter(s => s.visible).length;
assert.strictEqual(visibleSeats, 4, 'Visible seated passengers inside carriage must reflect train.passengerCount');
const sep = Math.hypot(
    train.mesh.position.x - train.coachMesh.position.x,
    train.mesh.position.z - train.coachMesh.position.z
);
assert(sep > 0.65 && sep <= train.carSpacing + 0.05, `Articulated coach spacing should remain close to carSpacing (${sep.toFixed(2)})`);
console.log('  ✓ Meiji locomotive, coupled passenger carriage & visible seated passengers verified.');

// ---------------------------------------------------------------------------
// 4. Station Pedestrians: Road-Connected Spawning, Boarding & Disembarking
// ---------------------------------------------------------------------------
console.log('4. Testing road-connected station passengers, boarding, isolated depot exclusion & alighting...');
const grid4 = new CityGridModel(18, 18);
// Linear rail EW at y=8, x=2..14
for (let x = 2; x <= 14; x++) {
    grid4.setTile(x, 8, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
}
// Station A at (4,8) connected to a stone road north (4,7) running west->east (2..6, 6..7)
placeDepot(grid4, 4, 8);
for (let x = 2; x <= 6; x++) {
    grid4.setTile(x, 7, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 2);
}
// Station B at (9,8) completely isolated on open grass (no road within <=2 tiles)
placeDepot(grid4, 9, 8);
// Station C at (13,8) connected to a road north (13,7) -> (13..16, 6..7)
placeDepot(grid4, 13, 8);
for (let x = 13; x <= 16; x++) {
    grid4.setTile(x, 7, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 2);
}

const scene4 = createMockScene();
const tm4 = new TrafficManager(scene4, grid4, getTileWorldPos, null);
const tt4 = new TrainTrafficManager(scene4, grid4, getTileWorldPos, null, { traffic: tm4 });

// Advance just station passengers enough for walkers to spawn and walk onto Station A & C platforms
for (let i = 0; i < 120; i++) {
    tt4.stationPassengers.update(0.1, 1.0);
}
const sp = tt4.stationPassengers;
assert(sp.stations.get('4,8').entryRoads.length > 0, 'Station A must detect connected road');
assert.strictEqual(sp.stations.get('9,8').entryRoads.length, 0, 'Isolated Station B must have 0 nearby roads');
assert.strictEqual(
    sp.passengers.filter(p => p.stationKey === '9,8').length,
    0,
    'Isolated Station B must NOT spawn road commuters'
);
const waitersA = sp.passengers.filter(p => p.stationKey === '4,8' && p.state === 'WAITING_ON_PLATFORM');
assert(waitersA.length >= 1, `Expected commuters to walk road and wait at Station A platform, found ${waitersA.length}`);

// Spawn train, arrive at Station A -> waiting commuters board (disappear) & increment train.passengerCount
tt4.spawnTrain();
const train4 = tt4.trains[0];
const waiterCountA = waitersA.length;
sp.onTrainArriveAtDepot(train4, { x: 4, y: 8 });
assert(
    sp.passengers.some(p => p.stationKey === '4,8' && p.state === 'BOARDING'),
    'Waiting commuters at Station A must switch to BOARDING upon train arrival'
);
for (let i = 0; i < 40; i++) sp.update(0.1, 1.0);
assert.strictEqual(
    sp.passengers.filter(p => p.stationKey === '4,8' && p.state === 'BOARDING').length,
    0,
    'Boarding passengers must disappear cleanly after entering the train'
);
const boardedFromA = train4.passengerOrigins.filter(o => o === '4,8').length;
assert.strictEqual(
    boardedFromA,
    waiterCountA,
    `All ${waiterCountA} waiting commuters must board the train and record Station A origin`
);
assert(train4.passengerCount >= waiterCountA, 'Train passengerCount must reflect boarded commuters');

// Arrive at Station C -> passengers from Station A get off the train onto Station C platform and walk onto road
const originsBeforeC = train4.passengerOrigins.length;
sp.onTrainArriveAtDepot(train4, { x: 13, y: 8 });
const alightingC = sp.passengers.filter(p => p.stationKey === '13,8' && p.state === 'WALKING_FROM_STATION');
assert(alightingC.length >= 1, 'Train arriving at Station C must disembark passengers from earlier station');
assert(train4.passengerOrigins.length < originsBeforeC, 'Disembarking passengers must leave train.passengerOrigins');
assert(alightingC[0].waypoints.length >= 3, 'Disembarking passengers at Station C must walk onto connected town roads');

console.log('  ✓ Road-connected station walking, boarding disappearance, isolated depot exclusion & alighting verified.');
console.log('\n🎉 ALL TRAIN, CROSSING & STATION PASSENGER TESTS PASSED!');
