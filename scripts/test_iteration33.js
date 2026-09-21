// Project Meiji - Iteration 33 Verification Test Suite (test_iteration33.js)
// ponytail: unit & integration verification for tiered citizen expectations, commercial crime penalties & advisor alerts

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Headless DOM mock
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: (id) => ({
        id,
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
            toggle: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    }),
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        addEventListener: () => {}
    }),
    body: { appendChild: () => {} }
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
};
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

async function runTests() {
    console.log('================================================================');
    console.log('Project Meiji - Iteration 33 Verification Test Suite');
    console.log('================================================================\n');

    const { CONFIG } = await import('../public/js/config.js');
    const { HappinessSystem } = await import('../public/js/simulation/happiness_system.js');
    const { EconomySystem } = await import('../public/js/simulation/economy_system.js');
    const { AdvisorManager } = await import('../public/js/ui/advisorManager.js');
    const { SurveyorScope } = await import('../public/js/ui/surveyor_scope.js');

    // 1. TIERED RESIDENTIAL HAPPINESS EXPECTATIONS
    console.log('1. Testing Tiered Residential Happiness Expectations...');
    const mockTiles = new Map();
    const mockGrid = {
        tiles: mockTiles,
        isValidCoord: () => true,
        hasAdjacentRoad: () => true,
        getTile: (x, y) => mockTiles.get(`${x},${y}`)
    };
    const mockSanitation = { isWellCovered: () => true };
    const mockDisaster = {
        isWatchtowerCovered: () => false,
        findAvailableFireDepot: () => null
    };
    const mockState = {
        schoolSystem: { isEducationCovered: () => false, isSchoolAdjacent: () => false },
        powerSystem: { isWithinPollutionRadius: () => false },
        showToast: () => {}
    };

    const happiness = new HappinessSystem(mockGrid, mockState, mockSanitation, mockDisaster);

    // Case 1A: Level 1 Machiya with road + well (basic expectations met)
    const resL1Tile = { x: 0, y: 0, type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.RESIDENTIAL, level: 1, stage: CONFIG.STAGES.BUILT };
    const hL1 = happiness.getResidentialHappiness(resL1Tile);
    assert.strictEqual(hL1, 80, `Level 1 Machiya with road & well should be 80% (got ${hL1})`);

    // Case 1B: Level 1 Machiya without well (unwatered cholera penalty)
    mockSanitation.isWellCovered = () => false;
    const hL1NoWater = happiness.getResidentialHappiness(resL1Tile);
    assert.strictEqual(hL1NoWater, 40, `Level 1 Machiya without well should drop by -25% to 40% (got ${hL1NoWater})`);
    mockSanitation.isWellCovered = () => true;

    // Case 1C: Level 2 Kura-zukuri without police, fire, or leisure (slumlord town)
    const resL2Tile = { x: 1, y: 0, type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.RESIDENTIAL, level: 2, stage: CONFIG.STAGES.BUILT };
    const hL2Neglected = happiness.getResidentialHappiness(resL2Tile);
    // 50 base + 15 road + 15 water - 15 fire - 20 order - 15 leisure = 30%
    assert.strictEqual(hL2Neglected, 30, `Level 2 Kura-zukuri without police, fire, and leisure should drop to 30% (got ${hL2Neglected})`);

    // Case 1D: Level 2 Kura-zukuri with all expectations met
    happiness.isOrderCovered = () => true;
    happiness.isEntertainmentCovered = () => true;
    mockDisaster.isWatchtowerCovered = () => true;
    const hL2Satisfied = happiness.getResidentialHappiness(resL2Tile);
    assert.strictEqual(hL2Satisfied, 100, `Level 2 with all services met should reach 100% (got ${hL2Satisfied})`);

    // Case 1E: Level 3 Brick Residence without police or schools
    happiness.isOrderCovered = () => false;
    mockState.schoolSystem.isEducationCovered = () => false;
    const resL3Tile = { x: 2, y: 0, type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.RESIDENTIAL, level: 3, stage: CONFIG.STAGES.BUILT };
    const hL3Neglected = happiness.getResidentialHappiness(resL3Tile);
    // 50 base + 15 road + 15 water - 25 order - 25 edu + 10 leisure + 5 fire = 45% (or 30% if no leisure)
    happiness.isEntertainmentCovered = () => false;
    const hL3FullNeglect = happiness.getResidentialHappiness(resL3Tile);
    // 50 + 15 + 15 - 25 - 25 - 15 + 5 = 20%
    assert.strictEqual(hL3FullNeglect, 20, `Level 3 Brick Residence neglected must drop to 20% (got ${hL3FullNeglect})`);
    console.log('   ✓ Tiered residential happiness properly penalizes unserved civic expectations\n');

    // 2. COMMERCIAL CRIME & CLERK DEFICIT REVENUE PENALTIES
    console.log('2. Testing Commercial Crime & Clerk Shortage Penalties...');
    const comTiles = new Map();
    // 2 Giyōfū Level 3 Commercial Arcades (base tax: 45 each = 90)
    comTiles.set('0,0', { x: 0, y: 0, type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.COMMERCIAL, level: 3, stage: CONFIG.STAGES.BUILT });
    comTiles.set('1,0', { x: 1, y: 0, type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.COMMERCIAL, level: 3, stage: CONFIG.STAGES.BUILT });

    const comGrid = {
        tiles: comTiles,
        isValidCoord: () => true,
        getTile: (x, y) => comTiles.get(`${x},${y}`),
        hasAdjacentRoad: () => true,
        getBuildingCounts: () => ({
            resL1: 0, resL2: 0, resL3: 0,
            comL1: 0, comL2: 0, comL3: 2, comL4: 0,
            indL1: 0, indL2: 0, industrial: 0
        })
    };

    const econState = {
        treasury: 5000,
        lastCashflow: 0,
        population: 200,
        currentMonth: 4,
        metrics: { townHappiness: 70 },
        schoolSystem: { isEducationCovered: () => false, isSchoolAdjacent: () => false },
        policies: { getMonthlyFiscalImpact: () => 0, isNightWatchActive: () => false },
        agriculture: { calculateHarvestYield: () => 0 },
        tradePierManager: { calculateTotalMonthlyDividends: () => 0 },
        showToast: () => {}
    };

    const unpatrolledHappiness = {
        isOrderCovered: () => false
    };

    const economy = new EconomySystem(comGrid, econState, unpatrolledHappiness);
    economy.processEconomy();

    // 2 Arcades: Base 2 * 45 = 90
    // Unpatrolled penalty: 30% per arcade = 14 * 2 = 28
    // Uneducated clerk penalty: 20% per arcade = 9 * 2 = 18
    // Total penalties: 28 + 18 = 46
    // Net Commercial Tax: 90 - 46 = 44!
    assert.strictEqual(econState.lastBudget.orderDeficitPenalty, 28, 'Crime penalty on unpatrolled Giyōfū should be 28');
    assert.strictEqual(econState.lastBudget.educationDeficitPenalty, 18, 'Clerk shortage penalty on uneducated Giyōfū should be 18');
    assert.strictEqual(econState.lastBudget.comTax, 44, 'Net commercial tax should be reduced from 90 to 44');
    console.log('   ✓ Commercial crime & accounting penalties properly slash neglected shop profits\n');

    // 3. ADVISOR EXPECTATION DEFICIT TRIGGERS
    console.log('3. Testing Advisor Expectation Deficit Guidance Triggers...');
    const advTiles = new Map();
    // 4 Level 2 residences without police
    for (let i = 0; i < 4; i++) {
        advTiles.set(`${i},0`, {
            x: i, y: 0,
            type: CONFIG.TYPES.ZONE,
            zoneType: CONFIG.ZONES.RESIDENTIAL,
            stage: CONFIG.STAGES.BUILT,
            level: 2
        });
    }

    const advGrid = { tiles: advTiles };
    const advState = {
        grid: advGrid,
        currentYear: 1874,
        currentMonth: 6,
        population: 150,
        treasury: 4000,
        lastCashflow: 100,
        simulation: {
            isWellCovered: () => true,
            isOrderCovered: () => false, // 100% unpatrolled
            isEntertainmentCovered: () => true,
            isShrineCovered: () => true
        },
        schoolSystem: { isEducationCovered: () => true, isSchoolAdjacent: () => true },
        policies: { isNightWatchActive: () => false, getActiveCount: () => 0, isModernizationSubsidyActive: () => false },
        showToast: () => {}
    };

    const advisor = new AdvisorManager(advState);
    advisor.enabled = true;

    const alertKey = advisor.evaluate();
    assert.strictEqual(alertKey, 'order_deficit', 'Advisor should fire order_deficit when Level 2 wards are unpatrolled');

    // Test Education Deficit trigger
    advState.simulation.isOrderCovered = () => true;
    advState.schoolSystem.isEducationCovered = () => false;
    advState.schoolSystem.isSchoolAdjacent = () => false;
    // Upgrade 2 residences to Level 3
    advTiles.get('0,0').level = 3;
    advTiles.get('1,0').level = 3;
    advisor.lastEvaluationMonth = 0;
    advisor.cooldowns = {};

    const eduAlertKey = advisor.evaluate();
    assert.strictEqual(eduAlertKey, 'education_deficit', 'Advisor should fire education_deficit when Level 3 wards lack schools');
    console.log('   ✓ Municipal advisor accurately triggers order & education guidance warnings\n');

    // 4. SURVEYOR'S SCOPE EXPECTATION FORMATTING
    console.log('4. Testing Surveyor\'s Scope Inspection Output Formatting...');
    const scopeMockDom = {
        order: { textContent: '', style: {} },
        education: { textContent: '', style: {} }
    };
    const scope = new SurveyorScope(null, advState);
    scope.dom = { ...scope.dom, ...scopeMockDom };

    // Inspect unpatrolled Level 3 commercial tile
    const inspectedTile = {
        type: CONFIG.TYPES.ZONE,
        zoneType: CONFIG.ZONES.COMMERCIAL,
        level: 3,
        stage: CONFIG.STAGES.BUILT
    };
    const simWithDeficits = {
        isOrderCovered: () => false,
        isEducationCovered: () => false
    };
    const testGridForScope = {
        getTile: () => inspectedTile,
        hasAdjacentRoad: () => true
    };

    scope.update(5, 5, testGridForScope, simWithDeficits);
    assert.ok(scope.dom.order.textContent.includes('-30% Crime'), 'Order text must mention -30% Crime penalty');
    assert.ok(scope.dom.education.textContent.includes('-20% Clerks'), 'Education text must mention -20% Clerks penalty');
    console.log('   ✓ Surveyor\'s Scope renders clear, contextual expectation deficit indicators\n');

    // 5. FILE SIZE GOVERNANCE
    console.log('5. Testing File Size Governance (Strict < 450–500 Lines)...');
    const filesToAudit = [
        'public/js/simulation/happiness_system.js',
        'public/js/simulation/economy_system.js',
        'public/js/ui/advisorManager.js',
        'public/js/ui/surveyor_scope.js'
    ];

    for (const relPath of filesToAudit) {
        const fullPath = path.resolve(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        assert.ok(lines <= 450, `${relPath} exceeded 450 lines (currently ${lines})`);
        console.log(`   ✓ ${relPath}: ${lines} lines (under 450 limit)`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL ITERATION 33 ACCEPTANCE TESTS PASSED (100%)');
    console.log('================================================================\n');
}

runTests().catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
