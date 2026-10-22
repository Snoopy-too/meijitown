# Agent Directives: Project Meiji Town - Backend API Integrity & PHP 8.2.35 Alignment

> **Target Project:** `C:\xampp\htdocs\meijitown`  
> **Runtime Environment:** PHP 8.2.35 (ZTS Visual C++ 2019 x64) / Apache 2.4 / MySQL (XAMPP Windows)  
> **Architecture Status:** Clean Hexagonal Architecture already established in `src/`  
> **Special Skills Required:** `/ponytail` (minimalist, zero-bloat code < 450 lines) & `/tfd_lobby` (board game lounge standards)  
> **Lead Architect Directive:** Security-First Principal Engineer Governance  

---

## 1. Context & Architectural Overview

The XAMPP PHP runtime has been upgraded to **PHP 8.2.35**.

`meijitown` is a historical city-building simulation set in 1872 Japan, featuring a Three.js 3D isometric client communicating with a PHP/MySQL backend API ([api/index.php](file:///C:/xampp/htdocs/meijitown/api/index.php), [api/load_city.php](file:///C:/xampp/htdocs/meijitown/api/load_city.php), [api/save_city.php](file:///C:/xampp/htdocs/meijitown/api/save_city.php)), and integrated into The Flying Dutchmen lounge via [game.json](file:///C:/xampp/htdocs/meijitown/game.json).

The PHP backend is already structured cleanly using Hexagonal Architecture:
* `src/Domain/Model/`: `City`, `CityGrid`, `Tile`, `CityMetrics`, `SavedCity`, `User`.
* `src/Application/UseCase/`: `GetCityStateUseCase`, `SaveCityGridUseCase`, `ResetCityUseCase`, `AuthUserUseCase`, `ManageSavedCitiesUseCase`.
* `src/Infrastructure/`: `Container`, `DatabaseConnection`, `PdoCityRepository`, `PdoSavedCityRepository`.

All incoming agents working on the backend or full-stack features must uphold these architectural boundaries, adhere strictly to `/ponytail` file size limits, and guarantee rock-solid API reliability for the client.

---

## 2. Mandatory Backend & API Governance Rules

### 2.1 Strict Typing
Every PHP script (`.php`) must strictly declare:
```php
<?php
declare(strict_types=1);
```
Ensure all entity models, repositories, and use case methods use strict type hints, return types, and class property declarations (`readonly` where immutable).

### 2.2 Ponytail Code Constraints (Hard Limits)
* **File Size Constraint:** All PHP source files must remain strictly under **450 lines**. Do not let use cases or repositories turn into monolithic classes. If a class expands beyond 400 lines, extract cohesive domain services or helpers immediately.
* **Minimal Dependencies:** Use native PHP 8.2 standard library features instead of bloated external libraries.

### 2.3 Bulletproof JSON API Contracts
* Every API endpoint in `api/` must return standard HTTP status codes (200, 400, 401, 403, 404, 500) and structured JSON with `Content-Type: application/json; charset=utf-8`.
* All JSON serialization/deserialization must use `JSON_THROW_ON_ERROR`:
  ```php
  echo json_encode($payload, JSON_THROW_ON_ERROR);
  ```
* Under NO circumstances should an API endpoint print HTML warnings, notices, or call stack dumps into the HTTP stream, as this will crash the client-side Three.js / boardgame.io JSON parsers.

### 2.4 City Grid State Validation & Security
* When receiving city grid payloads in `SaveCityGridUseCase`:
  * Validate coordinate boundaries (`0 <= x < 20`, `0 <= z < 20`).
  * Validate tile building types against an allowed domain enum or whitelist.
  * Enforce maximum treasury limits and prevent integer overflow or negative manipulation.
  * Guard against XSS in user-provided city names: sanitize with `strip_tags()` and `htmlspecialchars()`.

---

## 3. Database Governance (MySQL InnoDB)

* Tables (`cities`, `saved_cities`, `users`, `city_tiles`) must use **InnoDB** storage engine.
* Save operations (`SaveCityGridUseCase`) must wrap tile inserts/updates and treasury/metric updates within an explicit database transaction:
  ```php
  $pdo->beginTransaction();
  try {
      // Persist city record
      // Persist tile changes
      // Update metrics
      $pdo->commit();
  } catch (\Throwable $e) {
      $pdo->rollBack();
      throw $e;
  }
  ```
* Ensure proper Foreign Keys:
  * `saved_cities.user_id` -> `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  * `city_tiles.city_id` -> `FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE`

---

## 4. TFD Lobby & Game Integration Guidelines

* Maintain compliance with [game.json](file:///C:/xampp/htdocs/meijitown/game.json) manifest schema.
* Keep client scripts (`client.js`, `game.js`) isolated within the Shadow DOM / target container to prevent global namespace pollution with the host platform.
* Client-to-backend communication must cleanly handle network disconnects or API retries without corrupting the active city simulation state.

---

## 5. Agent Verification Checklist

1. **Lint Check:** Run `C:\xampp\php\php.exe -l` on all files in `src/` and `api/`.
2. **Endpoint Health Test:** Verify `curl -s "http://localhost/meijitown/api/index.php?action=ping"` returns `{"status":"ok",...}`.
3. **Session Hardening:** Verify session cookies set `HttpOnly`, `SameSite=Lax`, and `Secure` where applicable.
4. **File Length Audit:** Run a PowerShell line count check to verify zero PHP files exceed 450 lines.
