// Project Meiji - Iteration 28.1 Automated Verification Test Suite (test_iteration28_1.js)
// ponytail: deterministic verification of tool inspector strip, locked tool interaction, and file size governance

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 28.1 Verification Test Suite ---');

// 1. Strict File Size Audit
console.log('1. Checking File Size Governance...');
const drawerPath = path.join(rootDir, 'public', 'js', 'ui', 'build_drawer.js');
assert.strictEqual(fs.existsSync(drawerPath), true, 'build_drawer.js must exist');
const drawerLines = fs.readFileSync(drawerPath, 'utf8').split('\n').length;
console.log(`   build_drawer.js line count: ${drawerLines}`);
assert.strictEqual(drawerLines < 450, true, `build_drawer.js must be strictly < 450 lines (currently ${drawerLines})`);

const catalogPath = path.join(rootDir, 'public', 'js', 'config', 'toolCatalogData.js');
const catalogLines = fs.readFileSync(catalogPath, 'utf8').split('\n').length;
console.log(`   toolCatalogData.js line count: ${catalogLines}`);
assert.strictEqual(catalogLines < 250, true, `toolCatalogData.js must be < 250 lines (currently ${catalogLines})`);

console.log('  ✓ File size limits strictly satisfied.');

// 2. DOM Markup Verification
console.log('2. Verifying DOM Markup in public/index.html...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

assert.strictEqual(indexHtml.includes('id="drawer-tool-inspector"'), true, '#drawer-tool-inspector element present');
assert.strictEqual(indexHtml.includes('id="inspector-tool-name"'), true, '#inspector-tool-name element present');
assert.strictEqual(indexHtml.includes('id="inspector-tool-cost"'), true, '#inspector-tool-cost element present');
assert.strictEqual(indexHtml.includes('id="inspector-tool-effect"'), true, '#inspector-tool-effect element present');
assert.strictEqual(indexHtml.includes('id="inspector-tool-lock-status"'), true, '#inspector-tool-lock-status element present');

// Verify placed within #build-drawer before </nav>
const navIndex = indexHtml.indexOf('</nav>');
const inspectorIndex = indexHtml.indexOf('id="drawer-tool-inspector"');
assert.strictEqual(inspectorIndex > 0 && inspectorIndex < navIndex, true, 'Inspector strip must be inside build drawer before </nav>');
console.log('  ✓ DOM markup verified.');

// 3. CSS Verification
console.log('3. Verifying CSS Styling and Locked Tool Interaction...');
const drawerCss = fs.readFileSync(path.join(rootDir, 'public', 'css', 'drawer.css'), 'utf8');

// Match .drawer-item-btn.tool-locked rule block
const lockedMatch = drawerCss.match(/\.drawer-item-btn\.tool-locked\s*\{([^}]+)\}/);
assert(lockedMatch, '.drawer-item-btn.tool-locked rule must exist');
const lockedBody = lockedMatch[1];
assert.strictEqual(lockedBody.includes('pointer-events: none'), false, 'Locked cards must NOT have pointer-events: none');
assert.strictEqual(lockedBody.includes('cursor: help') || lockedBody.includes('cursor: not-allowed'), true, 'Locked cards must have valid cursor');

assert.strictEqual(drawerCss.includes('.washi-inspector-strip'), true, '.washi-inspector-strip class defined in drawer.css');
assert.strictEqual(drawerCss.includes('.inspector-header'), true, '.inspector-header class defined in drawer.css');
assert.strictEqual(drawerCss.includes('.inspector-name'), true, '.inspector-name class defined in drawer.css');
assert.strictEqual(drawerCss.includes('.inspector-cost'), true, '.inspector-cost class defined in drawer.css');
assert.strictEqual(drawerCss.includes('.inspector-desc'), true, '.inspector-desc class defined in drawer.css');
assert.strictEqual(drawerCss.includes('.inspector-lock-note'), true, '.inspector-lock-note class defined in drawer.css');

console.log('  ✓ CSS interaction & styling verified.');

// 4. Functional Testing of BuildDrawer Inspector
console.log('4. Testing Functional Inspector Logic in BuildDrawer...');

// Minimal Node.js DOM Shims
class MockElement {
    constructor(id = '', className = '') {
        this.id = id;
        this.className = className;
        this.classList = {
            add: (c) => { if (!this.className.includes(c)) this.className += ` ${c}`; },
            remove: (c) => { this.className = this.className.replace(c, '').trim(); },
            contains: (c) => this.className.includes(c),
        };
        this.style = {};
        this.dataset = {};
        this.textContent = '';
        this.innerHTML = '';
        this.children = [];
        this._listeners = {};
    }
    addEventListener(event, cb) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(cb);
    }
    click() {
        if (this._listeners['click']) {
            this._listeners['click'].forEach(cb => cb({ stopPropagation: () => {} }));
        }
    }
    trigger(event) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb({ stopPropagation: () => {} }));
        }
    }
    querySelector(sel) { return null; }
    querySelectorAll(sel) { return []; }
    appendChild(child) { this.children.push(child); return child; }
}

