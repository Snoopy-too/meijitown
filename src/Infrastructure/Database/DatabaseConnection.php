<?php
declare(strict_types=1);

namespace Meiji\Infrastructure\Database;

use PDO;

final class DatabaseConnection
{
    private ?PDO $pdo = null;

    public function __construct(
        private readonly string $host = '127.0.0.1',
        private readonly int $port = 3306,
        private readonly string $database = 'meijitown',
        private readonly string $username = 'root',
        private readonly string $password = ''
    ) {}

    public function getPdo(): PDO
    {
        if ($this->pdo === null) {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->database};charset=utf8mb4";
            $this->pdo = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return $this->pdo;
    }
}
