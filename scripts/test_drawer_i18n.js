import assert from 'node:assert';
import { i18n } from '../public/js/i18n.js';
import { TOOL_CATALOG, getToolCatalogEntry } from '../public/js/config/toolCatalogData.js';
import { CONFIG } from '../public/js/config.js';

console.log('=== Verifying Drawer & Inspector Localization ===');

// 1. Check Tool Catalog Coverage
console.log('1. Checking Tool Catalog translations for en and ja...');
for (const [key, tool] of Object.entries(TOOL_CATALOG)) {
    assert.ok(tool.name?.ja, `Tool ${key} must have Japanese name`);
    assert.ok(tool.name?.en, `Tool ${key} must have English name`);
    assert.ok(tool.effect?.ja, `Tool ${key} must have Japanese effect`);
    assert.ok(tool.effect?.en, `Tool ${key} must have English effect`);
}
console.log('  ✓ All catalog tools have both JA and EN names and effects.');

// 2. Check Japanese Mode
console.log('2. Testing Japanese mode for catalog items & inspector...');
i18n.setLanguage('ja');
assert.strictEqual(i18n.getLanguage(), 'ja');

assert.strictEqual(i18n.t('tab.infra'), '🛣️ 交通・水路');
assert.strictEqual(i18n.t('tab.zones'), '🏡 地区指定');
assert.strictEqual(i18n.t('tab.civic'), '🏯 公共施設');
assert.strictEqual(i18n.t('tab.leisure'), '🍵 娯楽・文化');

assert.strictEqual(i18n.t('tool.road'), '往来土道');
assert.strictEqual(i18n.t('tool.stone_road'), '石畳舗装');
assert.strictEqual(i18n.t('tool.canal'), '堀・水路');
assert.strictEqual(i18n.t('tool.power_plant'), '石炭火力発電所');
assert.strictEqual(i18n.t('tool.bulldozer'), '撤去・取壊し');

assert.strictEqual(getToolCatalogEntry('road').name.ja, '往来土道');
assert.strictEqual(getToolCatalogEntry('road').effect.ja, '歩行者や荷車の往来を支える基礎的な土道。');
assert.strictEqual(getToolCatalogEntry('power_plant').name.ja, '石炭火力発電所');
assert.strictEqual(getToolCatalogEntry('power_plant').effect.ja, '蒸気火力で近代工場群や銀座煉瓦街へ電力を供給。周辺に煤煙。');

// 3. Check English Mode
console.log('3. Testing English mode...');
i18n.setLanguage('en');
assert.strictEqual(i18n.getLanguage(), 'en');
assert.strictEqual(i18n.t('tab.infra'), '🛣️ Infrastructure');
assert.strictEqual(i18n.t('tool.road'), 'Dirt Road');
assert.strictEqual(getToolCatalogEntry('road').name.en, 'Dirt Road');
assert.strictEqual(getToolCatalogEntry('road').effect.en, 'Essential dirt thoroughfare for pedestrian commerce and horse carts.');

console.log('🎉 Drawer & Inspector localization test passed 100%!');
