# Project Meiji: Iteration 24 — Architectural De-risking & Harbor Trade Pier

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**; proactively target **< 400 lines** for newly split modules.
  * **Immediate Refactoring Mandate:** `renderer.js` (587 lines) and `procedural_meshes.js` (579 lines) must undergo modular extraction **before** any new feature code is written.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client engine, Blender 5.2, MySQL (`meijitown_db`), PHP.

---

## 2. Proactive Architectural Refactoring (Pre-requisite)
De-risk the codebase by modularizing bloated rendering files.

### Implementation Tasks
* **Extract from `renderer.js`:**
  * Create `public/js/renderer/telegraphRenderer.js` (< 200 lines):
    * Move pole positioning, catenary wire geometry generation, Gaishi porcelain insulators, and wire matrix updates out of `renderer.js`.
  * Create `public/js/renderer/overlayRenderer.js` (< 250 lines):
    * Isolate heatmap color buffers, ground quad tinting, and layer blending routines.
  * Ensure `renderer.js` delegates to these sub-modules and drops below **420 lines**.
* **Extract from `procedural_meshes.js`:**
  * Create `public/js/meshes/civicMeshFactory.js` (< 300 lines):
    * Move `createTelegraphOfficeMesh`, `createSchoolMesh`, and `createGinzaBrickMesh`.
  * Ensure `procedural_meshes.js` functions primarily as a lightweight dispatcher under **350 lines**.

---

## 3. Maritime Logistics: Harbor Cargo Pier (*Funatsuki-ba*)
Introduce water-based export facilities to monetize agricultural and manufacturing surpluses.

### Implementation Tasks
* **3D Asset Generation (`assets/models/infrastructure_pier.glb`):**
  * Model a $2\times2$ waterfront cargo basin:
    * Stone and timber retaining wharves extending along the water edge.
    * Wooden dock piling, mooring posts, a manual cargo derrick crane, and stacked rice bales (*tawara*).
  * Add procedural fallback `createHarborPierMesh` in `civicMeshFactory.js`.
* **Ploppable Specification:**
  * Cost: ¥450 | Upkeep: ¥12/mo | Footprint: $2\times2$.
  * Placement constraint: Must be orthogonally adjacent to at least two connected canal/water tiles and one road tile.
  * Added to the Infrastructure / Transport build tab (Hotkey `[H]`).
* **Maritime Trade Engine (`public/js/tradePierManager.js`):**
  * Scans for active connections: Canal $\leftrightarrow$ Rice Paddies / Textile Mills $\leftrightarrow$ Harbor Pier.
  * **Automated Barge Routing:** Dispatches *Takasebune* barges from farms and mills directly to the pier.
  * **Export Revenue:**
    * Converts surplus rice (especially during Autumn M9–M11 harvest) and cotton/silk reeled goods into periodic foreign trade dividends (+¥150 to +¥400 per export run).
  * Adds trade volume metrics to the Surveyor's Scope (`Trade Volume: Active / Surplus Exporting`).

---

## 4. UI & Surveyor's Scope Updates
* **Build Drawer Integration:**
  * Add the Harbor Cargo Pier card under the multimodal transit section.
  * Tier gating: Unlocks at Tier 3 (Industrial District / Pop 300+).
* **Surveyor's Scope Inspection:**
  * Inspecting the Pier displays:
    * `Facility: Harbor Cargo Pier (Funatsuki-ba)`
    * `Maritime Connection: Linked to Canal Network`
    * `Quarterly Export Yield: +¥[amount]`

---

## 5. Automated Verification & Regression Protocol
1. **Automated Model Generation:**
   * Run Blender headless script `scripts/generate_iteration24_models.py` to create `infrastructure_pier.glb`.
2. **Automated Test Suite (`scripts/test_iteration24.js`):**
   * **Test 1:** Verify file size compliance (< 500 lines across all refactored and new modules).
   * **Test 2:** Verify `telegraphRenderer.js` and `overlayRenderer.js` cleanly import without circular dependencies.
   * **Test 3:** Verify Harbor Pier placement constraints (requires water and road adjacency).
   * **Test 4:** Verify surplus export revenue calculation on Autumn months.
3. **Regression Check:**
   * Execute `scripts/test_iteration20.js` and `scripts/test_wiring_integrity.js`.

---

## 6. Execution Order for Agent
1. **Apply `/ponytail` constraint.**
2. **Execute File Modularization:** Split `renderer.js` and `procedural_meshes.js` first.
3. **Audit Line Counts:** Confirm all files are well under 500 lines.
4. **Model Asset:** Create the Blender generation script for `infrastructure_pier.glb`.
5. **Trade Logic:** Implement `tradePierManager.js`.
6. **UI Hookup:** Wire the build drawer and hotkeys.
7. **Run Test Suites:** Verify all automated tests pass.