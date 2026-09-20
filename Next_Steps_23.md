# Project Meiji: Iteration 26 — Multi-Tile Footprint Previews, Tile Identity & Tier Gating

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all modified files strictly under **500–600 lines**.
  * If `tools.js` or `build_drawer.js` approaches 500 lines, extract helper logic into `footprintPreview.js`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Issue A: Multi-Tile Footprint Hover Preview (`footprintPreview.js`)
Multi-tile structures currently display only a 1x1 green preview box during placement.

### Implementation Tasks
* **Footprint Metadata:** Ensure all tools declare their grid dimensions:
  * `1x1`: Roads, Canals, Machiya, Workshops, Kōban, Watchtowers, Wells, Teahouses.
  * `2x2`: Primary School, Coal Steam Plant, Cargo Pier.
  * `3x3`: Exhibition Pavilion.
* **Dynamic Cursor Mesh:**
  * When hovering over grid coordinates `(x, y)` in placement mode:
    * Highlight all tiles in the footprint: `[x .. x+w-1, y .. y+h-1]`.
    * If ALL tiles in the footprint are buildable meadow: highlight in translucent green (`#2ecc71`, opacity `0.45`).
    * If ANY tile is obstructed (water, road, building): highlight the entire footprint in translucent red (`#e74c3c`, opacity `0.55`) and disallow placement.

---

## 3. Issue B: Tile Identity Glitch (Coal Steam Plant -> Fire Watchtower)
Clicking the Coal Steam Plant reports "Fire Watchtower" in the Surveyor's Scope.

### Implementation Tasks
* **Tile Type Audit (`config.js` / `surveyorScope.js`):**
  * Check the tile data assigned upon placing the Coal Steam Plant.
  * Ensure the main tile and sub-tiles have `type: 'POWER_PLANT'` (or `CONFIG.TILES.POWER_PLANT`), not `WATCHTOWER`.
  * Update `surveyorScope.js` with correct labels:
    * English: `Coal Steam Power Plant (Karyoku Hatsudensho)`
    * Japanese: `火力発電所 (石炭発電)`
    * Stage / Status: `Active Grid Generator (Pollution: 4-Tile Radius)`

---

## 4. Issue C: Milestone Gating Enforcement in Catalogue
Late-game items are currently accessible at Village (T1, Pop 12).

### Implementation Tasks
* **Strict Tool Requirements:**
  * **Tier 1 (Village, Pop 0+):** Dirt Road, Machiya, Shouten, Workshop, Demolish, Survey.
  * **Tier 2 (Post Town, Pop 100+):** Canal, Stone Paving, Watchtower, Fire Depot, Well, Teahouse, Shrine Park.
  * **Tier 3 (Industrial District, Pop 300+):** Rail Tracks, Train Depot, Kōban, Primary School, Telegraph, Cargo Pier, Bathhouse.
  * **Tier 4 (Modern Metropolis, Pop 600+):** Coal Steam Plant, Water Filtration Basin, Exhibition Pavilion.
* **Drawer Rendering:**
  * If `currentTownTier < tool.requiredTier`:
    * Add CSS class `.tool-locked` (`opacity: 0.4; filter: grayscale(1); pointer-events: none;`).
    * Show a lock badge with the required tier/population (e.g., `🔒 T4 (Pop 600)`).

---

## 5. Execution Order for Agent
1. Apply `/ponytail` constraint and inspect file line counts.
2. Fix `POWER_PLANT` tile type enum in placement logic and Surveyor's Scope.
3. Implement $2\times2$ and $3\times3$ hover box highlighting in the cursor preview.
4. Apply tier gating checks so locked items cannot be clicked or placed early.
5. Run automated tests and verify in browser.