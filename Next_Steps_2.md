# Project Meiji: Iteration 2 Implementation Tasks

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, code revisions, and asset pipelines on this system.
* **Environment:** Local XAMPP (`meijitown/public/`), MariaDB/MySQL, Three.js client engine, Blender for 3D model processing.
* **Target Objective:** Enhance visual polish, camera ergonomics, empty-zone readability, and establish the Level 2 building upgrade path.

---

## 2. Camera Controls & Viewport Framing

### Default Positioning & Zoom Clamp
* **Initial Spawn:** Set the initial camera position closer to the town center rather than a distant bird's-eye view.
  * Adjust default target to the centroid of placed roads/buildings.
  * Adjust initial distance: set camera position closer (e.g., reduce isometric distance by ~35–45%).
* **OrbitControls Boundaries:**
  * Configure `controls.minDistance` and `controls.maxDistance` to prevent players from zooming inside meshes or pulling so far back that town detail is lost.
  * Clamp polar angle (`controls.maxPolarAngle = Math.PI / 2.2`) to prevent the camera from clipping below the ground plane horizon.

---

## 3. Empty Zone Visualizer & Ground Footprints

Currently, zoned tiles that are unoccupied are hard to distinguish until a building spawns.

### Implementation Tasks
* **Ground Decal / Tint Plane:**
  * When a tile is zoned (`occupied === false`), render a subtle ground quad or border overlay slightly above the terrain grid ($y + 0.01$).
  * Use semi-transparent, period-harmonious colors:
    * **Residential:** Soft Sage Green (`#8FA88B`, opacity ~0.35)
    * **Commercial:** Soft Muted Indigo (`#7A8B99`, opacity ~0.35)
    * **Industrial:** Warm Earth / Ochre (`#A89276`, opacity ~0.35)
* **Lot Outline:** Add a faint dashed or thin line perimeter marking the lot boundary until construction starts.
* **Despawn on Build:** When the state machine transitions to `Scaffold` or `Constructed`, remove or hide the zone underlay quad so the building's native ground texture/fence takes over.

---

## 4. Depth & Contrast Lighting Upgrade

The scene currently uses flat ambient illumination. Add directional depth to highlight roof ridges, eaves, and fences.

### Implementation Tasks
* **Sun Rig:**
  * Add a `THREE.DirectionalLight` with a warm late-afternoon sun tone (`#FFF5E0`, intensity ~1.2).
  * Position the light angled diagonally across the grid (e.g., `x: 30, y: 50, z: 25`).
* **Shadow Configuration:**
  * Enable shadows: `renderer.shadowMap.enabled = true`, `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.
  * Set ground grid and road meshes to `receiveShadow = true`.
  * Set all building meshes, scaffolds, and fences to `castShadow = true` and `receiveShadow = true`.
  * Add subtle, low-intensity ambient bounce (`THREE.AmbientLight` or `THREE.HemisphereLight`, sky: `#FFF8EE`, ground: `#556B2F`, intensity ~0.45) to ensure shaded surfaces retain texture readability without turning pure black.

---

## 5. Progression & Building Upgrades (Level 1 $\rightarrow$ Level 2)

Introduce the historical architectural evolution driven by city prosperity and fire prevention.

### Upgrade Mechanic
* **Trigger Conditions:** A Level 1 building evaluates for an upgrade when:
  * Building has existed for $\ge X$ calendar months.
  * Land value / adjacent services meet the required threshold (e.g., road proximity, low local fire risk, positive commercial balance).
  * City treasury or prosperity index is positive.
* **Architectural Tiers:**
  * **Residential Level 1:** Single-story wooden *machiya* with wood shingles / light tile.
  * **Residential Level 2 (*Kura-zukuri*):** Heavier two-story plastered earthen storehouse style with thick fireproof black/white plaster walls and heavy clay tiles (*kawara*).
  * **Commercial Level 1:** Open wooden merchant stall with fabric curtain (*noren*).
  * **Commercial Level 2:** Solid two-story *machiya* shop with upper living quarters and decorative tiled eaves.
* **Lifecycle State:**
  * `Active L1` $\rightarrow$ `Renovating (Scaffolding reappears for 1–2 ticks)` $\rightarrow$ `Active L2`.

---

## 6. Execution Order for Agent
1. **Camera:** Tune `OrbitControls` zoom limits and default spawn offset in `main.js` / camera controller.
2. **Zone Decals:** Add ground quad mesh creation/removal logic to the zoning brush handler.
3. **Lighting:** Insert directional sun and shadow setup into the Three.js scene builder.
4. **Blender / Assets:** Prepare Level 2 *Kura-zukuri* replacement models (`residential_l2.glb`, `commercial_l2.glb`) and register them in the asset loader.
5. **Simulation Logic:** Implement the upgrade check method within the periodic simulation tick.