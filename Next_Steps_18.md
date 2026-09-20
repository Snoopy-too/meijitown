# Project Meiji: Iteration 19 — Education, Agriculture & Historical Chronicle

## 1. Global Context & Architectural Hygiene
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file lengths prior to adding logic. If adding code pushes any file past ~500 lines, execute an immediate modular extraction.
  * **Extraction Targets:** `schoolSystem.js`, `agricultureManager.js`, `chronicleLedger.js`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL/MariaDB database, Blender.

---

## 2. Civic Service: Meiji Primary School (*Shōgakkō*)
Introduce public education following the historic 1872 *Gakusei* reforms.

### Implementation Tasks
* **Blender Asset (`civic_school.glb`):**
  * Model a $2\times2$ early Meiji schoolhouse: traditional wooden construction with Western-style glass sash windows, an entrance porch, and a small central bell tower / clock cupola.
* **UI Integration:**
  * Add **Primary School (*Shōgakkō*)** [¥280, upkeep ¥8/mo] to the Civic tab in `#build-drawer`.
* **Simulation Mechanics (`schoolSystem.js`):**
  * Radius: 8-tile education coverage.
  * Boosts adjacent commercial and industrial upgrade potential to Tier 3 (Giyōfū brick and modern mills).
  * Surveyor's Scope: Add `Education: Unserved / Educated`.

---

## 3. Agrarian Infrastructure: Irrigated Rice Paddies (*Suiden*)
Ground the town's perimeter in traditional Japanese agricultural cultivation.

### Implementation Tasks
* **New Zone / Tool: Rice Paddy (*Suiden*) [¥10]:**
  * Low-lying earthen dikes (*aze*) enclosing shallow field tiles.
* **Dynamic Seasonal Field States (`agricultureManager.js`):**
  * **Spring (M3–M5):** Flooded water reflecting the sky with small green rice seedling clusters.
  * **Summer (M6–M8):** Dense, vibrant lush green stalks.
  * **Autumn (M9–M11):** Golden yellow-brown ready for harvest, adding +¥20 bonus tax yield per tile.
  * **Winter (M12–M2):** Dry cut stubble earth.
* **Canal Synergy:** Paddies placed directly touching canal water tiles receive automatic irrigation without requiring adjacent wells.

---

## 4. Chronicle Ledger & Event Archive (`chronicleLedger.js`)
Turn the date display into an interactive town history log.

### Implementation Tasks
* **Interactive Date Trigger:**
  * Clicking on the `Meiji X (YYYY) - Month` display in the Chronicle banner opens the historical ledger modal.
* **Ledger Content:**
  * Displays town founding date, past imperial charters earned (Village $\rightarrow$ Post Town), and recorded historic events.
  * Tracks high-level municipal statistics: Total taxes collected, fires extinguished by brigades, and peak population.

---

## 5. Execution Order for Agent
1. **Apply Global Directive:** Ensure `/ponytail` is invoked.
2. **File Audit:** Verify modified and created files stay strictly under 500 lines.
3. **Blender Model:** Model `civic_school.glb`.
4. **School Implementation:** Integrate school placement, radius calculation, and surveyor scope integration.
5. **Agriculture System:** Add the Suiden tool and season-linked material states.
6. **Chronicle Ledger:** Build the archive modal and click handler.