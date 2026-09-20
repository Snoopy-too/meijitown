# Project Meiji: Iteration 5 Implementation Tasks

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL database, Blender.

---

## 2. Camera Orbit & Full 360° Rotation Controls
Resolve the camera rotation limitation so players can view both sides of their settlement.

### Implementation Tasks
* **Enable Azimuthal Rotation in OrbitControls:**
  * Verify `controls.enableRotate = true`.
  * Ensure `controls.minAzimuthAngle` and `controls.maxAzimuthAngle` are set to `-Infinity` and `Infinity` (unclamped).
* **Mouse Input Mapping:**
  * Configure mouse bindings so tool usage does not conflict with orbiting:
    * **Left-Click:** Active tool interaction (Paint zone, place road, survey inspect).
    * **Right-Click + Drag:** Orbit / Yaw rotation ($360^\circ$) and Pitch tilt.
    * **Middle-Click + Drag:** Pan across the grid.
    * **Scroll Wheel:** Zoom in / out.
* **Keyboard Rotation Shortcuts:**
  * Bind `Q` to rotate camera counter-clockwise by $45^\circ$ around the target.
  * Bind `E` to rotate camera clockwise by $45^\circ$ around the target.
  * Animate rotation smoothly over ~200ms using linear interpolation or easing.

---

## 3. Firefighting & Disaster Recovery
The fire system is now live; players need tools to respond and recover.

### Implementation Tasks
* **Manual / Volunteer Firefighting (*Machi-Hikeshi*):**
  * Allow clicking a burning building or dispatching a brigade to extinguish fires before countdown expires.
  * Upgrading from standard dirt roads to wider thoroughfares should act as absolute firebreaks (halting spread).
* **Ruins & Rebuilding:**
  * Once a building burns down, leave a charred rubble tile.
  * The player can clear the rubble using the Demolish tool (`B`) for a small cleanup cost, returning the plot to open zoned land for reconstruction.

---

## 4. Road Intersections & Autotiling Polish
* **Intersection Meshes:** Refine the T-junction and 4-way crossroad geometry so road dirt texture transitions smoothly without overlapping mesh seams.
* **Tree & Foliage Sprinkling:** Scatter occasional low-poly pine trees or cherry blossom trees (*sakura*) along meadow edges to make the town perimeter feel grounded in the Japanese countryside.