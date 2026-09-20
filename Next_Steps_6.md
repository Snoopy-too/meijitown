# Project Meiji: Iteration 6 — Firefighting & Active Disaster Response

## 1. Global Context & Agent Directives
* **Global Instruction:** Always invoke and apply the `/ponytail` skill across all development workflows, task execution, script modifications, and asset generation.
* **Environment:** Local XAMPP (`meijitown/public/`), Three.js client, MySQL database, Blender.

---

## 2. Emergency Response: Fire Brigade Depot (*Hikeshi-sho*)

The Watchtower currently provides passive risk reduction, but the town lacks an active response unit to extinguish active blazes.

### Implementation Tasks
1. **Toolbar Addition:**
   * Add a new civic building: **Fire Brigade Depot (*Hikeshi-sho*)** [¥180, upkeep ¥5/mo].
   * Place an icon representing a traditional wooden banner (*matoi*) or fire bell.
2. **Response Loop & Extinguishing Logic:**
   * When a fire breaks out on a tile:
     * Check if a *Hikeshi-sho* exists and has road network connectivity to the burning plot.
     * If within operational radius (e.g., 10 tiles), trigger the brigade dispatch state.
     * Calculate transit time based on road distance.
     * If transit time < the fire countdown timer:
       * Cancel the fire spread countdown.
       * Extinguish the flame mesh, spawn a small white water/steam particle burst, and restore the building to normal operation.
3. **Low-Poly Dispatch Visual (Optional/Staged):**
   * Spawn a simple wooden hand-pump cart sprite or low-poly mesh moving along the road nodes toward the burning structure.

---

## 3. Tactical Emergency Demolition (Firebreak Tactic)
Enable the historical technique of demolishing adjacent homes to halt fire spread.

### Implementation Tasks
* When a neighbor tile is burning, if the player uses the **Demolish tool (`B`)** on an adjacent unburned wooden building, immediately convert that tile to empty rubble/cleared dirt.
* Because the fuel is removed, the fire spread algorithm must detect no wooden structure present and stop propagating in that direction.

---

## 4. Disaster Recovery & Reconstruction Flow
Streamline how the player cleans up and recovers after a fire.

### Implementation Tasks
* **Charred Rubble Interaction:**
  * When hovering over a charred ruins tile with the Demolish tool (`B`), highlight it with an axe/shovel clearing icon.
  * Clicking costs a small clearing fee (¥5) and instantly resets the tile back to an unoccupied zoned plot (preserving the zone type so the player doesn't have to repaint it).
* **Auto-Rebuild on High Demand:**
  * If the plot is cleared back to a zoned meadow, it will automatically spawn new scaffolding on subsequent simulation ticks if zone demand is high.