const mockDom = {
    'active-tool-btn': new MockElement('active-tool-btn'),
    'fab-tool-icon': new MockElement('fab-tool-icon'),
    'fab-tool-name': new MockElement('fab-tool-name'),
    'fab-rotate-btn': new MockElement('fab-rotate-btn'),
    'fab-rotate-deg': new MockElement('fab-rotate-deg'),
    'fab-cancel-btn': new MockElement('fab-cancel-btn'),
    'build-drawer': new MockElement('build-drawer'),
    'drawer-overlay': new MockElement('drawer-overlay'),
    'drawer-close-btn': new MockElement('drawer-close-btn'),
    'drawer-tool-inspector': new MockElement('drawer-tool-inspector'),
    'inspector-tool-name': new MockElement('inspector-tool-name'),
    'inspector-tool-cost': new MockElement('inspector-tool-cost'),
    'inspector-tool-effect': new MockElement('inspector-tool-effect'),
    'inspector-tool-lock-status': new MockElement('inspector-tool-lock-status'),
};

const roadBtn = new MockElement('', 'drawer-item-btn');
roadBtn.dataset.tool = 'road';
const watchtowerBtn = new MockElement('', 'drawer-item-btn tool-locked');
watchtowerBtn.dataset.tool = 'watchtower';

global.document = {
    documentElement: { lang: 'en' },
    getElementById: (id) => mockDom[id] || null,
    querySelectorAll: (sel) => {
        if (sel === '.drawer-item-btn') return [roadBtn, watchtowerBtn];
        return [];
    },
    createElement: () => new MockElement()
};

import { BuildDrawer } from '../public/js/ui/build_drawer.js';
import { i18n } from '../public/js/i18n.js';

let selectedTool = null;
const drawer = new BuildDrawer((tool) => { selectedTool = tool; });

// 4a. Default State
i18n.setLanguage('en');
drawer.updateInspector(null);
assert.strictEqual(mockDom['inspector-tool-name'].textContent, 'Select or hover over an item');
assert.strictEqual(mockDom['inspector-tool-cost'].textContent, '');
assert.strictEqual(mockDom['inspector-tool-effect'].textContent.includes('Hover over any building or tool'), true);
assert.strictEqual(mockDom['inspector-tool-lock-status'].textContent, '');

// 4b. Unlocked Tool Inspection (Road)
drawer.updateInspector('road');
assert.strictEqual(mockDom['inspector-tool-name'].textContent, 'Dirt Road');
assert.strictEqual(mockDom['inspector-tool-cost'].textContent, 'Cost: ¥10 | Upkeep: ¥1/mo');
assert.strictEqual(mockDom['inspector-tool-effect'].textContent.includes('Essential dirt thoroughfare'), true);
assert.strictEqual(mockDom['inspector-tool-lock-status'].style.display, 'none');

// 4c. Locked Tool Inspection (Watchtower at Tier 1)
drawer.updateTownTier(1);
drawer.updateInspector('watchtower');
assert.strictEqual(mockDom['inspector-tool-name'].textContent, 'Watchtower (Hinomi-yagura)');
assert.strictEqual(mockDom['inspector-tool-cost'].textContent, 'Cost: ¥250 | Upkeep: ¥5/mo');
assert.strictEqual(mockDom['inspector-tool-effect'].textContent.includes('Detects blazes across 6 tiles'), true);
assert.strictEqual(mockDom['inspector-tool-lock-status'].style.display, 'block');
assert.strictEqual(mockDom['inspector-tool-lock-status'].textContent.includes('Tier 2'), true);
assert.strictEqual(mockDom['inspector-tool-lock-status'].textContent.includes('100'), true);

// 4d. Click Protection on Locked Card
selectedTool = null;
watchtowerBtn.click();
assert.strictEqual(selectedTool, null, 'Clicking locked tool must NOT trigger selection');
assert.strictEqual(mockDom['inspector-tool-lock-status'].textContent.includes('Tier 2'), true);

// 4e. Click on Unlocked Card
roadBtn.click();
assert.strictEqual(selectedTool, 'road', 'Clicking unlocked tool must select tool');

// 4f. Bilingual Parity in Inspector
i18n.setLanguage('ja');
drawer.updateInspector('watchtower');
assert.strictEqual(mockDom['inspector-tool-name'].textContent, '火の見櫓');
assert.strictEqual(mockDom['inspector-tool-cost'].textContent, '費用: ¥250 | 維持費: ¥5/月');
assert.strictEqual(mockDom['inspector-tool-effect'].textContent.includes('消火隊を誘導'), true);
assert.strictEqual(mockDom['inspector-tool-lock-status'].textContent.includes('第2段階'), true);

console.log('  ✓ BuildDrawer inspector updates, click protection, and bilingual parity verified.');
console.log('\n>>> All Iteration 28.1 tests passed successfully! <<<');
