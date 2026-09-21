// Project Meiji - Month Chime & HUD Synchronization Verification Test
import assert from 'assert';
import { TimeManager } from '../public/js/simulation/time_manager.js';
import { audioManager } from '../public/js/audioManager.js';

console.log('=== Verifying Month Chime & Calendar Synchronization ===');

// 1. Mock state and tracking flags
let hudUpdateCalls = [];
let monthChimeCalls = 0;
let newYearBellCalls = 0;

const mockAudio = {
    playMonthAdvance: () => {
        monthChimeCalls++;
    },
    playNewYearBell: () => {
        newYearBellCalls++;
    },
    updateAmbience: () => {}
};

// Temporarily override SOUND methods in mock
import { SOUND } from '../public/js/fx.js';
const origMonthAdv = SOUND.playMonthAdvance;
const origNewYear = SOUND.playNewYearBell;
SOUND.playMonthAdvance = () => { monthChimeCalls++; };
SOUND.playNewYearBell = () => { newYearBellCalls++; };

const mockState = {
    currentYear: 1872,
    currentMonth: 1,
    updateHUD: () => {
        hudUpdateCalls.push({ year: mockState.currentYear, month: mockState.currentMonth });
    },
    showToast: () => {},
    renderer: null
};

let tickExecutionOrder = [];
const onTick = () => {
    tickExecutionOrder.push(`tick_executed_for_month_${mockState.currentMonth}`);
};

const tm = new TimeManager(mockState, onTick);

// 2. Simulate full 12-month calendar progression (Month 1 -> 12 -> Year Rollover -> Month 1)
for (let m = 2; m <= 12; m++) {
    const prevChimes = monthChimeCalls;
    tm.step();
    assert.strictEqual(mockState.currentMonth, m, `Month should advance to ${m}`);
    assert.strictEqual(monthChimeCalls, prevChimes + 1, `playMonthAdvance() must be called on month ${m}`);
    assert.strictEqual(hudUpdateCalls[hudUpdateCalls.length - 1].month, m, `HUD must be updated immediately to month ${m}`);
}

// 3. Test Year Rollover (Month 12 -> 1)
const prevChimesBeforeNewYear = monthChimeCalls;
const prevBellsBeforeNewYear = newYearBellCalls;
tm.step(); // rolls 12 -> 1
assert.strictEqual(mockState.currentMonth, 1, 'Month must roll over to 1 (January)');
assert.strictEqual(mockState.currentYear, 1873, 'Year must advance to 1873');
assert.strictEqual(monthChimeCalls, prevChimesBeforeNewYear + 1, 'playMonthAdvance() MUST still ring on month 1 (New Year)');
assert.strictEqual(newYearBellCalls, prevBellsBeforeNewYear + 1, 'playNewYearBell() MUST also ring on month 1');
assert.strictEqual(hudUpdateCalls[hudUpdateCalls.length - 1].month, 1, 'HUD must immediately show month 1 on New Year');
assert.strictEqual(hudUpdateCalls[hudUpdateCalls.length - 1].year, 1873, 'HUD must immediately show year 1873 on New Year');

console.log('✓ 12-Month progression and New Year synchronization verified successfully.');

// 4. Test onTick error isolation
const failingState = {
    currentYear: 1872,
    currentMonth: 5,
    updateHUD: () => {},
    showToast: () => {},
    renderer: null
};
const failingTm = new TimeManager(failingState, () => {
    throw new Error('Simulated crash in heavy simulation subsystem');
});

assert.doesNotThrow(() => {
    failingTm.step();
}, 'TimeManager.step() must not crash when onTick throws');
assert.strictEqual(failingState.currentMonth, 6, 'Month must still advance even if onTick crashes');

console.log('✓ TimeManager fault isolation verified.');

// Restore original methods
SOUND.playMonthAdvance = origMonthAdv;
SOUND.playNewYearBell = origNewYear;

console.log('🎉 ALL MONTH CHIME & CALENDAR SYNCHRONIZATION TESTS PASSED (100%)');
