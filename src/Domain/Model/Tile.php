<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

// ponytail: compact value object, self-validating
final class Tile
{
    public const TYPE_EMPTY = 'empty';
    public const TYPE_ROAD = 'road';
    public const TYPE_ZONE = 'zone';
    public const TYPE_SERVICE = 'service';
    public const TYPE_CANAL = 'canal';
    public const TYPE_RAIL = 'rail';
    public const TYPE_PARK = 'park';

    public const ZONE_RESIDENTIAL = 'residential';
    public const ZONE_COMMERCIAL = 'commercial';
    public const ZONE_INDUSTRIAL = 'industrial';

    public const STAGE_NONE = 'none';
    public const STAGE_SCAFFOLDING = 'scaffolding';
    public const STAGE_BUILT = 'built';
    public const STAGE_ON_FIRE = 'on_fire';
    public const STAGE_BURNED = 'burned';

    public function __construct(
        public readonly int $x,
        public readonly int $y,
        public readonly string $type = self::TYPE_EMPTY,
        public readonly ?string $zoneType = null,
        public readonly int $level = 0,
        public readonly bool $occupied = false,
        public readonly string $stage = self::STAGE_NONE,
        public readonly ?string $serviceType = null,
        public readonly int $roadTier = 1,
        public readonly bool $hasBridge = false,
        public readonly ?string $subType = null,
        public readonly int $rotation = 0
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
            self::TYPE_PARK
        ], true)) {
            throw new InvalidArgumentException("Invalid tile type: {$this->type}");
        }

        if ($this->type === self::TYPE_ZONE) {
            if ($this->zoneType === null || !in_array($this->zoneType, [self::ZONE_RESIDENTIAL, self::ZONE_COMMERCIAL, self::ZONE_INDUSTRIAL], true)) {
                throw new InvalidArgumentException("Invalid zone type for zoned tile: {$this->zoneType}");
            }
        }

        if (!in_array($this->stage, [self::STAGE_NONE, self::STAGE_SCAFFOLDING, self::STAGE_BUILT, self::STAGE_ON_FIRE, self::STAGE_BURNED], true)) {
            throw new InvalidArgumentException("Invalid tile stage: {$this->stage}");
        }

        if ($this->rotation < 0 || $this->rotation > 3) {
            throw new InvalidArgumentException("Tile rotation must be an orthogonal step 0..3: {$this->rotation}");
        }
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
        return new self(
            x: (int) ($data['x'] ?? 0),
            y: (int) ($data['y'] ?? 0),
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
