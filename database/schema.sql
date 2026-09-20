-- Project Meiji Database Schema
-- Engine: InnoDB with Foreign Key constraints and strict integrity

CREATE DATABASE IF NOT EXISTS `meijitown` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `meijitown`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cities Table
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
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. City Grids (Spatial JSON storage)
CREATE TABLE IF NOT EXISTS `city_grids` (
    `city_id` INT PRIMARY KEY,
    `grid_width` INT NOT NULL DEFAULT 32,
    `grid_height` INT NOT NULL DEFAULT 32,
    `tile_data` LONGTEXT NOT NULL,
    CONSTRAINT `fk_grids_city` FOREIGN KEY (`city_id`)
        REFERENCES `cities` (`city_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. City Metrics
CREATE TABLE IF NOT EXISTS `city_metrics` (
    `city_id` INT PRIMARY KEY,
    `tradition_modernity_balance` INT NOT NULL DEFAULT 50,
    `fire_risk` INT NOT NULL DEFAULT 20,
    `cholera_risk` INT NOT NULL DEFAULT 10,
    `industrial_demand` INT NOT NULL DEFAULT 30,
    `commercial_demand` INT NOT NULL DEFAULT 40,
    `residential_demand` INT NOT NULL DEFAULT 60,
    CONSTRAINT `fk_metrics_city` FOREIGN KEY (`city_id`)
        REFERENCES `cities` (`city_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
