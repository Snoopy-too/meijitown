# Project Meiji: Iteration 9 — UI De-cluttering & Time Pacing Calibration

## 1. Global Directives & Agent Setup
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL database, Blender.

---

## 2. Pacing Calibration & Slow-Speed Tier
Adjust the simulation tick engine to provide a leisurely default pace and a deliberate slow-planning mode.

### Implementation Tasks
* **Tick Intervals (`simulation.js`):**
  * Update `BASE_MONTH_MS = 6000` (6.0 seconds per month = 72 seconds per year).
  * Configure speed multipliers:
    * **Pause:** `0x` (tick halted)
    * **Slow:** `0.5x` (12,000ms per month / 144s per year)
    * **Standard (Default):** `1.0x` (6,000ms per month / 72s per year)
    * **Fast:** `2.0x` (3,000ms per month / 36s per year)
    * **Hyper:** `4.0x` (1,500ms per month / 18s per year)
* **Agent & Animation Scaling:**
  * Ensure pedestrian/rickshaw interpolation speeds and fire countdown timers scale proportionally with the active multiplier so physics remain consistent.

---

## 3. UI Layout Decoupling (Clear the Toolbar Overlap)
Separate the construction toolbar from simulation time controls.

### Implementation Tasks
* **Relocate Time Controls to Chronicle Banner:**
  * Remove the playback buttons (`Pause`, `▶`, `▶▶`, `▶▶▶`) from the bottom `#action-toolbar` flex container.
  * Mount a dedicated `#time-controls` component into or immediately underneath the top Chronicle banner (`Meiji X / MYYYY`).
  * Style the buttons with traditional washi card accents matching the top banner styling:
    * `[ ⏸ Pause ]`
    * `[ ½× Slow ]`
    * `[ 1× Normal ]` (highlighted active by default)
    * `[ 2× Fast ]`
    * `[ 4× Hyper ]`
* **Restore Toolbar Width & Spacing:**
  * Let `#action-toolbar` stretch cleanly across the bottom-center with standard gap spacing (`gap: 8px`).
  * Ensure all 9 tool cards are fully visible without horizontal overlap:
    * `[1] Survey`
    * `[2] Dirt Road`
    * `[3] Zone: Machiya`
    * `[4] Zone: Shouten`
    * `[5] Zone: Workshop`
    * `[6] Watchtower`
    * `[7] Fire Depot`
    * `[8] Well (Ido)`
    * `[B] Demolish`

---

## 4. Keyboard Shortcuts for Time Management
* `Space`: Toggle Pause / Resume.
* `~` or `\` : Set Slow Speed ($0.5\times$).
* `1` (when no tool active) or `Shift+1`: Normal Speed ($1.0\times$).
* `Shift+2`: Fast Speed ($2.0\times$).
* `Shift+3`: Hyper Speed ($4.0\times$).