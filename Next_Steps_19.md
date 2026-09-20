# Project Meiji: Iteration 20 — Dev Auth Mock & Save State Verification

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Inspect file lengths before editing. Keep `saveManager.js` and `api/save_city.php` modular and concise.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL (`meijitown_db`), PHP.

---

## 2. Shared Session Contract & Dev Auth Mock
Set up an authentication contract compatible with the target deployment site.

### Implementation Tasks
* **Session Contract (`api/session_check.php`):**
  * Check for an existing session key: `$_SESSION['user_id']` / `$_SESSION['username']`.
  * Return JSON: `{ "authenticated": true, "user_id": 1, "username": "Fidel" }` or `{ "authenticated": false }`.
* **Local Dev User Switcher (`api/dev_login.php`):**
  * Active only when `$_SERVER['REMOTE_ADDR'] === '127.0.0.1' || '::1'`.
  * Clicking the **Mayor (Guest) - Sign In** button opens a clean modal:
    * Select profile: `Fidel (ID: 1)` or `Guest`.
  * Sets the target `$_SESSION` variables and updates the header pill to `👤 Mayor: Fidel`.

---

## 3. Save & Load Pipeline Verification
Verify serialization and database storage without waiting for site integration.

### Implementation Tasks
* **Save Endpoint (`api/save_city.php`):**
  * Read `user_id` strictly from `$_SESSION['user_id']`.
  * Validate JSON payload (grid arrays, treasury, population, chronicle date, active edicts).
  * Execute `INSERT ... ON DUPLICATE KEY UPDATE` into `saved_cities`.
* **Load Endpoint (`api/load_city.php`):**
  * Fetch saved slots matching `user_id`.
  * Rehydrate the Three.js scene, rebuild instanced meshes, and restore simulation stats.

---

## 4. Execution Order for Agent
1. **Apply Global Directive:** Ensure `/ponytail` is invoked.
2. **Audit File Sizes:** Verify all modified files stay under 500 lines.
3. **Session Mock:** Create `api/session_check.php` and the dev login modal.
4. **Save Pipeline Test:** Connect the "Save City" button to `save_city.php` and verify rows insert cleanly into MySQL.