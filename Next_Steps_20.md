# Project Meiji: Iteration 23 — Telegraph Infrastructure, Fire Disasters & Ginza Brick

## 1. Global Context & Architectural Constraints
* **Global Skill Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Strict File Size Directive (Hard Constraint):**
  * **Max File Limit:** No source file may exceed **500–600 lines**.
  * **Proactive Assessment:** Keep `telegraphSystem.js`, `disasterManager.js`, and `tradePier.js` separated in modular scripts.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL, PHP.

---

## 2. Communication Grid: Telegraph Network (*Denshin*)
Introduce the network grid that links municipal wards.

### Implementation Tasks
* **Ploppable: Telegraph Office (*Denshin-kyoku*) [¥220, upkeep ¥6/mo]:**
  * 1x1 brick/wood office with a rooftop antenna rod.
* **Network Spreader (`telegraphSystem.js`):**
  * Automatically strings wooden poles with hanging wire lines along upgraded Stone Paving routes.
  * Connects civic buildings (Police, Fire, School) into an active network, increasing their response range by +30%.

---

## 3. Dynamic Hazard: The Fire Alarm & Firebreaks
Test the player's urban planning against traditional wooden hazards.

### Implementation Tasks
* **Fire Propagation Loop (`disasterManager.js`):**
  * Dry autumn/winter months increase ignition odds on unserviced wooden machiya.
  * Fire spreads to orthogonally adjacent wooden tiles after 10 seconds unless checked.
  * Canal water, stone roads, and Kura-zukuri buildings stop fire propagation cold.
* **Response Units:**
  * Fire Depot dispatches a Hikeshi brigade with a matoi standard to extinguish the blaze within its operational radius.

---

## 4. Tier 4 Commercial Evolution: Western Brick Arcades (*Ginza Rengagai*)
Reward high-value transit hubs with early-modern architecture.

### Implementation Tasks
* **New Building Model (`commercial_tier3_brick.glb`):**
  * Two-story Georgian-influenced red brick merchant house with arched windows and a timber roof.
* **Upgrade Trigger:**
  * Commercial zones touching both Stone Paving and Telegraph lines, with active rail or canal access.