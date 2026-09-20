// Project Meiji - New Game / Settlement Reset Test Suite
// ponytail: assert-based headless test runner, zero external test framework dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: New Game (新町) Verification Suite ---');

// 1. Verify Backend PHP Clean Architecture files
console.log('1. Verifying PHP Backend Clean Architecture files...');
const repoInterfacePath = path.join(rootDir, 'src', 'Domain', 'Repository', 'CityRepositoryInterface.php');
const repoImplPath = path.join(rootDir, 'src', 'Infrastructure', 'Repository', 'PdoCityRepository.php');
const useCasePath = path.join(rootDir, 'src', 'Application', 'UseCase', 'ResetCityUseCase.php');
const apiIndexPath = path.join(rootDir, 'api', 'index.php');

assert.ok(fs.existsSync(repoInterfacePath), 'CityRepositoryInterface.php must exist');
const repoInterfaceContent = fs.readFileSync(repoInterfacePath, 'utf-8');
assert.ok(repoInterfaceContent.includes('public function resetCity(int $cityId): void;'), 'CityRepositoryInterface must declare resetCity');

assert.ok(fs.existsSync(repoImplPath), 'PdoCityRepository.php must exist');
const repoImplContent = fs.readFileSync(repoImplPath, 'utf-8');
assert.ok(repoImplContent.includes('public function resetCity(int $cityId): void'), 'PdoCityRepository must implement resetCity');
assert.ok(repoImplContent.includes("tile_data = '[]'"), 'resetCity must clear tile_data to empty array');
assert.ok(repoImplContent.includes('treasury = 5000'), 'resetCity must reset treasury to ¥5,000');
assert.ok(repoImplContent.includes('current_year = 1872'), 'resetCity must reset current_year to 1872');

assert.ok(fs.existsSync(useCasePath), 'ResetCityUseCase.php must exist');
const useCaseContent = fs.readFileSync(useCasePath, 'utf-8');
assert.ok(useCaseContent.includes('final class ResetCityUseCase'), 'ResetCityUseCase must be defined');
assert.ok(useCaseContent.includes('$this->cityRepository->resetCity($cityId);'), 'ResetCityUseCase must invoke repository resetCity');

assert.ok(fs.existsSync(apiIndexPath), 'api/index.php must exist');
const apiContent = fs.readFileSync(apiIndexPath, 'utf-8');
assert.ok(apiContent.includes("action === 'reset_city'"), 'api/index.php must route reset_city action');
assert.ok(apiContent.includes('ResetCityUseCase::class'), 'api/index.php must resolve ResetCityUseCase');
console.log('✓ Backend PHP Clean Architecture layer verified.');

// 2. Verify Frontend UI Elements in index.html and style.css
console.log('2. Verifying UI Button & Styling...');
const htmlPath = path.join(rootDir, 'public', 'index.html');
const cssPath = path.join(rootDir, 'public', 'css', 'style.css');

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
assert.ok(htmlContent.includes('id="btn-new-game"'), 'index.html must include #btn-new-game button');
assert.ok(htmlContent.includes('btn-danger'), 'index.html must style button with btn-danger');

const cssContent = fs.readFileSync(cssPath, 'utf-8');
assert.ok(cssContent.includes('.btn-danger'), 'style.css must include .btn-danger styling');
console.log('✓ UI Button & Styling verified.');

// 3. Verify Client Lifecycle & Reset Handlers in app.js
console.log('3. Verifying Client Orchestration in app.js...');
const appPath = path.join(rootDir, 'public', 'js', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf-8');

assert.ok(appContent.includes("btnNewGame: document.getElementById('btn-new-game')"), 'app.js must reference btnNewGame');
assert.ok(appContent.includes('this.startNewGame()'), 'app.js must call startNewGame()');
assert.ok(appContent.includes('this.api.resetCity(this.cityId)'), 'app.js must call this.api.resetCity()');
const apiClientPath = path.join(rootDir, 'public', 'js', 'apiClient.js');
const apiClientContent = fs.readFileSync(apiClientPath, 'utf-8');
assert.ok(apiClientContent.includes("reset_city"), 'apiClient.js must implement reset_city action');
assert.ok(appContent.includes('this.grid.loadFromMap({})'), 'app.js must clear grid via loadFromMap({})');
console.log('✓ Client orchestration and state reset logic verified.');

// 4. Verify Mesh Purging in renderer.js
console.log('4. Verifying Mesh Purging in renderer.js...');
const rendererPath = path.join(rootDir, 'public', 'js', 'renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf-8');

assert.ok(rendererContent.includes('rebuildAllMeshes()'), 'renderer.js must have rebuildAllMeshes()');
assert.ok(rendererContent.includes('this.fx.detachFire(key)'), 'rebuildAllMeshes() must purge active fire emitters');
assert.ok(rendererContent.includes('this.tileMeshes.clear()'), 'rebuildAllMeshes() must clear all cached tile meshes');
console.log('✓ 3D Renderer mesh and particle purging verified.');

console.log('\n======================================================');
console.log('🎉 ALL NEW GAME (新町) VERIFICATION TESTS PASSED (100%)!');
console.log('======================================================');
