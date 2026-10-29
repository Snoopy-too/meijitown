<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

// ponytail: domain user model with PHP 8.5 asymmetric visibility
final class User
{
    public function __construct(
        public private(set) int $id,
        public private(set) string $username,
        public private(set) string $passwordHash,
        public private(set) string $createdAt = ''
    ) {}

    public function toArray(bool $includeHash = false): array
    {
        $data = [
            'id' => $this->id,
            'username' => $this->username,
            'createdAt' => $this->createdAt,
        ];
        if ($includeHash) {
            $data['passwordHash'] = $this->passwordHash;
        }
        return $data;
    }
}
