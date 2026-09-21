-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.20.0.7320
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for booking_room_bpr
CREATE DATABASE IF NOT EXISTS `booking_room_bpr` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `booking_room_bpr`;

-- Dumping structure for table booking_room_bpr.booking_history
CREATE TABLE IF NOT EXISTS `booking_history` (
  `id_booking` int(12) NOT NULL AUTO_INCREMENT,
  `id_room` int(12) NOT NULL,
  `id_user` int(11) NOT NULL,
  `nama_booking` varchar(255) NOT NULL,
  `tanggal_booking` date NOT NULL,
  `waktu_mulai` time NOT NULL,
  `waktu_selesai` time NOT NULL,
  PRIMARY KEY (`id_booking`),
  KEY `fk_booking_user` (`id_user`),
  KEY `fk_booking_room` (`id_room`),
  CONSTRAINT `fk_booking_room` FOREIGN KEY (`id_room`) REFERENCES `room_meeting` (`id_room`) ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`id_user`) REFERENCES `user_login` (`id_user`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table booking_room_bpr.booking_history: ~4 rows (approximately)
INSERT INTO `booking_history` (`id_booking`, `id_room`, `id_user`, `nama_booking`, `tanggal_booking`, `waktu_mulai`, `waktu_selesai`) VALUES
	(1, 1, 1, 'interview tahap 3 calon karyawan BPR gunung rizki', '2026-09-22', '10:30:00', '15:00:00'),
	(2, 2, 5, 'Weekly Meeting IT team', '2026-09-22', '09:00:00', '11:00:00'),
	(3, 2, 5, 'IT Dev progress work', '2026-09-22', '13:00:00', '14:30:00'),
	(7, 6, 1, 'meeting team', '2026-09-24', '14:00:00', '15:00:00');

-- Dumping structure for table booking_room_bpr.room_meeting
CREATE TABLE IF NOT EXISTS `room_meeting` (
  `id_room` int(12) NOT NULL AUTO_INCREMENT,
  `nama_ruang` varchar(255) DEFAULT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_room`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table booking_room_bpr.room_meeting: ~5 rows (approximately)
INSERT INTO `room_meeting` (`id_room`, `nama_ruang`, `desc`, `created_at`) VALUES
	(1, 'Ruang Meeting 1', 'Ruang meeting khusus untuk direksi dan para manager', '2026-09-17 12:01:31'),
	(2, 'Ruang Meeting 2', 'Ruang meeting khusus untuk manager', '2026-09-17 12:09:04'),
	(3, 'Ruang Meeting 3', 'Ruang meeting khusus untuk SPV Divisi dan Staff', '2026-09-17 12:09:24'),
	(4, 'Ruang Training Hall', 'Ruang meeting khusus untuk pelatihan skill', '2026-09-17 12:10:06'),
	(6, 'Ruang Meeting 4', 'General', '2026-09-21 10:14:53');

-- Dumping structure for table booking_room_bpr.user_login
CREATE TABLE IF NOT EXISTS `user_login` (
  `id_user` int(12) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `create_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table booking_room_bpr.user_login: ~3 rows (approximately)
INSERT INTO `user_login` (`id_user`, `username`, `password`, `role`, `create_at`) VALUES
	(1, 'admin', '$2a$12$0QKyWY7YdcSDxYZe3iV1c.CSuhez4pcCli1arUTx0pagY1R8xLxGy', 'admin', '2026-09-10 05:18:14'),
	(2, 'user', '$2a$12$wmoPQ.M2m7Klufhot/5Zn.3g7xdO1.P4poZW8FXeblvcWB0pv6o4S', 'user', '2026-09-10 05:18:14'),
	(5, 'danen', '$2b$10$iL7OMCYmWDgWm5YivTLzY.SiXJpBIZyjB1w7oDJt.Jm5B/p6cpExG', 'user', '2026-09-17 11:42:39');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
