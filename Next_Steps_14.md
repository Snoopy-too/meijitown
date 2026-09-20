# Project Meiji: Iteration 15 — Level Crossings, Trains & Modern Industry

## 1. Global Directives & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Check file line counts before adding code. If any file approaches ~500 lines, immediately execute a modular extraction (e.g., split out `trainTraffic.js`, `levelCrossing.js`, or `industrySystem.js`).
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Infrastructure Fix: Road-Rail Level Crossings (*Fumikiri*)
Resolve the yellow debug bar artifact and complete the rail-over-road intersection.

### Implementation Tasks
* **Remove Debug Box:** Clean up the yellow placeholder bounding mesh at the rail crossing.
* **Rail Crossing Mesh (`crossing_wood.glb`):**
  * When a Dirt Road or Stone Paving intersects a Rail Track, spawn an authentic wooden level crossing: wooden planks inlaid flush between and outside the rails so carts can cross smoothly.
  * Add a pair of simple wooden warning posts / black-and-yellow striped crossing signs (*fumikiri*).

---

## 3. Dynamic Train Traffic: The 1870s Steam Locomotive
Bring the railroad to life just like the canal barge and street rickshaws.

### Implementation Tasks
* **Blender Asset (`vehicle_train.glb`):**
  * Model an early British-style 2-4-0 tank locomotive with a tall smokestack, coupled to one wooden passenger car.
* **Train Pathfinding & Animation (`trainTraffic.js`):**
  * Navigate along connected rail graph nodes.
  * Stop at the rural depot platform for 3 seconds to "board passengers" before continuing or reversing.
  * Emit small, intermittent low-poly white steam puffs from the smokestack while in motion.

---

## 4. Economic Evolution: Modern Meiji Industry (Textile Mills)
Now that rail and water transport exist, introduce the first true industrial factories.

### Implementation Tasks
* **New Zone / Upgrade: Meiji Silk Reeling / Cotton Mill (*Seishi-jō*)**
  * Industrial zones adjacent to both a Road and Rail/Canal can upgrade from basic artisan workshops to a multi-story red-brick textile mill with a tall smoking chimney.
  * Significantly boosts town cashflow and regional trade revenue.