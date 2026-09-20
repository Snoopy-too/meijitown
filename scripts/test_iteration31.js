// Project Meiji - Iteration 31 Verification Test Suite (test_iteration31.js)
// ponytail: unit and integration verification for civic policies, edict headers, switch contrast & advisor engine

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
    getElementById: (id) => {
        return {
            id,
            textContent: '',
            innerHTML: '',
            style: {},
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                contains(c) { return this.classes.has(c); },
                toggle(c, force) {
                    if (force !== undefined) {
                        if (force) this.classes.add(c);
                        else this.classes.delete(c);
                    } else {
                        if (this.classes.has(c)) this.classes.delete(c);
                        else this.classes.add(c);
                    }
                }
            },
            addEventListener: () => {},
            removeEventListener: () => {},
            appendChild: () => {},
            removeChild: () => {},
            children: []
        };
    },
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        appendChild: () => {},
        addEventListener: () => {},
        remove: () => {}
    }),
    body: {
        appendChild: () => {}
    },
    documentElement: { lang: 'en' }
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

console.log('================================================================');
console.log('Project Meiji - Iteration 31 Verification Test Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Civic Policy Default States & Initialization
// -----------------------------------------------------------------------------
console.log('1. Testing Civic Policy Default States & Facade Integration...');
import { PolicyManager, POLICY_DEFINITIONS } from '../public/js/policyManager.js';
import { EdictsManager, EDICT_DEFINITIONS } from '../public/js/edictsManager.js';

// Verify facade
assert.strictEqual(PolicyManager, EdictsManager, 'EdictsManager facade must re-export PolicyManager');
assert.strictEqual(POLICY_DEFINITIONS, EDICT_DEFINITIONS, 'EDICT_DEFINITIONS facade must re-export POLICY_DEFINITIONS');

// Mock Game State
const mockState = {
    cityId: 999,
    cityName: 'Edo-Tokyo',
    treasury: 5000,
    population: 0,
    currentYear: 1872,
    currentMonth: 1,
    lastCashflow: 0,
    metrics: { townHappiness: 65 },
    showToast: () => {}
};

const pm = new PolicyManager(mockState);
mockState.policies = pm;
mockState.edictsManager = pm;

// Verify default 0 active edicts
assert.strictEqual(pm.getActiveCount(), 0, 'Initial active edicts count must strictly be 0');
assert.strictEqual(pm.policies.night_watch, false, 'Night watch must default to false');
assert.strictEqual(pm.policies.clean_water, false, 'Clean water must default to false');
assert.strictEqual(pm.policies.modernization_subsidy, false, 'Modernization subsidy must default to false');
assert.strictEqual(pm.getMonthlyFiscalImpact(), 0, 'Initial monthly fiscal impact must be ¥0/mo');

// Test enacting and resetting defaults
pm.setPolicyActive('night_watch', true);
assert.strictEqual(pm.getActiveCount(), 1, 'Active count should be 1 after enacting night_watch');
assert.strictEqual(pm.getMonthlyFiscalImpact(), 15, 'Upkeep should be ¥15/mo for night_watch');

pm.resetDefaults();
assert.strictEqual(pm.getActiveCount(), 0, 'Active count should be 0 after resetDefaults()');
assert.strictEqual(pm.getMonthlyFiscalImpact(), 0, 'Upkeep should return to ¥0/mo after resetDefaults()');

console.log('   ✓ Default policy state is 100% OFF (false) with ¥0/mo fiscal impact');
console.log('   ✓ Facade edictsManager cleanly maps to PolicyManager');

// -----------------------------------------------------------------------------
// TEST 2: Dynamic Header Badge & Warning Indicator
// -----------------------------------------------------------------------------
console.log('\n2. Testing Chronicle Header Badge & Deficit Warning Indicator...');
import { ChronicleBanner } from '../public/js/ui/chronicle_banner.js';

const banner = new ChronicleBanner(mockState);
mockState.banner = banner;

// Button starts with 0 active edicts
banner.updateEdictsBadge();
const btn = banner.dom.btnPolicyLedger;
assert.ok(!btn.classList.contains('edicts-active'), 'Button should NOT have .edicts-active when 0 edicts running');
assert.ok(!btn.classList.contains('edicts-cashflow-warning'), 'Button should NOT have warning class when cashflow is 0');
assert.ok(btn.innerHTML.includes('Edicts') && !btn.innerHTML.includes('('), 'Button text should not have count parentheses when 0');

// Enact 1 edict, positive cashflow
pm.setPolicyActive('clean_water', true);
mockState.lastCashflow = 50;
banner.updateEdictsBadge();
assert.ok(btn.classList.contains('edicts-active'), 'Button must have .edicts-active when 1 edict running');
assert.ok(!btn.classList.contains('edicts-cashflow-warning'), 'Button should not warn when cashflow is positive');
assert.ok(btn.innerHTML.includes('(1)'), 'Button text must reflect (1) count badge');

// Negative cashflow with active edict -> trigger pulsing crimson warning dot
mockState.lastCashflow = -25;
banner.updateEdictsBadge();
assert.ok(btn.classList.contains('edicts-active'), 'Button must remain .edicts-active');
assert.ok(btn.classList.contains('edicts-cashflow-warning'), 'Button must have .edicts-cashflow-warning on negative cashflow');

// Turn off all edicts with negative cashflow -> warning should disappear
pm.resetDefaults();
banner.updateEdictsBadge();
assert.ok(!btn.classList.contains('edicts-active'), 'Button should lose .edicts-active when edicts reset to 0');
assert.ok(!btn.classList.contains('edicts-cashflow-warning'), 'Button should not have edicts warning when 0 edicts running');

console.log('   ✓ Header button shows dynamic count badge (N)');
console.log('   ✓ Amber lacquer active class .edicts-active correctly applied');
console.log('   ✓ Pulsing crimson warning .edicts-cashflow-warning correctly triggered on negative cashflow');

// -----------------------------------------------------------------------------
// TEST 3: Visual Switch Contrast & Strategic Hints
// -----------------------------------------------------------------------------
console.log('\n3. Testing Visual Switch Contrast CSS & Strategic Hints in DOM...');
const civicCss = fs.readFileSync(path.join(rootDir, 'public/css/civic.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public/index.html'), 'utf8');

// Verify CSS color standards
assert.ok(civicCss.includes('#d1c7b7'), 'CSS must specify stone-gray/warm beige (#d1c7b7) for OFF switch slider');
assert.ok(civicCss.includes('#fbf7ee'), 'CSS must specify light warm beige (#fbf7ee) for OFF knob');
assert.ok(civicCss.includes('#8c2d19'), 'CSS must specify Meiji lacquer red (#8c2d19) for ON switch slider');
assert.ok(civicCss.includes('#ffffff'), 'CSS must specify white (#ffffff) for ON knob');
assert.ok(civicCss.includes('@keyframes edictPulse'), 'CSS must define @keyframes edictPulse for warning dot');

// Verify Strategic hints in index.html
assert.ok(indexHtml.includes('policy.night_watch_hint'), 'index.html must include night_watch hint key');
assert.ok(indexHtml.includes('policy.clean_water_hint'), 'index.html must include clean_water hint key');
assert.ok(indexHtml.includes('policy.modernization_hint'), 'index.html must include modernization hint key');
assert.ok(indexHtml.includes('Recommended during dry winter months'), 'index.html must contain winter fire hint');
assert.ok(indexHtml.includes('Recommended when population growth stagnates'), 'index.html must contain clean water hint');
assert.ok(indexHtml.includes('Recommended only when treasury exceeds ¥500'), 'index.html must contain modernization subsidy hint');

console.log('   ✓ CSS conforms to exact high-contrast switch specification (#d1c7b7 / #fbf7ee / #8c2d19 / #ffffff)');
console.log('   ✓ Edict cards embed strategic hint recommendation notes');

// -----------------------------------------------------------------------------
// TEST 4: Beginner Advisor Guidance Triggers & Settings Toggle
// -----------------------------------------------------------------------------
console.log('\n4. Testing Beginner Advisor Guidance Triggers & Settings Toggle...');
import { AdvisorManager } from '../public/js/ui/advisorManager.js';

// Setup grid with wooden machiya
const advisorState = {
    currentYear: 1872,
    currentMonth: 1, // Winter
    treasury: 1000,
    lastCashflow: 100,
    policies: pm,
    edictsManager: pm,
    grid: {
        tiles: new Map([
            ['1,1', { type: 2, zoneType: 1, stage: 3, level: 1, buildingType: 'wooden' }],
            ['1,2', { type: 2, zoneType: 1, stage: 3, level: 1, buildingType: 'wooden' }],
            ['1,3', { type: 2, zoneType: 1, stage: 3, level: 1, buildingType: 'wooden' }]
        ])
    },
    showToast: () => {}
};

const advisor = new AdvisorManager(advisorState);
advisorState.advisor = advisor;

// Trigger 1: Winter + dense wooden machiya + no night watch
pm.resetDefaults();
advisor.lastEvaluationMonth = 0;
advisor.cooldowns = {};
const resultWinter = advisor.evaluate();
assert.strictEqual(resultWinter, 'dry_season_fire', 'Advisor must trigger dry_season_fire during winter with wooden buildings and no night watch');

// When Night Watch is enabled, dry season fire alert should not fire
pm.setPolicyActive('night_watch', true);
advisor.lastEvaluationMonth = 0;
advisor.cooldowns = {};
const resultNightWatchOn = advisor.evaluate();
assert.notStrictEqual(resultNightWatchOn, 'dry_season_fire', 'Advisor must NOT trigger dry_season_fire when Night Watch is active');

// Trigger 2: Fiscal Bleed (2 consecutive negative months and active edicts > 0)
advisorState.lastCashflow = -50;
advisor.lastEvaluationMonth = 0;
advisor.cooldowns = {};
advisor.evaluate(); // Month 1 negative
advisor.lastEvaluationMonth = 0;
const resultBleed = advisor.evaluate(); // Month 2 negative
assert.strictEqual(resultBleed, 'fiscal_bleed', 'Advisor must trigger fiscal_bleed after 2 consecutive negative cashflow months with active edicts');

// Trigger 3: Rapid Modernization Subsidy Drain (Subsidy active and treasury drops > 150)
pm.resetDefaults();
pm.setPolicyActive('modernization_subsidy', true);
advisorState.currentMonth = 5; // Spring (non-winter)
advisor.lastEvaluationMonth = 0;
advisor.cooldowns = {};
advisor.consecutiveNegativeMonths = 0;
advisor.treasuryHistory = [
    { totalMonths: 1872 * 12 + 4, treasury: 1000 },
    { totalMonths: 1872 * 12 + 5, treasury: 800 } // Drop of 200 > 150
];
advisorState.treasury = 800;
const resultDrain = advisor.evaluate();
assert.strictEqual(resultDrain, 'subsidy_drain', 'Advisor must trigger subsidy_drain when treasury drops > ¥150 under Modernization Subsidy');

// Test Settings Toggle
advisor.setPreference(false);
assert.strictEqual(advisor.enabled, false, 'Advisor enabled state should be false after setPreference(false)');
advisor.lastEvaluationMonth = 0;
const resultDisabled = advisor.evaluate();
assert.strictEqual(resultDisabled, null, 'Disabled advisor must return null and suppress all alerts');

advisor.setPreference(true);
assert.strictEqual(advisor.enabled, true, 'Advisor enabled state should be true after setPreference(true)');

console.log('   ✓ Trigger 1: Dry Season Fire Risk alert verified');
console.log('   ✓ Trigger 2: Fiscal Bleed alert verified');
console.log('   ✓ Trigger 3: Rapid Modernization Subsidy Drain verified');
console.log('   ✓ Settings toggle successfully enables/disables guidance system');

// -----------------------------------------------------------------------------
// TEST 5: File Size & Architectural Governance
// -----------------------------------------------------------------------------
console.log('\n5. Testing File Size & Architecture Limits...');
function checkLines(relPath, maxLines) {
    const filePath = path.join(rootDir, relPath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    assert.ok(lines <= maxLines, `${relPath} exceeds line limit (${lines} > ${maxLines})`);
    console.log(`   ✓ ${relPath}: ${lines} lines (limit ${maxLines})`);
}

checkLines('public/js/ui/advisorManager.js', 250);
checkLines('public/index.html', 600);
checkLines('public/js/policyManager.js', 450);
checkLines('public/js/ui/chronicle_banner.js', 450);
checkLines('public/js/app.js', 450);
checkLines('public/js/simulation.js', 450);
checkLines('public/js/i18n.js', 500);

console.log('\n================================================================');
console.log('🎉 ALL ITERATION 31 ACCEPTANCE TESTS PASSED (100%)');
console.log('================================================================');
