# Project Meiji: Iteration 3 Implementation Tasks

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL backend, Blender.

---

## 2. Road Placement Safety & Collision Rules
Prevent the road brush from destroying existing buildings.

### Implementation Tasks
* **Placement Validation:**
  * In the road placement raycast handler, check target tile status.
  * If `tile.occupied === true` or `tile.building !== null`, abort road placement and tint the preview brush red (`#D9534F`).
  * Only allow road creation on tiles where `tile.type === "meadow"` or unoccupied zoned land.
* **Overwriting Unbuilt Zones:**
  * If a road is dragged across a zoned tile that is still *unoccupied* (`occupied === false`), silently de-zone the tile, clear the corner stakes, and place the road.
* **Explicit Demolition:**
  * Require the player to select the Demolish tool (`B`) to bulldoze structures.
  * Add a satisfying crumbling particle effect or audio cue when clearing occupied plots.

---

## 3. Road Network Logic & Visual Connectivity
Currently, roads look like isolated brown slabs. Roads should merge dynamically.

### Implementation Tasks
* **Bitmask / Autotiling for Roads:**
  * Evaluate the 4 orthogonal neighbors (North, South, East, West) for every placed road tile.
  * Swap or adjust the road mesh based on neighbor connectivity:
    * Single dead-end / cap
    * Straight track (N-S or E-W)
    * Corner / bend (L-shape)
    * T-junction
    * 4-way crossroad
* **Dirt Road Shoulders:**
  * Add subtle grass-to-dirt blending or irregular dirt edges so roads bleed naturally into adjacent plots rather than having hard geometric edges.

---

## 4. Expanding the Meiji Simulation Loop
Now that placement and growth are functional, introduce economic and civic pressure.

### Implementation Tasks
* **Taxes & Expenses:**
  * Implement an annual or monthly tax collection tick.
  * Residents pay small land taxes; workshops generate trade revenue; road tiles cost a small monthly maintenance fee.
* **The First Meiji Crisis — Fire Spread (*Taika*):**
  * Wooden *machiya* built adjacent to one another without brick breaks accumulate a shared Fire Risk score.
  * If a fire starts on one tile, it spreads to adjacent wooden tiles every few ticks unless bounded by a wide road or open meadow.
* **First Ploppable Service — Fire Watchtower (*Hinomi-yagura*):**
  * Introduce a ploppable wooden fire watchtower that covers a radius of tiles, cutting fire outbreak chance by 50%.