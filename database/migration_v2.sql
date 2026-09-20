-- Project Meiji: Iteration 17 Migration v2
-- Multi-User Account & Settlement Persistence Schema
-- Engine: InnoDB with Foreign Key constraints and strict UTF-8mb4 integrity

CREATE DATABASE IF NOT EXISTS `meijitown_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `meijitown_db`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saved_cities` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `city_name` VARCHAR(100) NOT NULL,
    `chronicle_year` INT NOT NULL,
    `chronicle_month` INT NOT NULL,
    `population` INT NOT NULL,
    `treasury` INT NOT NULL,
    `city_data` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_saved_cities_user` FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;