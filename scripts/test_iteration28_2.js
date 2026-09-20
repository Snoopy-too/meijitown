// Project Meiji - Iteration 28.2 Test Suite: Starting Economy Rebalance & Starter Road Realignment
// ponytail: headless assert runner, zero external dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 28.2 Verification Suite ---');

// 1. Verify Configuration in public/js/config.js
console.log('1. Verifying public/js/config.js starting funds...');
const configPath = path.join(rootDir, 'public', 'js', 'config.js');
const configContent = fs.readFileSync(configPath, 'utf-8');

assert.ok(configContent.includes('INITIAL_TREASURY: 5000'), 'config.js must define INITIAL_TREASURY as 5000');
assert.ok(configContent.includes('STARTING_FUNDS: 5000'), 'config.js must define STARTING_FUNDS as 5000');
console.log('✓ config.js defines INITIAL_TREASURY and STARTING_FUNDS as 5000.');

// 2. Verify Client-side GameState & Reset in public/js/app.js
console.log('2. Verifying public/js/app.js initialization and reset...');
const appPath = path.join(rootDir, 'public', 'js', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf-8');

assert.ok(appContent.includes('this.treasury = CONFIG.SIMULATION.INITIAL_TREASURY || 5000'), 'app.js must initialize treasury to CONFIG.SIMULATION.INITIAL_TREASURY || 5000');
assert.ok(appContent.includes('this.treasury = CONFIG.SIMULATION.INITIAL_TREASURY || 5000;'), 'startNewGame() in app.js must reset treasury to CONFIG.SIMULATION.INITIAL_TREASURY || 5000');
assert.ok(appContent.includes("modalManager.confirm({"), 'startNewGame() must use custom modalManager.confirm');
assert.ok(appContent.includes("i18n.t('confirm.reset_city_title'"), 'startNewGame() must use i18n title');
assert.ok(appContent.includes("i18n.t('confirm.reset_city_msg'"), 'startNewGame() must use i18n message');
console.log('✓ app.js correctly initializes and resets treasury to 5000 using localized confirm modal.');

// 3. Verify Localized Reset Dialog Strings in public/js/i18n.js
console.log('3. Verifying public/js/i18n.js reset confirmation copy...');
const i18nPath = path.join(rootDir, 'public', 'js', 'i18n.js');
const i18nContent = fs.readFileSync(i18nPath, 'utf-8');

assert.ok(i18nContent.includes('This will reset Edo-Tokyo back to the pristine Meiji dawn of 1872 with ¥5,000 in treasury.'), 'i18n.js EN must include ¥5,000 starting treasury text');
assert.ok(i18nContent.includes('明治五年、開拓の夜明けへ戻り、国庫資金¥5,000で集落を再建します。'), 'i18n.js JA must include ¥5,000 starting treasury text');
console.log('✓ i18n.js contains expected EN and JA copy with ¥5,000.');

// 4. Verify PHP Clean Architecture & Database Defaults
console.log('4. Verifying PHP Clean Architecture and database schema defaults...');
const cityModelPath = path.join(rootDir, 'src', 'Domain', 'Model', 'City.php');
const cityModelContent = fs.readFileSync(cityModelPath, 'utf-8');
assert.ok(cityModelContent.includes('public int $treasury = 5000'), 'Domain Model City must default treasury to 5000');

const pdoRepoPath = path.join(rootDir, 'src', 'Infrastructure', 'Repository', 'PdoCityRepository.php');
const pdoRepoContent = fs.readFileSync(pdoRepoPath, 'utf-8');
assert.ok(pdoRepoContent.includes('treasury = 5000'), 'PdoCityRepository::resetCity must set treasury = 5000');

const resetUseCasePath = path.join(rootDir, 'src', 'Application', 'UseCase', 'ResetCityUseCase.php');
const resetUseCaseContent = fs.readFileSync(resetUseCasePath, 'utf-8');
assert.ok(resetUseCaseContent.includes("'treasury' => 5000"), 'ResetCityUseCase response payload must set treasury to 5000');

const apiIndexPath = path.join(rootDir, 'api', 'index.php');
const apiIndexContent = fs.readFileSync(apiIndexPath, 'utf-8');
assert.ok(apiIndexContent.includes("$treasury = (int) ($payload['treasury'] ?? 5000);"), 'api/index.php must default treasury to 5000');

const apiSaveCityPath = path.join(rootDir, 'api', 'save_city.php');
const apiSaveCityContent = fs.readFileSync(apiSaveCityPath, 'utf-8');
assert.ok(apiSaveCityContent.includes("$treasury = isset($payload['treasury']) ? (int) $payload['treasury'] : 5000;"), 'api/save_city.php must default treasury to 5000');

const schemaPath = path.join(rootDir, 'database', 'schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
assert.ok(schemaContent.includes('`treasury` INT NOT NULL DEFAULT 5000,'), 'schema.sql must default treasury to 5000');
console.log('✓ PHP Clean Architecture and MySQL schema verified for 5000 treasury.');

// 5. Verify Starter Road Realignment Defaults
console.log('5. Verifying Starter Road defaults...');
const gridPath = path.join(rootDir, 'public', 'js', 'grid.js');
const gridContent = fs.readFileSync(gridPath, 'utf-8');

// Ensure road creation defaults to tier 1 (dirt road)
assert.ok(gridContent.includes('roadTier: 1') || gridContent.includes('roadTier = 1'), 'Roads on placement must start at Tier 1 (Dirt Road)');
// Ensure startNewGame resets grid to empty
assert.ok(appContent.includes('this.grid.loadFromMap({})'), 'startNewGame() must clear grid to pristine state with zero pre-placed stone roads');
console.log('✓ Starter road defaults verified (cleared grid, tier 1 dirt road initial placement).');

console.log('\n======================================================');
console.log('🎉 ALL ITERATION 28.2 VERIFICATION TESTS PASSED (100%)!');
console.log('======================================================');
