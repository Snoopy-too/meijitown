# Project Plan: Meiji Era City Builder ("Project Meiji")

## 1. Project Overview & Directives
* **Concept:** A web-based historical city simulation set during Japan's Meiji period (1868–1912). Players balance rapid Western modernization with traditional infrastructure, managing growth, fire hazards, public sanitation, and industrialization.
* **Core Loop:** Grid & road layout $\rightarrow$ Growable zoning (Residential, Merchant/Commercial, Industrial) $\rightarrow$ Ploppable civics/utilities $\rightarrow$ Demand-driven autonomous construction and building upgrades over time.
* **Agent Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, and codebase maintenance on this machine.

---

## 2. Local Environment & Toolchain
* **Database & Local Server:** XAMPP (Apache + MySQL/MariaDB).
* **3D Asset Pipeline:** Blender (modular low-poly kit-bashing and GLTF/GLB export).
* **Frontend/Client Engine:** WebGL / Three.js (or Babylon.js) running in modern browsers.
* **Backend API:** PHP (served via Apache/XAMPP) handling authentication, world state persistence, and simulation tick validation.

---

## 3. System Architecture & Database Schema

### Database Configuration (MySQL / MariaDB via XAMPP)
Use relational tables for user data, city metadata, and transactional stats; use structured JSON fields for spatial grid layouts to avoid per-tile DB write bottlenecks.

* `users`: `user_id`, `username`, `password_hash`, `created_at`
* `cities`: `city_id`, `user_id`, `city_name`, `treasury`, `population`, `current_year`, `current_month`, `last_saved`
* `city_grids`: `city_id`, `grid_width`, `grid_height`, `tile_data` (compressed JSON payload storing coordinates, zone assignments, ploppables, and road connectivity)
* `city_metrics`: `city_id`, `tradition_modernity_balance`, `fire_risk`, `cholera_risk`, `industrial_demand`, `commercial_demand`, `residential_demand`

---

## 4. Work Breakdown Structure (Phased Roadmap)

### Phase 1: Prototype Foundation (Greybox Simulation)
* **Goal:** A playable grid with basic road building and zone painting.
* **Tasks:**
  * Initialize repository and verify global `/ponytail` skill integration.
  * Configure XAMPP MySQL database and establish a PHP API connection.
  * Build a basic 2D/isometric grid canvas using Three.js.
  * Implement the **Road Tool**: Allow players to lay grid-aligned dirt streets.
  * Implement the **Zoning Brush**: Allow designation of adjacent tiles into:
    * Residential (*Nagaya/Machiya*)
    * Commercial (*Shouten/Merchants*)
    * Industrial (*Workshops/Mills*)

### Phase 2: Autonomous Growth & Tick Engine
* **Goal:** Replicate *Cities: Skylines* procedural "growables" on a game clock.
* **Tasks:**
  * Implement a demand model based on population, jobs, and goods.
  * **Lot Finder:** When demand > 0 and a zoned plot has road access, pick an empty lot ($1\times1$, $1\times2$) and spawn a Level 1 building foundation.
  * **Construction State Machine:**
    * `Unbuilt` $\rightarrow$ `Under Construction (Scaffolding)` $\rightarrow$ `Active Level 1`.
  * Create save/load endpoints in PHP to serialize the grid state to the MySQL database.

### Phase 3: Meiji Period Systems & Ploppables
* **Goal:** Implement the historical dilemmas unique to the era.
* **Tasks:**
  * **Fire Risk & Spread:** Dense wooden districts carry extreme fire hazard; ploppable *Hikeshi* (fire brigades) reduce spread.
  * **Sanitation & Water:** Unfiltered ditches raise epidemic risk; clean water infrastructure unlocks as civic ploppables.
  * **Building Upgrades:**
    * Level 1: Timber/Thatch (high fire risk, cheap).
    * Level 2: *Kura-zukuri* (plastered tile-roof storehouses).
    * Level 3: *Giyōfū* (Western brick/stone hybrid architecture).
  * **Civic Ploppables:** *Koban* (police boxes), telegraph offices, steam rail stations.

### Phase 4: Asset Pipeline in Blender
* **Goal:** Replace colored geometric placeholder cubes with stylized historical models.
* **Tasks:**
  * Model a modular timber kit: wall slats, clay tile roofs, sliding doors, timber posts.
  * Model a modular Western/Giyōfū kit: red brick facades, stone arches, gas streetlamps.
  * Texture using a single shared palette texture atlas for high web performance.
  * Export low-poly models as `.glb` files and map them to lot-spawning tiers in the client engine.

---

## 5. Agent Instructions & Next Steps
1. **Initialize Workspace:** Set up the project directory inside the XAMPP web root (`htdocs/project-meiji`).
2. **Apply Global Skill:** Confirm `/ponytail` is loaded and referenced in every task execution.
3. **Run Database Migration:** Create the initial database schema in MySQL via phpMyAdmin or raw SQL CLI.
4. **Implement Phase 1:** Spin up the minimal HTML5/Three.js grid canvas and road-drawing tool.