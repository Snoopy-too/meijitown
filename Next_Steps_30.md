# Project Meiji: Iteration 30 — Procedural Curved Rail Bitmasking & The Autumn Typhoon Loop

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all touched and new source files strictly under **450–500 lines**.
  * Keep rail layout logic isolated in `public/js/renderer/railAutoTiler.js` (< 280 lines) rather than bloating `renderer.js` or `procedural_meshes.js`.
  * Keep weather disaster logic isolated in `public/js/disaster/typhoonManager.js` (< 300 lines).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, Blender 5.2, MySQL, PHP.

---

## 2. Dynamic Rail Bitmasking & Curved Geometry (`railAutoTiler.js`)
Replace straight, disconnected rail segments with procedural curves and junction switches.

### Implementation Tasks
* **Neighbor Bitmasking Engine:**
  * When placing, upgrading, or bulldozing a rail tile at `(x, y)`, evaluate its 4 orthogonal neighbors `(N, S, E, W)`:
    * `mask = (N ? 1 : 0) | (E ? 2 : 0) | (S ? 4 : 0) | (W ? 8 : 0)`
  * **Segment Configurations:**
    * **Straight:** Mask `5` (N-S) or `10` (E-W).
    * **Curved 90° Turn:**
      * North-East (`3`): Smooth 90° arc connecting North and East edges.
      * South-East (`6`): Smooth 90° arc connecting South and East edges.
      * South-West (`12`): Smooth 90° arc connecting South and West edges.
      * North-West (`9`): Smooth 90° arc connecting North and West edges.
    * **3-Way Switch / 4-Way Crossing:** Masks `7, 11, 13, 14, 15` generate crossover frog plates and switch points.
* **Curved Rail Geometry Generation:**
  * In `CivicMeshFactory` / `railAutoTiler.js`, generate procedural quarter-circle rails:
    * Two parallel curved steel paths (gauge width ~0.25 tile units).
    * Radially spaced dark timber ties (*makuragi*) following the arc tangent.
    * Dark gravel ballast bed beneath the bend.
* **Train Path Interpolation Update:**
  * Update train locomotive positioning in `traffic_manager.js` to interpolate along quadratic Bézier curves when traversing corner tiles instead of snapping diagonally.

---

## 3. Dynamic Hazard: The Autumn Typhoon (*Taifū*) & Water Inundation Loop
Introduce Japan’s seasonal weather threat to keep mature towns challenging to maintain.

### Implementation Tasks
* **Seasonal Trigger & Warning System (`typhoonManager.js`):**
  * **Timing:** September–October (Meiji months 9–10) has a 35% seasonal probability of triggering a Typhoon warning.
  * **Telegraph / Chronicle Alert:** 1 month advance warning banner: *“Storm Approaching: Reinforce Lowland Canals and Paddies.”*
* **Inundation Mechanics:**
  * During the typhoon storm:
    * High-intensity driving rain particles and darkening storm sky.
    * Canals touching earthen dirt tiles overflow into adjacent low-lying tiles.
    * Flooded rice paddies lose their golden harvest yield, turning to mud and cutting autumn export revenue by -50%.
    * Unpaved dirt roads submerge, breaking road connectivity to connected residences.
* **Flood Defenses & Countermeasures:**
  * **Stone Embankment Upgrades (*Ishigaki*):** Paved stone roads bordering canals prevent water from overflowing.
  * **Riverside Willows (*Shidare-yanagi*) [Leisure Tab, ¥15]:** Deep roots anchor soil; placing trees along canal banks prevents dike failure.
  * **Watergate Sluice (*Suimon*) [Civic Tab, ¥180]:** Prevents upstream surges from flooding connected districts.

---

## 4. UI & Surveyor's Scope Integration
* **Rail Inspection:**
  * Inspecting any rail track displays:
    * `Track Segment: Mainline (Curved NE / Switch / Straight)`
    * `Train Speed Rating: 100% (Continuous Iron Gauge)`
* **Typhoon Flood Layer (Layers Menu):**
  * Added to the `Layers` dropdown: **Flood Inundation Risk**.
  * Shows canal tiles in deep blue, protected stone banks in green, and vulnerable lowland dirt banks in flashing amber.

---

## 5. Automated Verification & Regression Protocol
1. **Automated Test Suite (`scripts/test_iteration30.js`):**
   * **Test 1: Bitmask Resolution:** Verify all 16 orthogonal neighbor combinations yield the correct curved, straight, or crossing rail type.
   * **Test 2: Bézier Path Alignment:** Verify train positions follow smooth curve tangents through 90° bends.
   * **Test 3: Typhoon Flood Spread:** Verify water overflow occurs on unprotected dirt borders but is blocked by stone embankments.
   * **Test 4: File Size Governance:** Verify `railAutoTiler.js`, `typhoonManager.js`, and all refactored modules remain strictly $< 450$ lines.
2. **Regression Check:** Run `test_iteration28.js` and `test_wiring_integrity.js`.

---

## 6. Execution Order for Agent
1. Apply the `/ponytail` skill.
2. Create `railAutoTiler.js` and implement bitmasking for N-S, E-W, and all 4 corner arcs.
3. Update `traffic_manager.js` to steer the train smoothly along Bézier curves on corner tiles.
4. Implement `typhoonManager.js` with September/October storm triggers, rainfall visuals, and dike overflow checks.
5. Add the **Flood Risk** view to the `Layers` menu.
6. Run automated test suites and verify track curvature and typhoon mechanics in the browser.