# Project Meiji: Iteration 28.1 — Visual Tooltip & Inspector Panel Integration

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep `build_drawer.js` strictly under **450 lines**.
  * Keep styling additions organized within `public/css/hud.css`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client engine, modern browser.

---

## 2. Problem Statement
* Hovering currently only displays the browser's default, plain `title="..."` tooltip.
* Locked items have `pointer-events: none` applied via CSS, preventing players from hovering or tapping to see what buildings do, what they cost, or at what tier they unlock.

---

## 3. UI Implementation: Dedicated Tool Inspector Strip (`build_drawer.js`)

### DOM Structure
Add a permanent, elegant inspector strip at the bottom of the `#build-drawer` container (below the tool grid):

```html
<div id="drawer-tool-inspector" class="washi-inspector-strip">
  <div class="inspector-header">
    <span id="inspector-tool-name" class="inspector-name">Select or hover over an item</span>
    <span id="inspector-tool-cost" class="inspector-cost"></span>
  </div>
  <p id="inspector-tool-effect" class="inspector-desc">Hover over any building or tool (including locked items) to view its purpose and municipal benefits.</p>
  <div id="inspector-tool-lock-status" class="inspector-lock-note"></div>
</div>
```

### Event Handling & Interaction (Desktop + Mobile)
1. **Enable Interaction on Locked Cards:**
   * In `hud.css`, adjust `.tool-locked`:
     * Use `cursor: help;` (or `not-allowed;`).
     * **Remove** `pointer-events: none;` so `mouseenter`, `mouseleave`, and `touchstart` events fire reliably.
   * In the card click handler:
     * If the tool is locked, update `#drawer-tool-inspector` to show the lock requirement, but block the actual placement action.
2. **Desktop (Hover Flow):**
   * On `mouseenter` of any card (locked or unlocked), query `toolCatalogData.js` via `getToolCatalogEntry(toolKey)`.
   * Populate `#drawer-tool-inspector`:
     * **Title:** Localized tool name (e.g., `Watchtower (Hinomi-yagura)`).
     * **Cost / Upkeep:** `Cost: ¥250 | Upkeep: ¥5/mo`.
     * **Mechanical Effect:** Clear gameplay description (e.g., *"Detects fires within a 6-tile radius and rings alarm bell to summon nearby Hikeshi brigades."*).
     * **Lock Status:** If locked, display a clear warning: *"🔒 Unlocks at Post Town (Tier 2 - Population 100)"*.
   * On `mouseleave` of the drawer grid: Reset to default hint text unless a tool is actively selected.
3. **Mobile (Touch / Tap Flow):**
   * Tapping any card updates `#drawer-tool-inspector`.
   * If unlocked, tapping also equips the tool for placement.
   * If locked, tapping simply updates the inspector strip without equipping.

---

## 4. CSS Styling (`public/css/hud.css`)
* `.washi-inspector-strip`:
  * Subtle parchment panel at the bottom of the drawer:
    * `background: #fbf7ee;`
    * `border-top: 1px solid #d8cfc0;`
    * `padding: 10px 14px;`
    * `min-height: 64px;`
* `.inspector-name`: `font-weight: bold; color: #2c2416; font-size: 14px;`
* `.inspector-cost`: `color: #8c2d19; font-weight: 600; font-size: 13px; float: right;`
* `.inspector-desc`: `font-size: 12px; color: #5a5043; margin: 4px 0 0 0; line-height: 1.4;`
* `.inspector-lock-note`: `font-size: 12px; color: #b03a2e; font-weight: bold; margin-top: 4px;`

---

## 5. Execution Order for Agent
1. Apply the `/ponytail` skill.
2. Update `.tool-locked` in `hud.css` to allow pointer events for inspection.
3. Inject `#drawer-tool-inspector` into `build_drawer.js` or `index.html`.
4. Connect `mouseenter`, `focus`, and click/touch listeners to populate the inspector dynamically from `toolCatalogData.js`.
5. Run automated test suites and verify in browser that both unlocked and locked cards display their mechanical details clearly.