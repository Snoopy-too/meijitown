-- Project Meiji: Complete Consolidated Schema for Deployment
-- Engine: InnoDB with Foreign Key constraints and UTF-8mb4 integrity
-- Tables kept: users, saved_cities, cities
-- Note: city_grids and city_metrics are consolidated into data/city_config.json

-- Drop obsolete tables if migrating
DROP TABLE IF EXISTS `city_grids`;
DROP TABLE IF EXISTS `city_metrics`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Multi-User Saved Cities (Used by Account Save/Load System)
CREATE TABLE IF NOT EXISTS `saved_cities` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `city_name` VARCHAR(100) NOT NULL,
    `chronicle_year` INT NOT NULL,
    `chronicle_month` INT NOT NULL,
    `population` INT NOT NULL,
    `treasury` INT NOT NULL,
    `city_data` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_saved_cities_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Legacy Cities Table (Used by CityRepository)
CREATE TABLE IF NOT EXISTS `cities` (
    `city_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `city_name` VARCHAR(100) NOT NULL,
    `treasury` INT NOT NULL DEFAULT 5000,
    `population` INT NOT NULL DEFAULT 0,
    `current_year` INT NOT NULL DEFAULT 1872,
    `current_month` INT NOT NULL DEFAULT 1,
    `last_saved` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cities_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
