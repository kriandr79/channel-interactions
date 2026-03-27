CREATE DATABASE IF NOT EXISTS cil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cil;

CREATE TABLE IF NOT EXISTS channels_interact (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel_id   INT UNSIGNED NOT NULL,
  channel_name VARCHAR(255) NOT NULL DEFAULT '',
  type         ENUM('messenger','letter','call','problem','other') NOT NULL,
  date         DATE         NOT NULL,
  contact      VARCHAR(255) NOT NULL DEFAULT '',
  note         TEXT         NOT NULL DEFAULT '',
  priority     ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  PRIMARY KEY (id),
  INDEX idx_channel_id (channel_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
