# Project Meiji: Next Steps & Implementation Roadmap

## 1. Context & Global Agent Instructions
* **Current Status:** Foundation prototype operational with grid raycasting, road laying, tile inspection ("Surveyor's Scope"), status banners, and persistence endpoints.
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), MySQL database, Three.js client, and Blender for 3D asset generation.

---

## 2. Milestone A: Refactoring from Plopping to Procedural Zoning
Currently, the toolbar places static structures directly. The engine must be refactored to replicate the *Cities: Skylines* autonomous growable mechanic.

### Tasks
1. **Redefine Toolbar Tools:**
   * Change **Machiya** to **Zone: Residential** (costs small surveying fee or free).
   * Change **Shouten** to **Zone: Commercial** (Merchant district).
   * Change **Workshop** to **Zone: Industrial** (Crafts & mills).
2. **Zone Tile States:**
   * When dragging/clicking with a zone brush, update tile metadata to `zone: "residential" | "commercial" | "industrial"` and `occupied: false`.
   * Render zoned tiles with lightweight colored ground tints/overlays (e.g., soft green, blue, amber) rather than instant building models.
3. **Autonomous Growth Loop (Simulation Tick):**
   * Run an update tick every $N$ seconds (linked to the game calendar).
   * Identify all eligible tiles where `zone !== null`, `occupied === false`, and `roadAccess === true`.
   * Check current RCI demand meters. If demand for that zone type is $> 0$:
     1. Mark tile as `occupied = true`.
     2. Deduct demand score.
     3. Trigger building construction lifecycle: `Scaffolding` $\rightarrow$ `Level 1 Structure`.

---

## 3. Milestone B: Scene Lighting & Visual Atmosphere
Ground the scene visually to replace the flat-shaded plane and black background void.

### Tasks
1. **Atmosphere & Skybox:**
   * Set the Three.js renderer clear color or scene background to a soft, historic palette (e.g., parchment `#E8DEC8` or misty dawn `#D4D9DB`).
   * Add distance fog (`scene.fog = new THREE.FogExp2(0xE8DEC8, 0.015)`) to blend the grid edges naturally.
2. **Directional Lighting & Shadows:**
   * Add a `DirectionalLight` simulating low-angle late-afternoon sun (warm yellowish tint, e.g., `#FFF3D6`).
   * Enable shadow maps on the Three.js renderer (`renderer.shadowMap.enabled = true`).
   * Configure road planes and terrain to receive shadows (`receiveShadow = true`), and buildings/trees to cast shadows (`castShadow = true`).
3. **Period UI Icons:**
   * Replace the modern convenience store (24h) and factory smoke-stack icons in the toolbar with period-appropriate SVG/canvas assets (e.g., traditional *noren* merchant curtains, traditional blacksmith anvil, or timber gate).

---

## 4. Milestone C: Blender Asset Pipeline (First Real Assets)
Replace placeholder colored boxes with low-poly, historically accurate Meiji architecture.

### Asset Specifications
* **Grid Unit Scale:** 1 grid tile = $2\text{m} \times 2\text{m}$ (or project standard scale).
* **Texture Strategy:** A single shared texture atlas (512x512 or 1024x1024 PNG) using solid color blocks for wood beams, white plaster, dark grey roof tiles (*kawara*), and earthen foundation.
* **Target Polygon Count:** $\le 300$ triangles per building for web performance.

### Blender Deliverables
1. `building_scaffold.glb`: Simple timber frame with hemp matting or bamboo poles to represent construction in progress.
2. `residential_l1_machiya.glb`: Single-story wooden townhouse with timber lattice (*koushi*), dark tile roof, and earthen base.
3. `commercial_l1_shouten.glb`: Merchant storefront with front eaves, hanging fabric shop curtain (*noren*), and roadside display area.
4. `industrial_l1_workshop.glb`: Low-profile timber craft workshop or small kiln shed with outdoor firewood storage.

### Integration
* Export assets from Blender as binary `.glb` files into `meijitown/public/assets/models/`.
* Use `THREE.GLTFLoader` to preload these models and clone their geometries into the spawning engine when a lot finishes construction.

---

## 5. Execution Order for Agents
1. **Step 1:** Apply `/ponytail` skill context.
2. **Step 2:** Refactor `public/js` simulation logic to implement the zone data model and growth loop (Milestone A).
3. **Step 3:** Adjust Three.js lighting, shadows, and canvas background in the main renderer setup (Milestone B).
4. **Step 4:** Execute Blender Python/CLI scripts or manual modeling tasks to create the four base `.glb` models (Milestone C).
5. **Step 5:** Hook `GLTFLoader` into the autonomous construction state machine and test locally on XAMPP.