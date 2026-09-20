# Project Meiji: Iteration 29 — Service Coverage Overlays & Map Data Layers

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * Keep all files strictly under **500–600 lines**.
  * Keep `overlayRenderer.js` and `serviceRadiusPreview.js` below 300 lines each.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Dynamic Placement Service Radius Preview (`serviceRadiusPreview.js`)
Provide immediate visual feedback of civic service reach before confirming placement.

### Implementation Tasks
* **Tool Coverage Radii:**
  * Well (*Ido*): 5 tiles (Water/Sanitation).
  * Watchtower (*Hinomi-yagura*): 6 tiles (Fire Detection).
  * Police Box (*Kōban*): 7 tiles (Order/Security).
  * Primary School (*Shōgakkō*): 8 tiles (Education).
  * Shrine Park (*Jinja*): 4 tiles (Leisure).
* **Placement Preview Hook:**
  * When a civic tool is selected and hovering over the grid, render an instanced flat grid highlight or circular Three.js ring centered on the cursor.
  * Color coding: Soft Cerulean for Water/Sanitation, Vermilion for Fire/Order, Gold for Culture/Education.
  * Automatically clean up and dispose of geometry when canceling or completing placement.

---

## 3. Data Layers Menu Integration (`overlayRenderer.js`)
Wire the header's `Layers` button into an interactive visual diagnostic tool.

### Implementation Tasks
* **Layer Modes:**
  * **Default / Normal:** Standard rendering.
  * **Fire Hazard:** Tints wooden residential tiles by ignition vulnerability (green = 0%, red = high hazard); highlights stone roads and canals as bright blue firebreaks.
  * **Sanitation:** Shows blue gradient around active wells and waterworks; unserved tiles shaded sickly yellow/brown.
  * **Electric Grid:** Highlights connected telegraph routes and powered buildings in soft neon gold; unpowered districts shaded dark.
  * **Pollution:** Displays a soft soot overlay 4 tiles around the Coal Steam Plant.
* **UI Controls:**
  * Clicking `Layers` toggles a clean washi dropdown menu with radio options for each diagnostic view.

---

## 4. Execution Order for Agent
1. Apply the `/ponytail` skill.
2. Build `serviceRadiusPreview.js` and bind it to cursor movement during active civic tool placement.
3. Wire the `Layers` dropdown menu in `index.html` and `overlayRenderer.js`.
4. Implement tile ground tinting shaders/uniforms for Fire, Sanitation, and Electric grid overlays.
5. Run automated tests and verify overlay switching in browser.