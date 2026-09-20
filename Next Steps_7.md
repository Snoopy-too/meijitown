# Project Meiji: Iteration 7 — The Modernization Era (1880s)

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL database, Blender.

---

## 2. Feature 1: Level 3 Building Upgrades (Giyōfū / Red Brick Era)
Reflect the architectural revolution of the 1880s (*Ginza Bricktown* style).

### Implementation Tasks
* **Blender Asset:**
  * Model `commercial_l3_giyofu.glb`: A two-story Western-Japanese hybrid building featuring red brick exterior, arched glass display windows, stone quoins on corners, and a tiled roof or small clock/balcony feature.
* **Simulation Upgrade Check:**
  * When a Level 2 commercial building is within the radius of a Fire Depot/Watchtower and treasury/prosperity is high, promote it to Level 3.
  * **Perk:** Complete fire immunity (brick exterior cannot catch fire) and +15 population / 2x tax revenue.

---

## 3. Feature 2: Street Life & Ambient Traffic (Rickshaws & Pedestrians)
Bring dynamic life to the empty dirt thoroughfares.

### Implementation Tasks
* **Road Pathfinding Nodes:**
  * Treat road tiles as connected graph nodes.
* **Agent Spawning:**
  * Spawn low-poly or sprite-based pedestrians (traditional kimono robes, umbrellas) and two-wheeled rickshaws (*jinrikisha*).
  * Rickshaws pick a random path between Residential zones and Commercial/Workshop zones along connected road tiles.
  * Simple linear interpolation (`lerp`) moving between tile centers creates believable ambient street motion.

---

## 4. Feature 3: Public Sanitation — Communal Well (*Ido*)
Introduce public health management.

### Implementation Tasks
* **New Ploppable:** **Communal Well (*Ido*)** [¥60, upkeep ¥1/mo].
* **Sanitation Mechanics:**
  * Residential houses further than 6 tiles from an *Ido* accumulate a "Cholera / Sanitation" risk.
  * Display a water droplet icon or warning in the Surveyor's Scope when inspecting unwatered tiles.
  * Placed wells grant clean water coverage across a 6-tile radius, unlocking higher population density.

---

## 5. Execution Order for Agent
1. **Asset Creation:** Model the communal well (*Ido*) and the Level 3 Giyōfū brick commercial building in Blender.
2. **Sanitation System:** Add the Communal Well to the toolbar (hotkey `7`) and hook its coverage radius into the town health metric.
3. **Level 3 Promotion:** Add Level 3 evolution logic to the growth tick engine.
4. **Pedestrian/Rickshaw Spawner:** Implement basic wayfinding along road meshes for low-poly rickshaws.