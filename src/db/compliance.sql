-- MySQL dump 10.13  Distrib 8.0.34, for macos13 (arm64)
--
-- Host: localhost    Database: compliance
-- ------------------------------------------------------
-- Server version	8.0.34

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `computer_assessment`
--

DROP TABLE IF EXISTS `computer_assessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `computer_assessment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assessment_year` year NOT NULL,
  `assessment_date` date NOT NULL,
  `technician` varchar(50) NOT NULL,
  `overall_score` tinyint NOT NULL,
  `remarks` text,
  `asset_id` int NOT NULL,
  `register_number` varchar(50) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(20) DEFAULT NULL,
  `os_name` varchar(50) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `os_patch_status` varchar(50) DEFAULT NULL,
  `cpu_manufacturer` varchar(50) DEFAULT NULL,
  `cpu_model` varchar(100) DEFAULT NULL,
  `cpu_generation` varchar(50) DEFAULT NULL,
  `memory_manufacturer` varchar(50) DEFAULT NULL,
  `memory_type` varchar(50) DEFAULT NULL,
  `memory_size_gb` smallint DEFAULT NULL,
  `storage_manufacturer` varchar(50) DEFAULT NULL,
  `storage_type` varchar(50) DEFAULT NULL,
  `storage_size_gb` int DEFAULT NULL,
  `graphics_type` varchar(50) DEFAULT NULL,
  `graphics_manufacturer` varchar(50) DEFAULT NULL,
  `graphics_specs` varchar(100) DEFAULT NULL,
  `display_manufacturer` varchar(50) DEFAULT NULL,
  `display_size` varchar(30) DEFAULT NULL,
  `display_resolution` varchar(20) DEFAULT NULL,
  `display_form_factor` varchar(50) DEFAULT NULL,
  `display_interfaces` varchar(200) DEFAULT NULL,
  `ports_usb_a` tinyint DEFAULT '0',
  `ports_usb_c` tinyint DEFAULT '0',
  `ports_thunderbolt` tinyint DEFAULT '0',
  `ports_ethernet` tinyint DEFAULT '0',
  `ports_hdmi` tinyint DEFAULT '0',
  `ports_displayport` tinyint DEFAULT '0',
  `ports_vga` tinyint DEFAULT '0',
  `ports_sdcard` tinyint DEFAULT '0',
  `ports_audiojack` tinyint DEFAULT '0',
  `battery_equipped` tinyint(1) DEFAULT NULL,
  `battery_capacity` varchar(20) DEFAULT NULL,
  `adapter_equipped` tinyint(1) DEFAULT NULL,
  `adapter_output` varchar(20) DEFAULT NULL,
  `av_installed` varchar(30) DEFAULT NULL,
  `av_vendor` varchar(50) DEFAULT NULL,
  `av_status` varchar(30) DEFAULT NULL,
  `av_license` varchar(30) DEFAULT NULL,
  `vpn_installed` varchar(30) DEFAULT NULL,
  `vpn_setup_type` varchar(50) DEFAULT NULL,
  `vpn_username` varchar(50) DEFAULT NULL,
  `installed_software` text,
  `office_account` varchar(200) DEFAULT NULL,
  `attachment_1` varchar(255) DEFAULT NULL,
  `attachment_2` varchar(255) DEFAULT NULL,
  `attachment_3` varchar(255) DEFAULT NULL,
  `asset_status` varchar(20) DEFAULT NULL COMMENT 'new = unlinked asset, linked = has asset_id in assets.assetdata',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `criteria_ownership`
--

DROP TABLE IF EXISTS `criteria_ownership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `criteria_ownership` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `summon`
--

DROP TABLE IF EXISTS `summon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `summon` (
  `smn_id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `reg_no` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `summon_no` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `myeg_date` date DEFAULT NULL,
  `summon_date` date DEFAULT NULL,
  `summon_time` time DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `f_name` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `v_email` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `summon_loc` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `type_of_summon` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `summon_amt` decimal(8,2) DEFAULT NULL,
  `summon_upl` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `receipt_date` date DEFAULT NULL,
  `summon_stat` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `summon_agency` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `summon_receipt` varchar(150) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `emailStat` int DEFAULT NULL,
  `notice` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `notice_date` date DEFAULT NULL,
  `summon_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `running_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`smn_id`)
) ENGINE=InnoDB AUTO_INCREMENT=207 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `summon_agency`
--

DROP TABLE IF EXISTS `summon_agency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `summon_agency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `summon_type`
--

DROP TABLE IF EXISTS `summon_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `summon_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `description` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `summon_type_agency`
--

DROP TABLE IF EXISTS `summon_type_agency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `summon_type_agency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_id` int DEFAULT NULL,
  `agency_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `v_assess2`
--

DROP TABLE IF EXISTS `v_assess2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `v_assess2` (
  `assess_id` int NOT NULL AUTO_INCREMENT,
  `reg_no` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `a_date` datetime DEFAULT NULL,
  `a_loc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `a_ncr` int DEFAULT NULL,
  `a_rate` decimal(10,2) DEFAULT NULL,
  `a_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `a_upload2` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `a_upload3` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `a_upload4` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `a_remark` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `a_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ownership` int DEFAULT '0',
  `acceptance_status` int DEFAULT NULL,
  `acceptance_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`assess_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1115 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `v_assess_dt2`
--

DROP TABLE IF EXISTS `v_assess_dt2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `v_assess_dt2` (
  `adt_id` int NOT NULL AUTO_INCREMENT,
  `assess_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `adt_item` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `adt_ncr` int DEFAULT NULL,
  `adt_rate` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `adt_rate2` int DEFAULT NULL,
  `adt_rem` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `adt_image` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ncr_status` varchar(50) DEFAULT NULL,
  `closed_at` date DEFAULT NULL,
  `action` varchar(200) DEFAULT NULL,
  `svc_order` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`adt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28875 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `v_assess_qset`
--

DROP TABLE IF EXISTS `v_assess_qset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `v_assess_qset` (
  `qset_id` int NOT NULL AUTO_INCREMENT,
  `q_id` int NOT NULL,
  `qset_quesno` int DEFAULT NULL,
  `qset_desc` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `qset_stat` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `qset_type` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `qset_order` int DEFAULT NULL,
  `ownership` int DEFAULT NULL,
  `dept` int DEFAULT NULL,
  `qset_order_new` int DEFAULT '0',
  `year_new_criteria` int DEFAULT '0',
  `created_by` varchar(6) DEFAULT NULL,
  `updated_by` varchar(6) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`qset_id`),
  UNIQUE KEY `qset_quesno` (`qset_quesno`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-25 11:27:49
