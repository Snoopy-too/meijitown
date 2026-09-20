# Project Meiji: Iteration 10 — Entertainment Districts & Citizen Happiness

## 1. Global Directives & Agent Setup
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js engine, MariaDB/MySQL, Blender.

---

## 2. Citizen Satisfaction & Happiness Metric
Introduce a holistic town welfare score that drives population growth and tax revenue.

### Implementation Tasks
* **Data Model (`simulation.js`):**
  * Track `townHappiness` (0% to 100%, default 65%).
  * Calculated factors per residential tile:
    * `+` Road connectivity (+15%)
    * `+` Well sanitation coverage (+20%)
    * `+` Entertainment / Teahouse access (+25%)
    * `+` Fire protection coverage (+15%)
    * `-` Adjacent to heavy workshop/industrial (-20%)
    * `-` Recent uncleaned charred ruins nearby (-30%)
* **Top Banner Indicator:**
  * Add a Happiness gauge / icon (e.g., `Satisfaction: 78%` or a traditional smiley/crest icon) next to the RCI meter.
* **Simulation Impacts:**
  * **Happiness > 75%:** +25% residential demand and +10% tax revenue.
  * **Happiness < 40%:** Influx halts; residents begin abandoning homes into vacant dilapidated plots.

---

## 3. Entertainment Civic Buildings (Blender & Engine)
Provide the player with tools to build dedicated cultural and entertainment quarters.

### Implementation Tasks
* **New Ploppable 1: Traditional Teahouse (*Ochaya*)**
  * **Cost:** ¥120 | **Upkeep:** ¥3/mo | **Hotkey:** `9`
  * **Radius:** 6-tile circular entertainment zone.
  * **Blender Model (`civic_ochaya.glb`):** Two-story wooden building with dark cedar siding, exterior red paper hanging lanterns (*chōchin*), and sliding reed screens (*sudare*).
* **New Ploppable 2: Public Bathhouse (*Sentō*)**
  * **Cost:** ¥90 | **Upkeep:** ¥2/mo
  * **Blender Model (`civic_sento.glb`):** Traditional roof with high wooden ventilation chimney and split entrance curtain (*noren*).
  * **Mechanic:** Provides +50% sanitation and +25% entertainment within a 5-tile radius.
* **Surveyor's Scope Addition:**
  * Add `Leisure: None / Covered` field to the tile inspector card.

---

## 4. Visual Polish & Fire Cleanup
* **Extinguish Particle Cleanup:** Ensure flame meshes and countdown badges are immediately destroyed when extinguished by the fire brigade, replaced by a 1.5-second white steam particle puff.
* **Lantern Ambience:** Give the Teahouse model a subtle point light with warm amber illumination (`#FF7A30`) to emphasize the entertainment quarter vibe.