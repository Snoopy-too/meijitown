# Project Meiji: Iteration 8 — Simulation Controls & Environmental Immersion

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL database, Blender.

---

## 2. Simulation Speed Control & Time Scaling
Give players fine control over the simulation clock and tick cadence.

### Implementation Tasks
* **UI Controls:**
  * Add a 3-tier speed toggle widget directly adjacent to the `Pause` button in the lower-right control cluster:
    * `▶` Normal ($1\times$)
    * `▶▶` Fast ($2\times$)
    * `▶▶▶` Hyper ($3\times$)
  * Highlight the active speed button with an active state border/fill.
* **Tick Scaler Logic:**
  * Define a base tick interval: `BASE_TICK = 3000ms` (1 month).
  * Calculate active interval: `currentInterval = BASE_TICK / speedMultiplier`.
  * Ensure agent pathfinding (rickshaws, pedestrians) and fire spread countdowns scale proportionally with the active simulation speed multiplier.
* **Keyboard Hotkeys:**
  * `Space`: Toggle Pause / Resume.
  * `Shift + 1`: $1\times$ Speed.
  * `Shift + 2`: $2\times$ Speed.
  * `Shift + 3`: $3\times$ Speed.

---

## 3. Dynamic Seasonality & Calendar Cycle
Reflect the passing of months in the environment.

### Implementation Tasks
* **Tree Foliage Material Swapping:**
  * Track current month in `Chronicle` (`M1` through `M12`).
  * Update deciduous/sakura tree materials based on the active season:
    * **Spring (M3–M5):** Soft pink blossom (`#F4C2C2`).
    * **Summer (M6–M8):** Vibrant forest green (`#4A6B3D`).
    * **Autumn (M9–M11):** Autumnal russet / maple red (`#A03E28`).
    * **Winter (M12–M2):** Pale winter grey/brown (`#8C857B`).

---

## 4. Communal Well (*Ido*) Coverage & Sanitation Radius
Complete the public health system.

### Implementation Tasks
* **Placement Overlay:**
  * While selecting or placing the **Well (Ido)** tool, render a translucent circular water range overlay (radius = 6 grid units) centered on the cursor.
* **Sanitation State:**
  * Evaluate residential plots against well distance.
  * Plots inside radius: `Sanitation: Clean (100%)`.
  * Plots outside radius: Gradually drop to `Sanitation: At Risk`, dampening population influx until a well is constructed.

---

## 5. Audio Ambience & Event Cues
Add lightweight Web Audio API sound feedback for atmosphere.

### Implementation Tasks
* **Ambient Soundscape:**
  * Low ambient countryside track (subtle wind, seasonal cicadas in summer).
* **Positional / UI Sound FX:**
  * Wooden mallet clack on tile placement.
  * Wooden clappers (*hyōshigi*) warning alert during active fire events.
  * Traditional bell tone on calendar New Year transition.