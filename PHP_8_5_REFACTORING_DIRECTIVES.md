# Agent Directives: Project Meiji Town - PHP 8.5.12 Compliance & API Performance

> **Target Project:** `C:\xampp\htdocs\meijitown`  
> **Runtime Environment:** PHP 8.5.12 (ZTS Visual C++ 2022 x64) / Apache 2.4.58 (Win64) / MySQL (XAMPP Windows)  
> **Architecture Status:** Hexagonal Architecture established in `src/`  
> **Special Skills Required:** `/ponytail` (minimalist, zero-bloat code < 450 lines) & `/tfd_lobby` (board game lounge standards)  
> **Lead Architect Directive:** Security-First Principal Engineer Governance  

---

## 1. Executive Summary & PHP 8.5.12 Runtime Baseline

The server's PHP runtime has been upgraded to **PHP 8.5.12** (VS17 x64 with OPcache).

`meijitown` pairs a Three.js isometric client with a PHP/MySQL backend API ([`api/index.php`](file:///C:/xampp/htdocs/meijitown/api/index.php), [`api/load_city.php`](file:///C:/xampp/htdocs/meijitown/api/load_city.php), [`api/save_city.php`](file:///C:/xampp/htdocs/meijitown/api/save_city.php)) and connects to The Flying Dutchmen lounge via [`game.json`](file:///C:/xampp/htdocs/meijitown/game.json).

The mission for agents is to align the existing Hexagonal Architecture with PHP 8.5's modern idioms, enforce strict file size limits (< 450 lines per `/ponytail`), and guarantee that API endpoints never emit unhandled errors that could break the 3D client.

---

## 2. PHP 8.5 Idioms for Meiji Town

### 2.1 Domain Entities with Asymmetric Visibility & Property Hooks
Modernize `src/Domain/Model/` (`City.php`, `CityGrid.php`, `Tile.php`, `CityMetrics.php`):

```php
<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

final class CityMetrics
{
    public function __construct(
        public private(set) int $population = 0,
        private int $treasury = 5000,
        public private(set) int $sanitationLevel = 100,
        public private(set) int $fireRisk = 10
    ) {}

    // Property hook guarding treasury against negative balance
    public int $funds {
        get => $this->treasury;
        set {
            if ($value < 0) {
                throw new InvalidArgumentException("Treasury cannot fall below 0. Attempted: {$value}");
            }
            $this->treasury = $value;
        }
    }
}
```

### 2.2 Native Payload Validation with `json_validate()`
Before decoding large city grid payloads in [`api/save_city.php`](file:///C:/xampp/htdocs/meijitown/api/save_city.php) or `SaveCityGridUseCase`, validate JSON structure natively without memory overhead:

```php
$rawPayload = file_get_contents('php://input') ?: '';

if (!json_validate($rawPayload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Malformed JSON payload'], JSON_THROW_ON_ERROR);
    exit(0);
}

$data = json_decode($rawPayload, true, 512, JSON_THROW_ON_ERROR);
```

### 2.3 Strict Parameter Typing (Fix Implicitly Nullable Parameters)
Ensure all API handlers and repository methods explicitly declare nullable types:
* Change any `function getCity(int $id, string $format = null)` to `function getCity(int $id, ?string $format = null): array` to eliminate PHP 8.5 `E_DEPRECATED` notices.

### 2.4 Use `#[Override]` on Persistence Repositories
Tag all methods in `src/Infrastructure/Repository/PdoCityRepository.php` and `PdoSavedCityRepository.php` with `#[Override]`.

---

## 3. Mandatory Governance & Code Rules

1. **Strict Types:** `declare(strict_types=1);` must lead every PHP file.
2. **Ponytail Constraint (Hard Limit):** Keep all PHP files strictly under **450 lines**. Extract cohesive domain services if classes grow.
3. **Bulletproof JSON Responses:** Always pass `JSON_THROW_ON_ERROR` to `json_encode()` and set `Content-Type: application/json; charset=utf-8`. API endpoints must never output raw PHP HTML errors.
4. **Database Governance (MySQL InnoDB):** Ensure `cities`, `saved_cities`, and `city_tiles` use `ENGINE=InnoDB` with atomic transactions (`beginTransaction()`, `commit()`, `rollBack()`) on all grid updates.

---

## 4. Agent Verification Checklist

1. **Syntax Check:** Run `C:\xampp\php\php.exe -l` on all files in `src/` and `api/`.
2. **Ping Test:** Verify `curl -s "http://localhost/meijitown/api/index.php?action=ping"` returns valid JSON with status `ok`.
3. **File Length Audit:** Run a PowerShell check confirming no PHP file exceeds 450 lines.
