# Project Meiji: Iteration 16 — Settlement Milestones, Overlays & Civic Edicts

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Check file line counts before writing new logic. If modifying a file pushes it past ~500 lines, immediately execute an on-the-spot modular extraction before proceeding.
  * **Module Extraction Candidates:** `milestoneManager.js`, `overlaySystem.js`, `policyManager.js`.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client engine, MySQL/MariaDB database, Blender.

---

## 2. Settlement Milestones & Historical Eras
Give the player concrete growth targets that unlock new capabilities and celebrate town expansion.

### Implementation Tasks
* **Milestone Tiers (`milestoneManager.js`):**
  * **Tier 1: Outpost Village (*Mura*)** [Pop 0–100] $\rightarrow$ Basic dirt roads, Machiya, Wells.
  * **Tier 2: Bustling Post Town (*Shukuba-machi*)** [Pop 100–300] $\rightarrow$ Watchtower, Fire Depot, Teahouses, Canals.
  * **Tier 3: Industrial District (*Kōgyō-chiku*)** [Pop 300–600] $\rightarrow$ Railways, Kōban, Textile Mills, Stone Paving.
  * **Tier 4: Modern Imperial City (*Daitokai*)** [Pop 600+] $\rightarrow$ Brick promenade, Giyōfū architecture, Telegraph network.
* **Celebration Banner:**
  * When a threshold is crossed, trigger a stylized Meiji parchment announcement modal with sound chime, granting a one-time treasury charter grant (+¥1,000 to ¥5,000).

---

## 3. Map Data Overlays / Heatmaps (`overlaySystem.js`)
Allow players to inspect city health at a glance by tinting the terrain.

### Implementation Tasks
* **Overlay Toggle Button:**
  * Add a compact "Layers" button near the Surveyor's Scope or Chronicle header.
* **Heatmap Modes:**
  * **Normal:** Standard full-color rendering.
  * **Fire Risk:** Desaturate scene; tint tiles from green (0% risk / near canals / brick) to bright red (dense unserviced timber blocks).
  * **Sanitation / Water:** Highlight well coverage circles in translucent blue; unserviced residences glow orange.
  * **Land Value / Happiness:** Tint plots according to satisfaction score (gradient from muted grey to golden yellow).

---

## 4. Civic Policies & Imperial Edicts (*Seisaku*)
Introduce municipal governance levers.

### Implementation Tasks
* **Policy Ledger Modal (`policyManager.js`):**
  * A slide-out parchment modal accessible from a small crest/seal icon in the header.
* **Initial Edicts (Toggleable):**
  * **Night Fire Watch (*Yakin*):** -40% fire outbreak probability, -¥15/mo upkeep, -5% nighttime commercial revenue.
  * **Clean Water Mandate:** Requires well coverage; +10% health/population growth, +¥10/mo public health cost.
  * **Modernization Subsidy:** Speeds up conversion of wooden Machiya to Level 2 Kura-zukuri and Level 3 Giyōfū brick buildings by 50%, costs ¥50 per conversion from treasury.

---

## 5. Execution Order for Agent
1. **Line Count Audit:** Review current file sizes to maintain the <600 line limit.
2. **Milestone Engine:** Implement `milestoneManager.js` and wire population triggers to reward notifications.
3. **Data Overlays:** Build `overlaySystem.js` to dynamically swap terrain/ground quad vertex colors based on risk metrics.
4. **Policy Ledger:** Create the policy data model and toggle UI.