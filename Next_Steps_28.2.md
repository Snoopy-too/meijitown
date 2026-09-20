# Project Meiji: Iteration 28.2 — Starting Economy Rebalance & Starter Road Realignment

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all touched files (`config.js`, `app.js`, `grid_manager.js`, or map seeders) strictly under **500–600 lines**.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Rebalancing Starting Treasury to ¥5,000
Tighten the initial fiscal runway to make early municipal planning meaningful.

### Implementation Tasks
* **Configuration Defaults (`public/js/config.js`):**
  * Update `INITIAL_TREASURY` / `STARTING_FUNDS`:
    * Change from `10000` to `5000`.
* **Settlement Reset Logic (`public/js/app.js` or `saveManager.js`):**
  * In the **"Start a New Settlement"** routine, initialize `treasury = 5000`.
  * Update all confirmation dialog copy and localized strings:
    * *"This will reset Edo-Tokyo back to the pristine Meiji dawn of 1872 with ¥5,000 in treasury."*
    * Update matching Japanese translation in `i18n.js` to `¥5,000`.

---

## 3. Starter Road Realignment (Dirt Road Only)
Ensure no unearned Tier 2 stone paving exists when starting a fresh map.

### Implementation Tasks
* **Map Initialization Audit (`grid_manager.js` / `seedMap.js` / `app.js`):**
  * Locate the initial pre-placed road coordinate array (the default T-junction / avenue).
  * Ensure all initial road tiles are seeded strictly as **Dirt Road**:
    * Set `type: CONFIG.TILES.ROAD` (Dirt Road, `tier: 1`), NOT `CONFIG.TILES.STONE_ROAD` (`tier: 2`).
  * Verify that Three.js instances generate earthen textures/colors for the entire starter stretch rather than grey stone borders.

---

## 4. Execution Order for Agent
1. Apply the `/ponytail` skill.
2. Update `STARTING_FUNDS` in `config.js` to `5000`.
3. Update new settlement text in `index.html` / `i18n.js` to reference ¥5,000.
4. Replace starter stone road coordinates in the world generator with standard dirt road tiles.
5. Run regression tests and confirm a new settlement starts with ¥5,000 and exclusively dirt roads.