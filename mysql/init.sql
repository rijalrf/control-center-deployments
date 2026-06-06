-- ============================================================
-- CCD Database Initialization
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS `ccd_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ccd_db`;

-- Users (GitHub OAuth)
CREATE TABLE IF NOT EXISTS `users` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `github_id`    VARCHAR(50)  NOT NULL UNIQUE,
  `login`        VARCHAR(100) NOT NULL,
  `name`         VARCHAR(200),
  `email`        VARCHAR(200),
  `avatar_url`   TEXT,
  `access_token` TEXT,
  `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Environments
CREATE TABLE IF NOT EXISTS `environments` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `color`       VARCHAR(20) DEFAULT '#06b6d4',
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Servers
CREATE TABLE IF NOT EXISTS `servers` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`           VARCHAR(100) NOT NULL,
  `host`           VARCHAR(255) NOT NULL,
  `port`           SMALLINT UNSIGNED DEFAULT 22,
  `username`       VARCHAR(100),
  `environment_id` INT UNSIGNED,
  `status`         ENUM('active','inactive','unknown') DEFAULT 'unknown',
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Repositories
CREATE TABLE IF NOT EXISTS `repositories` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `github_id`      VARCHAR(50) NOT NULL UNIQUE,
  `name`           VARCHAR(200) NOT NULL,
  `full_name`      VARCHAR(300) NOT NULL,
  `description`    TEXT,
  `url`            TEXT,
  `clone_url`      TEXT,
  `language`       VARCHAR(100),
  `default_branch` VARCHAR(100) DEFAULT 'main',
  `visibility`     VARCHAR(20) DEFAULT 'private',
  `synced_at`      DATETIME,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Deployments
CREATE TABLE IF NOT EXISTS `deployments` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `environment_id` INT UNSIGNED,
  `user_id`        INT UNSIGNED,
  `repositories`   JSON,
  `config`         JSON,
  `status`         ENUM('draft','pending','running','success','failed','cancelled') DEFAULT 'draft',
  `notes`          TEXT,
  `deployed_at`    DATETIME,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Deployment Steps
CREATE TABLE IF NOT EXISTS `deployment_steps` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `deployment_id` INT UNSIGNED NOT NULL,
  `step_number`   TINYINT UNSIGNED NOT NULL,
  `step_name`     VARCHAR(100) NOT NULL,
  `status`        ENUM('pending','running','completed','failed','skipped') DEFAULT 'pending',
  `detail`        JSON,
  `log`           TEXT,
  `started_at`    DATETIME,
  `completed_at`  DATETIME,
  FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Seed Data ──
INSERT IGNORE INTO `environments` (`name`, `slug`, `description`, `color`) VALUES
  ('Development', 'development', 'Local development environment', '#22c55e'),
  ('Staging',     'staging',     'Pre-production staging environment', '#f59e0b'),
  ('Production',  'production',  'Live production environment', '#ef4444');
