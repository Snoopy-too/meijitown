import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("=== Project Meiji: Milestone & Citizen Unlock Verification Test ===");

// 1. File size audits
const filesToAudit = [
    { file: 'public/js/milestoneManager.js', max: 350 },
    { file: 'public/js/ui/build_drawer.js', max: 450 },
    { file: 'public/js/tools.js', max: 300 },
    { file: 'public/js/config/toolCatalogData.js', max: 250 }
];

for (const { file, max } of filesToAudit) {
    const fullPath = path.resolve(rootDir, file);
    const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
    assert.ok(lineCount <= max, `File ${file} exceeded line budget: ${lineCount} > ${max}`);
    console.log(`  ✓ ${file}: ${lineCount} lines (Budget <= ${max})`);
}

// 2. Milestone Tiers verification
import { MILESTONE_TIERS } from '../public/js/milestoneManager.js';
import { TOOL_TIER_REQUIREMENTS } from '../public/js/ui/build_drawer.js';
import { CONFIG } from '../public/js/config.js';

assert.strictEqual(MILESTONE_TIERS.length, 4, "Must define 4 milestone tiers");
assert.strictEqual(MILESTONE_TIERS[0].popMin, 0, "Tier 1 starts at 0 pop");
assert.strictEqual(MILESTONE_TIERS[1].popMin, 100, "Tier 2 starts at 100 pop");
assert.strictEqual(MILESTONE_TIERS[2].popMin, 300, "Tier 3 starts at 300 pop");
assert.strictEqual(MILESTONE_TIERS[3].popMin, 600, "Tier 4 starts at 600 pop");

// Verify Tier 4 includes power plant, waterworks, pavilion
const t4FeaturesEn = MILESTONE_TIERS[3].featuresEn.join(' ');
assert.ok(t4FeaturesEn.includes('Power Plant'), "Tier 4 features must include Power Plant");
assert.ok(t4FeaturesEn.includes('Water Filtration'), "Tier 4 features must include Water Filtration");
assert.ok(t4FeaturesEn.includes('Exposition Pavilion'), "Tier 4 features must include Exposition Pavilion");

// Verify Tier 2 includes stone paving, well, canal
const t2FeaturesEn = MILESTONE_TIERS[1].featuresEn.join(' ');
assert.ok(t2FeaturesEn.includes('Canal'), "Tier 2 features must include Canal");
assert.ok(t2FeaturesEn.includes('Stone Paving'), "Tier 2 features must include Stone Paving");
assert.ok(t2FeaturesEn.includes('Wells'), "Tier 2 features must include Wells");

// Verify Tier 3 includes bathhouses, rail, school
const t3FeaturesEn = MILESTONE_TIERS[2].featuresEn.join(' ');
assert.ok(t3FeaturesEn.includes('Rail'), "Tier 3 features must include Rail");
assert.ok(t3FeaturesEn.includes('Bathhouse'), "Tier 3 features must include Bathhouse");

// 3. Verify TOOL_TIER_REQUIREMENTS at 100, 300, 600
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.POWER_PLANT].pop, 600);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.WATERWORKS].pop, 600);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.PAVILION].pop, 600);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.RAIL_TRACK].pop, 300);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.CANAL].pop, 100);

console.log("  ✓ MILESTONE_TIERS thresholds and feature lists cleanly synchronized.");

// 4. Verify tools.js Harbor Pier tech check
const toolsJsContent = fs.readFileSync(path.resolve(rootDir, 'public/js/tools.js'), 'utf8');
assert.ok(toolsJsContent.includes('this.state.milestones.currentTier >= 3'), "tools.js must check this.state.milestones, not milestoneManager");
console.log("  ✓ tools.js state.milestones reference verified.");

console.log("\n🎉 ALL MILESTONE & UNLOCK TESTS PASSED (100%)!\n");
