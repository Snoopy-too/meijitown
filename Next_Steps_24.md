# Project Meiji: Iteration 27 — Washi Confirmation Modals & Shrine Leisure Synergy

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all modified files strictly under **500–600 lines**.
  * Keep `modalManager.js` and `leisureSystem.js` under 300 lines each.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Stylized Washi Confirmation Modals (`modalManager.js`)
Replace all native `window.confirm()` and `window.alert()` browser popups with theme-appropriate UI.

### Implementation Tasks
* **Custom Modal Service (`public/js/ui/modalManager.js`):**
  * Create a singleton `ModalManager.confirm({ title, message, confirmText, cancelText })`:
    * Returns a `Promise<boolean>` resolving `true` on confirm, `false` on cancel/close.
  * DOM Structure:
    * Reusable `#confirmation-modal` overlay with a `.washi-card` parchment container.
    * Traditional header icon (e.g., Imperial seal, crest, or red *Torii*).
    * Wood-block styled action buttons: `.btn-wood-confirm` (crimson lacquer) and `.btn-wood-cancel` (aged paper).
* **Hooking Native Calls:**
  * Refactor the **"New Settlement"** button click listener in `app.js` to await `ModalManager.confirm(...)`.
  * Refactor city save/load overwrite prompts to use the styled modal.

---

## 3. Shrine Park (*Jinja*) Leisure Propagation
Fix the unserved leisure state on homes adjacent to shrine parks.

### Implementation Tasks
* **Provider Registration (`leisureSystem.js`):**
  * Add `CONFIG.TILES.SHRINE_PARK` (or `shrine_park`) to the active leisure provider registry alongside `teahouse` and `bathhouse`.
* **Coverage Calculation:**
  * Set a **4-tile radial coverage** ($L_1$ Manhattan or Euclidean radius).
  * Do not require strict continuous road connectivity for shrines—neighborhood shrines influence nearby houses through open walking paths.
* **Surveyor's Scope Inspection Update:**
  * When inspecting residential tiles within shrine radius:
    * `Leisure: Shrine (Blessed / +10% Satisfaction)` (EN)
    * `娯楽・文化: 鎮守の杜 (参拝圏内 / 満足度+10%)` (JA)
  * Feed +10% satisfaction weight into `EconomySystem` metrics.

---

## 4. Execution Order for Agent
1. **Apply `/ponytail` skill** and audit file sizes.
2. **Build Modal Service:** Create `modalManager.js` and add corresponding `.washi-card` confirmation styles to `hud.css`.
3. **Replace Browser Native Prompts:** Update the "New Settlement" click handler in `app.js`.
4. **Fix Leisure Provider:** Register `SHRINE_PARK` in `leisureSystem.js` and verify radial evaluation.
5. **Verify in Browser:** Confirm custom modal appearance and verify the house scope changes from `Leisure: None` to `Leisure: Shrine`.