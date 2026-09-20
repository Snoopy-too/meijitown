# Project Meiji: Iteration 13 — Canals, Law & Order (Kōban), and Urban Polish

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file line counts before adding logic. If any file approaches 500 lines, immediately extract sub-modules (e.g., split `kobanSystem.js`, `canalSystem.js`, or `headerControls.js`).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Minor UI & CSS Polish
Clean up the header overflow artifact.

### Implementation Tasks
* **Header CSS Fix:**
  * In the Chronicle banner time-control container, inspect the button group wrapper.
  * Remove any accidental stray horizontal/vertical scrollbars (`overflow: hidden;`) and adjust button bottom margins so no blue highlight artifacts clip beneath the `1x` button.

---

## 3. Civic Feature: Meiji Police Box (*Kōban*)
Introduce historical municipal order and public security.

### Implementation Tasks
* **Asset Deliverable (`civic_koban.glb`):**
  * Model a compact $1\times1$ hexagonal wooden booth or early red-brick sentry box with a hanging red globe lamp (*Akatōchō*).
* **Tool & Toolbar Integration:**
  * Add **Kōban (Police Box)** [¥110, upkeep ¥3/mo] to the Civic tab in `#build-drawer`.
* **Simulation Mechanics:**
  * Grants an 8-tile radius of Public Order.
  * Adds +10% satisfaction to all residential and commercial buildings within radius.
  * Prevents abandonment/delinquency in high-density blocks.
  * Surveyor's Scope update: Add `Order: Secured / Unpatrolled`.

---

## 4. Infrastructure Feature: Canals & Bridges (*Hori & Hashi*)
Integrate historical water transit and natural firebreaks.

### Implementation Tasks
* **Canal Tool:**
  * Add **Canal (¥15/tile)** under the Infrastructure drawer tab.
  * Renders a slightly recessed water tile ($y - 0.1$) with soft reflective water material.
* **Road & Canal Intersections (Bridges):**
  * When a Dirt Road or Stone Pavement is drawn across an active canal tile, auto-spawn an arched wooden or stone bridge mesh (*Taiko-bashi* style).
* **Gameplay Perks:**
  * Complete firebreak: fire cannot jump across canal tiles.
  * Provides passive sanitation/water access to immediately adjacent tiles.

---

## 5. Execution Order for Agent
1. **Verify Line Counts:** Check and refactor any files nearing 500 lines.
2. **CSS Polish:** Remove the stray UI scrollbar/clip artifact under the Chronicle time controls.
3. **Blender Modeling:** Model the $1\times1$ *Kōban* police box.
4. **Logic Implementation:** Add the Kōban civic class and wire order coverage into the satisfaction calculation engine.
5. **Canals & Bridges:** Implement water tile rendering and road-over-water bridge spawning.