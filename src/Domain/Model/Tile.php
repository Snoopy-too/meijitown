<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

// ponytail: compact value object, self-validating with PHP 8.5 asymmetric visibility and property hooks
final class Tile
{
    public const TYPE_EMPTY = 'empty';
    public const TYPE_ROAD = 'road';
    public const TYPE_ZONE = 'zone';
    public const TYPE_SERVICE = 'service';
    public const TYPE_CANAL = 'canal';
    public const TYPE_RAIL = 'rail';
    public const TYPE_PARK = 'park';
    public const TYPE_AGRICULTURE = 'agriculture';

    public const ZONE_RESIDENTIAL = 'residential';
    public const ZONE_COMMERCIAL = 'commercial';
    public const ZONE_INDUSTRIAL = 'industrial';

    public const STAGE_NONE = 'none';
    public const STAGE_SCAFFOLDING = 'scaffolding';
    public const STAGE_BUILT = 'built';
    public const STAGE_ON_FIRE = 'on_fire';
    public const STAGE_BURNED = 'burned';

    public const ALLOWED_SERVICES = [
        'watchtower',
        'fire_depot',
        'well',
        'ochaya',
        'sento',
        'koban',
        'shrine_park',
        'train_depot',
        'school',
        'telegraph',
        'harbor_pier',
        'power_plant',
        'waterworks',
        'pavilion',
        'suimon',
    ];

    public function __construct(
        public private(set) int $x,
        public private(set) int $y,
        public private(set) string $type = self::TYPE_EMPTY,
        public private(set) ?string $zoneType = null,
        public private(set) int $level = 0,
        public private(set) bool $occupied = false,
        public private(set) string $stage = self::STAGE_NONE,
        public private(set) ?string $serviceType = null,
        public private(set) int $roadTier = 1,
        public private(set) bool $hasBridge = false,
        public private(set) ?string $subType = null,
        public private(set) int $rotation = 0
    ) {
        if ($this->x < 0 || $this->y < 0) {
            throw new InvalidArgumentException("Tile coordinates must be non-negative: ({$this->x}, {$this->y})");
        }

        if (!in_array($this->type, [
            self::TYPE_EMPTY,
            self::TYPE_ROAD,
            self::TYPE_ZONE,
            self::TYPE_SERVICE,
            self::TYPE_CANAL,
            self::TYPE_RAIL,
            self::TYPE_PARK,
            self::TYPE_AGRICULTURE,
        ], true)) {
            throw new InvalidArgumentException("Invalid tile type: {$this->type}");
        }

        if ($this->type === self::TYPE_ZONE) {
            if ($this->zoneType === null || !in_array($this->zoneType, [self::ZONE_RESIDENTIAL, self::ZONE_COMMERCIAL, self::ZONE_INDUSTRIAL], true)) {
                throw new InvalidArgumentException("Invalid zone type for zoned tile: {$this->zoneType}");
            }
        }

        if ($this->type === self::TYPE_SERVICE && $this->serviceType !== null) {
            if (!in_array($this->serviceType, self::ALLOWED_SERVICES, true)) {
                throw new InvalidArgumentException("Invalid service type: {$this->serviceType}");
            }
        }

        if (!in_array($this->stage, [self::STAGE_NONE, self::STAGE_SCAFFOLDING, self::STAGE_BUILT, self::STAGE_ON_FIRE, self::STAGE_BURNED], true)) {
            throw new InvalidArgumentException("Invalid tile stage: {$this->stage}");
        }

        if ($this->rotation < 0 || $this->rotation > 3) {
            throw new InvalidArgumentException("Tile rotation must be an orthogonal step 0..3: {$this->rotation}");
        }
    }

    // Property hook for coordinate key (e.g. "5_5")
    public string $coordinateKey {
        get => "{$this->x}_{$this->y}";
    }

    // Property hook to check if tile is flammable
    public bool $isFlammable {
        get => $this->type === self::TYPE_ZONE || $this->type === self::TYPE_PARK;
    }

    public function toArray(): array
    {
        return [
            'x' => $this->x,
            'y' => $this->y,
            'type' => $this->type,
            'zoneType' => $this->zoneType,
            'level' => $this->level,
            'occupied' => $this->occupied,
            'stage' => $this->stage,
            'serviceType' => $this->serviceType,
            'roadTier' => $this->roadTier,
            'hasBridge' => $this->hasBridge,
            'subType' => $this->subType,
            'rotation' => $this->rotation,
        ];
    }

    public static function fromArray(array $data): self
    {
        $y = isset($data['y']) ? (int) $data['y'] : (isset($data['z']) ? (int) $data['z'] : 0);
        return new self(
            x: (int) ($data['x'] ?? 0),
            y: $y,
            type: (string) ($data['type'] ?? self::TYPE_EMPTY),
            zoneType: isset($data['zoneType']) && $data['zoneType'] !== '' ? (string) $data['zoneType'] : null,
            level: (int) ($data['level'] ?? 0),
            occupied: (bool) ($data['occupied'] ?? false),
            stage: (string) ($data['stage'] ?? self::STAGE_NONE),
            serviceType: isset($data['serviceType']) && $data['serviceType'] !== '' ? (string) $data['serviceType'] : null,
            roadTier: (int) ($data['roadTier'] ?? 1),
            hasBridge: (bool) ($data['hasBridge'] ?? false),
            subType: isset($data['subType']) && $data['subType'] !== '' ? (string) $data['subType'] : null,
            rotation: (int) ($data['rotation'] ?? 0)
        );
    }
}
