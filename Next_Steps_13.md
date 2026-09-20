# Project Meiji: Iteration 14 — Audio UI Polish, Water Traffic, Parks & Railways

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file line counts before adding new logic. If modifying a file pushes it past ~500 lines, execute an immediate modular extraction.
  * **Separation Candidates:** Keep `audioManager.js`, `canalTraffic.js`, `railwaySystem.js`, and `parksSystem.js` in dedicated, self-contained ES modules.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Header UI Polish: Audio Toggle Integration
Relocate and re-skin the mute/unmute button so it aligns cleanly with the time controls rather than clipping underneath.

### Implementation Tasks
* **Row Alignment in Chronicle Banner:**
  * Move the mute/unmute toggle (`#audio-toggle-btn`) into the same flex row as the playback buttons (`[ ⏸ ] [ ½× ] [ 1× ] [ 2× ] [ 4× ]`).
  * Add a subtle vertical separator or divider line between the time speed group and the audio button.
* **Washi Button Styling:**
  * Match the exact border, font, background, and padding styles of the adjacent speed buttons.
  * Display a clean speaker state icon/label: `🔊 On` / `🔇 Mute`.
  * Ensure the parent flex container uses `align-items: center;` and `overflow: visible;` with zero clipping artifacts.

---

## 3. Water Life: Canal Cargo Barges (*Takasebune*)
Bring dynamic ambient activity to the canal waterways.

### Implementation Tasks
* **Blender Asset (`vehicle_barge.glb`):**
  * Model a traditional flat-bottom river barge with low-poly wooden planks, a standing boatman with a push-pole, and cargo barrels/sacks.
* **Canal Pathfinding & Animation (`canalTraffic.js`):**
  * Identify contiguous canal tiles as a waterway graph.
  * Spawn 1–2 barges that navigate through canal centers and glide smoothly underneath arched bridges.
  * Reverse route or despawn/respawn at map edges with gentle linear interpolation (`lerp`).

---

## 4. Street Trees & Pocket Parks (*Kōen*)
Enable neighborhood beautification and local satisfaction boosts.

### Implementation Tasks
* **New Tool: Canal Willow / Cherry Tree [¥15]:**
  * Allow placing standalone weeping willow (*yanagi*) or sakura trees on empty meadow tiles and along canal banks.
* **New Civic: Neighborhood Shrine Park (*Jinjanoki*) [¥50, 1x1 plot]:**
  * Model a small vermillion torii gate with a stone lantern (*tōrō*) and evergreen pine.
  * Grants a local +5% leisure/happiness bonus to adjacent residential structures.

---

## 5. Early Modern Transit: Steam Railway (*Tetsudō*)
Establish the foundation for late-Meiji industrial expansion.

### Implementation Tasks
* **Infrastructure: Rail Tracks [¥20/tile]:**
  * Iron rails laid across wooden cross-ties with crushed gravel ballast.
* **Ploppable: Rural Train Depot [¥350, upkeep ¥10/mo]:**
  * Small timber station platform with a passenger waiting shed.
  * When connected to the road network, doubles industrial/commercial demand and unlocks higher-tier workshop growth.

---

## 6. Execution Order for Agent
1. **Apply Global Directive:** Ensure `/ponytail` is invoked.
2. **File Audit:** Check and maintain line counts under 600 across all modified files.
3. **Audio Button Layout:** Fix the mute toggle CSS and flex positioning inside the Chronicle banner.
4. **Canal Traffic:** Model the river barge in Blender and write `canalTraffic.js`.
5. **Parks & Trees:** Add the standalone willow/shrine placement tools to `#build-drawer`.
6. **Rail Tracks:** Add the rail grid layer and depot ploppable.