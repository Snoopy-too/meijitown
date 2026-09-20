// Project Meiji - Bilingual i18n Automated Test Suite
// ponytail: deterministic verification of translation parity, era date formatting, and 600-line limit

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { i18n, TRANSLATIONS } from '../public/js/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Bilingual Localization Automated Test Suite ---');

// 1. Dictionary Parity Test
console.log('1. Verifying Translation Dictionary Parity...');
const enKeys = Object.keys(TRANSLATIONS.en).sort();
const jaKeys = Object.keys(TRANSLATIONS.ja).sort();

assert.strictEqual(enKeys.length > 0, true, 'English dictionary must not be empty');
assert.strictEqual(jaKeys.length > 0, true, 'Japanese dictionary must not be empty');

const missingInJa = enKeys.filter(k => !(k in TRANSLATIONS.ja));
const missingInEn = jaKeys.filter(k => !(k in TRANSLATIONS.en));

if (missingInJa.length > 0) {
    console.error('Keys in EN but missing in JA:', missingInJa);
}
if (missingInEn.length > 0) {
    console.error('Keys in JA but missing in EN:', missingInEn);
}

assert.strictEqual(missingInJa.length, 0, `All EN keys must exist in JA (missing ${missingInJa.length})`);
assert.strictEqual(missingInEn.length, 0, `All JA keys must exist in EN (missing ${missingInEn.length})`);

for (const key of enKeys) {
    assert(typeof TRANSLATIONS.en[key] === 'string' && TRANSLATIONS.en[key].length > 0, `EN key "${key}" must be non-empty string`);
    assert(typeof TRANSLATIONS.ja[key] === 'string' && TRANSLATIONS.ja[key].length > 0, `JA key "${key}" must be non-empty string`);
}
console.log(`  ✓ Perfect parity across ${enKeys.length} translation keys.`);

// 2. Language Switching & Translation Resolution
console.log('2. Testing Language Switching & Translation Resolution...');
i18n.setLanguage('en');
assert.strictEqual(i18n.getLanguage(), 'en');
assert.strictEqual(i18n.t('hud.settlement'), 'Settlement');
assert.strictEqual(i18n.t('action.save'), 'Save');
assert.strictEqual(i18n.t('tool.rail_track'), 'Rail Tracks');
assert.strictEqual(i18n.t('hud.rci_r'), 'R');
assert.strictEqual(i18n.t('hud.rci_c'), 'C');
assert.strictEqual(i18n.t('hud.rci_i'), 'I');

i18n.setLanguage('ja');
assert.strictEqual(i18n.getLanguage(), 'ja');
assert.strictEqual(i18n.t('hud.settlement'), '拠点集落');
assert.strictEqual(i18n.t('action.save'), '保存');
assert.strictEqual(i18n.t('tool.rail_track'), '鉄道路線');
assert.strictEqual(i18n.t('hud.rci_r'), '住');
assert.strictEqual(i18n.t('hud.rci_c'), '商');
assert.strictEqual(i18n.t('hud.rci_i'), '工');
assert.strictEqual(i18n.t('hud.rci_title'), '地区需要 (住: 居住, 商: 商業, 工: 工業)');

// Toggle test
const toggled1 = i18n.toggleLanguage();
assert.strictEqual(toggled1, 'en');
assert.strictEqual(i18n.getLanguage(), 'en');

const toggled2 = i18n.toggleLanguage();
assert.strictEqual(toggled2, 'ja');
assert.strictEqual(i18n.getLanguage(), 'ja');

// Fallback test
assert.strictEqual(i18n.t('non.existent.key', 'FallbackValue'), 'FallbackValue');
console.log('  ✓ Language switching and fallback resolution verified.');

// 3. Era Date Formatting Test
console.log('3. Testing Era Date Formatting...');
i18n.setLanguage('en');
const enDate1872 = i18n.formatEraDate(1872, 1);
assert.strictEqual(enDate1872, 'Meiji 5 (1872) - January');

const enDate1868 = i18n.formatEraDate(1868, 10);
assert.strictEqual(enDate1868, 'Meiji 1 (1868) - October');

i18n.setLanguage('ja');
const jaDate1872 = i18n.formatEraDate(1872, 1);
assert.strictEqual(jaDate1872, '明治5年 (1872年) 睦月 (1月)');

const jaDate1868 = i18n.formatEraDate(1868, 1);
assert.strictEqual(jaDate1868, '明治元年 (1868年) 睦月 (1月)', 'First year of Meiji should be 元年 in Japanese');
console.log('  ✓ Era date formatting verified for both languages.');

// 4. Validate index.html data-i18n attributes
console.log('4. Verifying index.html data-i18n attributes...');
const htmlContent = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const i18nMatches = [...htmlContent.matchAll(/data-i18n=["']([^"']+)["']/g)].map(m => m[1]);
const i18nTitleMatches = [...htmlContent.matchAll(/data-i18n-title=["']([^"']+)["']/g)].map(m => m[1]);

for (const key of i18nMatches) {
    assert(key in TRANSLATIONS.en, `data-i18n key "${key}" from index.html must exist in TRANSLATIONS`);
}
for (const key of i18nTitleMatches) {
    assert(key in TRANSLATIONS.en, `data-i18n-title key "${key}" from index.html must exist in TRANSLATIONS`);
}
console.log(`  ✓ All ${i18nMatches.length + i18nTitleMatches.length} HTML data-i18n attributes map to valid keys.`);

// 5. Codebase Line Limit Audit (< 600 lines)
console.log('5. Auditing Codebase File Lengths (Strict < 600 lines)...');
function checkDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            checkDirectory(fullPath);
        } else if (file.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').length;
            const relPath = path.relative(rootDir, fullPath);
            assert(lines <= 600, `File ${relPath} exceeds 600 lines (actual: ${lines})`);
            console.log(`  ✓ ${relPath} (${lines} lines)`);
        }
    }
}
checkDirectory(path.join(rootDir, 'public', 'js'));

console.log('\n✅ All Bilingual Localization tests PASSED successfully!');
