# Project Meiji: Iteration 25 — Late Modernity: Electric Grid, Clean Waterworks & Industrial Exposition

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**. Proactively target **< 400 lines** for all modules.
  * **Monitored Modules:** Check `tools.js` (currently 537 lines) and extract utility tool handlers into `toolActionDispatcher.js` if it approaches 560 lines.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, Blender 5.2, MySQL (`meijitown_db`), PHP.

---

## 2. Electrification: Coal Steam Plant & Electric Arc Lamps
Bring late-Meiji electric illumination to the town center.

### Implementation Tasks
* **3D Asset Generation (`assets/models/utility_powerplant.glb`):**
  * Model a $2\times2$ brick turbine hall with corrugated iron roofs, an iron boiler chimney, and exterior transformer dynamos.
* **Ploppable Specification (`powerSystem.js`):**
  * Cost: ¥600 | Upkeep: ¥25/mo | Footprint: $2\times2$.
  * Emits electrical power that travels across active Telegraph poles (`telegraphSystem.js`).
* **Visual & Simulation Effects:**
  * **Arc Lighting Upgrade:** Roads carrying power switch night street illumination from dim amber gas lanterns to high-intensity cool-white arc lamps.
  * **Pollution Radius:** Imposes a 4-tile soot radius that decreases residential satisfaction by -8%, incentivizing industrial zoning along rail or harbor corridors.

---

## 3. Municipal Sanitation: Pressurized Waterworks (*Jōsuijō*)
Modernize past traditional shallow wells to secure public health.

### Implementation Tasks
* **Ploppable: Modern Water Filtration Basin [¥350, upkeep ¥15/mo, 2x1 plot]:**
  * Sand filter beds and a brick pump house.
  * Must border a canal or water tile to draw intake.
* **Sanitation Modernization (`sanitationSystem.js`):**
  * Suppresses all waterborne sickness hazards city-wide within an 18-tile pipe radius.
  * Elevates residential housing tier ceiling to modern Western-style brick residences.

---

## 4. End-Game Capstone: National Industrial Exhibition Pavilion (*Hakurankai*)
Provide a crowning objective for mature metropolises.

### Implementation Tasks
* **Monument Asset (`assets/models/monument_pavilion.glb`):**
  * $3\times3$ grand Giyōfū exhibition palace featuring cupolas, classical pillars, and celebratory banners.
* **Victory Condition & Charter (`milestoneManager.js`):**
  * Unlocked at Tier 4 Metropolis (Pop 600+ with active Rail, Telegraph, and Harbor Pier).
  * Construction requires ¥2,000 and 6 months of in-game building progression.
  * Completion triggers the **Imperial Meiji Restoration Triumph** modal and permanent Mayor Hall-of-Fame plaque.

---

## 5. Execution Order for Agent
1. **Apply Global Directive:** Invoke `/ponytail`.
2. **File Size Audit:** Review `tools.js` and extract `toolActionDispatcher.js` if needed to stay well under 500 lines.
3. **Model Generation:** Run Blender headless script to export `utility_powerplant.glb` and `monument_pavilion.glb`.
4. **Power & Lighting Logic:** Write `powerSystem.js` and integrate arc lamp shaders into `lightingManager.js`.
5. **Water Filtration:** Implement clean water coverage.
6. **Exhibition Capstone:** Wire the victory condition and celebration UI.
7. **Automated Test Suite:** Add `scripts/test_iteration25.js` and run full regression checks.