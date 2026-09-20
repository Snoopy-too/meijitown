# Project Meiji: Iteration 4 Implementation Tasks

## 1. Global Directives & Agent Setup
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js engine, MariaDB/MySQL, Blender.

---

## 2. Notification System & Drag UX Refactor
Fix the center-screen viewport obstruction during drag actions.

### Implementation Tasks
* **Relocate Toast Container:**
  * Anchor notifications to the bottom-right or top-right viewport corner.
  * Apply `pointer-events: none;` to the toast stack so active mouse raycasting is never blocked.
* **Batch Drag Feedback:**
  * While dragging a road or zoning brush, show an inline counter near the cursor (e.g., `Length: 7 | Cost: ¥70`) without firing discrete toasts.
  * Fire a single aggregate notification on mouse-up (`Built 7 road tiles [-¥70]`).
* **Toast Limits & Fade:**
  * Cap simultaneous visible toasts to 3.
  * Fade out toasts after 2.5 seconds using CSS transitions.

---

## 3. Road Adjacency & Boundary Cleanup
* **Road Shoulder Consistency:** Connect dirt road borders cleanly so intersections do not render overlapping or clipping texture edges.
* **Orientation Snapping:** Ensure building frontages always orient toward the nearest adjacent road rather than defaulting to a fixed cardinal angle.

---

## 4. The Fire Hazard System (*Taika* Simulation)
Now that the watchtower exists, bring the fire mechanic online.

### Implementation Tasks
* **Fire Risk Calculation:**
  * Adjacent wooden *machiya* increase neighboring fire risk.
  * Proximity to a *Watchtower* reduces fire risk within a 6-tile radius by 50%.
* **Crisis State & Visuals:**
  * When a fire breaks out, spawn a small particle flame/smoke mesh on the building.
  * Give players an alert and show fire spread timers to adjacent wooden buildings.
  * Road corridors of $\ge 2$ tiles width act as firebreaks, stopping spread.