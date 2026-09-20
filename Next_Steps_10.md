# Project Meiji: Iteration 11 — Mobile-Ready UI Drawer, Layout Consolidation & Architectural Hygiene

## 1. Global Context & Agent Directives
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **File Size & Code Modularization Directive (Hard Constraint):**
  * **Strict File Limit:** No single source file should exceed **500–600 lines**.
  * **Proactive Assessment:** Before adding new features or logic, inspect the target file's current line count.
  * **On-the-Spot Refactoring:** If an addition pushes a file past ~500 lines (or if it is approaching 600 lines), perform an immediate modular extraction before proceeding.
  * **Separation Standards:** Break oversized files into domain-focused ES modules:
    * `simulation.js` $\rightarrow$ Split out `timeManager.js`, `economy.js`, `happiness.js`, `fireSystem.js`, `sanitationSystem.js`.
    * `main.js` / renderer $\rightarrow$ Split out `cameraControls.js`, `raycastManager.js`, `ghostCursor.js`, `sceneLighting.js`.
    * `ui.js` $\rightarrow$ Split out `buildDrawer.js`, `chronicleBanner.js`, `surveyorScope.js`, `toastManager.js`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Responsive UI Overhaul: The "Build" Drawer System
Consolidate the sprawling horizontal toolbar into a mobile-friendly collapsible drawer to free up screen real estate for smartphones and desktops alike.

### Implementation Tasks
* **Active Tool Floating Action Button (FAB):**
  * Remove the permanent 10-button bottom toolbar.
  * Replace with a single persistent `#active-tool-btn` positioned in the bottom-right or bottom-center.
  * Display: Currently active tool icon, concise label, and a clear cancel/reset icon (`✕`) to return to Survey mode.
* **Collapsible Build Menu Drawer (`#build-drawer`):**
  * Slides up from the bottom when tapping or clicking `#active-tool-btn`.
  * Organized into thumb-friendly category tabs or grids:
    * **Tab 1: Infrastructure** $\rightarrow$ Dirt Road (¥10), Demolish (¥5).
    * **Tab 2: Zones** $\rightarrow$ Machiya (¥15), Shouten (¥20), Workshop (¥25).
    * **Tab 3: Public Services** $\rightarrow$ Watchtower (¥250), Fire Depot (¥180), Well (¥60).
    * **Tab 4: Leisure & Culture** $\rightarrow$ Teahouse (¥120), Bathhouse (¥90).
  * Selecting an item sets the active tool and automatically closes the drawer.

---

## 3. Header & Surveyor's Scope De-duplication
Resolve the visual collision between the Surveyor's Scope card and the top header.

### Implementation Tasks
* **Top Chronicle Header:**
  * Constrain `#chronicle-banner` to a clean max-width and center it, ensuring responsive wrapping on narrow viewports (`@media (max-width: 768px)`).
  * Scale down font padding and time control buttons so they do not touch the left-hand overlays.
* **Contextual Surveyor's Scope:**
  * Relocate `#surveyor-scope` to the bottom-left corner or turn it into an on-demand slide-out sheet.
  * Keep it minimized by default. When the player taps any tile in "Survey Mode", expand the card to display Stage, Road Access, Fire Hazard, Sanitation, and Leisure metrics.

---

## 4. Mobile Touch Ergonomics & 3D Ghost Placement
* **Touch Event Standardization:**
  * Ensure the canvas handles standard mobile gestures cleanly (`touchstart`, `touchmove`, `touchend`) while preventing default browser page-scroll and pull-to-refresh behaviors.
  * Standard gesture mapping:
    * **1-Finger Drag (Survey Mode):** Pan the map.
    * **1-Finger Drag/Tap (Build Tool Active):** Paint/place selected road, zone, or building.
    * **2-Finger Pinch:** Zoom in / out smoothly.
    * **2-Finger Twist:** Rotate the camera ($360^\circ$ yaw).
* **3D Ghost Placement Indicator:**
  * When a tool is selected, render a translucent preview mesh on the raycasted tile ($y + 0.05$).
  * Tint green (`#2ECC71`, 50% opacity) if placement is valid.
  * Tint red (`#E74C3C`, 50% opacity) if obstructed, lacking road access, or unaffordable.

---

## 5. Next Simulation Features: Stone Thoroughfares & Telegraph Poles
* **Road Tier 2 (Stone Paving / *Ishidatami*):** Add an upgradeable stone-paved road tier (¥30) that acts as an absolute firebreak and boosts commercial land value.
* **Procedural Telegraph Poles (*Denshin*):** Auto-spawn small wooden telegraph poles and overhead wire segments along straight road corridors adjacent to commercial districts.

---

## 6. Execution Protocol for Agents
1. **Verify Global Directive:** Ensure `/ponytail` is invoked.
2. **File Size Audit:** Check target file line counts. If any file approaches $\ge 500$ lines, extract helper classes/modules into dedicated files under 600 lines before writing new logic.
3. **UI Restructure:** Implement `#build-drawer` and remove the wide desktop toolbar.
4. **Header Collision Fix:** Reposition `#surveyor-scope` and adjust header CSS media queries.
5. **Touch & Ghost Preview:** Add touch raycasting handlers and translucent placement previews.