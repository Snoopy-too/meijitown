# Project Meiji: Iteration 17 — Performance Optimization & Multi-User Save System

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file lengths before adding code. Extract helper modules (e.g., `instancingManager.js`, `authModal.js`, `apiClient.js`) to prevent bloated files.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL (`meijitown_db`), PHP.

---

## 2. Performance Engineering: Eliminating Fan Noise & Lag Freezes
Drastically reduce draw calls and CPU main-thread blocking as the settlement expands.

### Implementation Tasks
* **Switch to `THREE.InstancedMesh` (`instancingManager.js`):**
  * Group repeating assets into single instanced batches:
    * All perimeter and canal trees (pines, willows, sakura).
    * Standard road tiles and paving slabs.
    * Level 1 Machiya and Level 2 Kura-zukuri meshes.
  * Update instance transformation matrices (`setMatrixAt`) instead of creating individual unique meshes. This collapses 500+ draw calls into fewer than 10.
* **Raycaster Optimization:**
  * Ensure the placement raycaster only intersects an invisible 2D ground collision plane (`planeMesh`), never the complex collection of building/tree geometries.
* **Pathfinding Throttling:**
  * Cache road path segments for rickshaws and pedestrians. Do not recalculate entire paths unless the road network itself is modified.

---

## 3. Database Schema & Backend Migration (XAMPP MySQL)
Create persistent multi-user tables in `meijitown_db`.

### SQL Schema (`database/migration_v2.sql`):
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    city_name VARCHAR(100) NOT NULL,
    chronicle_year INT NOT NULL,
    chronicle_month INT NOT NULL,
    population INT NOT NULL,
    treasury INT NOT NULL,
    city_data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);