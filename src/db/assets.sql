-- MySQL dump 10.13  Distrib 8.0.34, for macos13 (arm64)
--
-- Host: localhost    Database: assets
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
-- Table structure for table `1_specs`
--

DROP TABLE IF EXISTS `1_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `1_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `asset_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `cpu` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `cpu_generation` varchar(255) DEFAULT NULL,
  `memory` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `storage` varchar(255) DEFAULT NULL,
  `os` varchar(255) DEFAULT NULL,
  `os_name` varchar(50) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `os_patch_status` varchar(50) DEFAULT NULL,
  `cpu_manufacturer` varchar(50) DEFAULT NULL,
  `cpu_model` varchar(100) DEFAULT NULL,
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
  `ports_usb_a` tinyint DEFAULT 0,
  `ports_usb_c` tinyint DEFAULT 0,
  `ports_thunderbolt` tinyint DEFAULT 0,
  `ports_ethernet` tinyint DEFAULT 0,
  `ports_hdmi` tinyint DEFAULT 0,
  `ports_displayport` tinyint DEFAULT 0,
  `ports_vga` tinyint DEFAULT 0,
  `ports_sdcard` tinyint DEFAULT 0,
  `ports_audiojack` tinyint DEFAULT 0,
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
  `assess_id` int DEFAULT NULL,
  `upgraded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pc_specs_master` (`asset_id`)
) ENGINE=InnoDB AUTO_INCREMENT=512 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `2_specs`
--

DROP TABLE IF EXISTS `2_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `2_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `entry_code` varchar(5) DEFAULT NULL,
  `asset_code` varchar(50) DEFAULT NULL,
  `register_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `chassis_no` varchar(30) DEFAULT NULL,
  `engine_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `transmission` varchar(20) DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `cubic_meter` varchar(10) DEFAULT NULL,
  `avls_availability` enum('yes','no') DEFAULT 'no',
  `avls_install_date` date DEFAULT NULL,
  `avls_removal_date` date DEFAULT NULL,
  `avls_transfer_date` date DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=518 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_1_specs`
--

DROP TABLE IF EXISTS `_1_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_1_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `asset_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `cpu` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `cpu_generation` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `memory` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `storage` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `os` varchar(200) DEFAULT NULL,
  `upgraded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `form_factor` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pc_specs_master` (`asset_id`)
) ENGINE=InnoDB AUTO_INCREMENT=512 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_asset_data`
--

DROP TABLE IF EXISTS `_asset_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_asset_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(5) DEFAULT NULL,
  `asset_code` varchar(255) DEFAULT NULL,
  `code` decimal(10,2) DEFAULT NULL,
  `classification` varchar(255) DEFAULT NULL,
  `finance_tag` decimal(10,2) DEFAULT NULL,
  `register_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `dop` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `clean_dop` date DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `depreciation_length` int DEFAULT NULL,
  `depreciation_rate` varchar(20) DEFAULT NULL,
  `cost_center` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `item_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  `asses` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `pc_hostname` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5471 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_asset_ownership_raw`
--

DROP TABLE IF EXISTS `_asset_ownership_raw`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_asset_ownership_raw` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id_old` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `entry_code` int DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `asset_code` varchar(50) DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'tbr',
  `department` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'tbr',
  `emp_dept` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'tbr',
  `emp_dept_id` int DEFAULT NULL COMMENT 'tbr',
  `section` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'tbr',
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'tbr',
  `location_id` int DEFAULT NULL,
  `remarks` varchar(200) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ownership_pc` (`asset_id_old`)
) ENGINE=InnoDB AUTO_INCREMENT=1639 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_com_asset_dt`
--

DROP TABLE IF EXISTS `_com_asset_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_com_asset_dt` (
  `cust_id` int NOT NULL AUTO_INCREMENT,
  `pc_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `cust_date` datetime DEFAULT NULL,
  `clean_date` date DEFAULT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `dept_id` int NOT NULL,
  `sec_id` int NOT NULL,
  `ramco_id` varchar(6) NOT NULL,
  `mem` text,
  `hdd` text,
  `screen` text NOT NULL,
  `os_id` int NOT NULL,
  `apps` text NOT NULL,
  `remarks` text,
  `simcard` text NOT NULL,
  `sim_id` int NOT NULL,
  `last_assess` date NOT NULL,
  `pc_sn` varchar(50) NOT NULL COMMENT 'to be removed',
  `register_number` varchar(100) DEFAULT NULL,
  `cust_dept` varchar(50) NOT NULL COMMENT 'to be removed',
  `custcc` varchar(15) DEFAULT NULL COMMENT 'to be removed',
  `custloc` varchar(12) DEFAULT NULL COMMENT 'to be removed',
  `custuser` varchar(50) DEFAULT NULL COMMENT 'to be removed',
  `os` text COMMENT 'to be removed',
  `office_app` text NOT NULL COMMENT 'to be removed',
  `sec_app` text NOT NULL COMMENT 'to be removed',
  `add_app` text COMMENT 'to be removed',
  `custsect` varchar(14) DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`cust_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7860 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_tech`
--

DROP TABLE IF EXISTS `_tech`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_tech` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `model` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `model_id` int DEFAULT NULL,
  `register_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `purchase_date` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `purchase_year` year DEFAULT NULL,
  `PO` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `DO` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `INVOICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `PRICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `AGE2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Unnamed: 17` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `VERIFY` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Suggest to dispose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `REQUEST TO DISPOSE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `DONE DISPOSE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `VERIFICATION DATE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `VERIFICATION STATUS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `NEXT VERIFICATION DATE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `CURRENT LOCATION` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1516 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_history`
--

DROP TABLE IF EXISTS `asset_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5705 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_history_bak18Aug25`
--

DROP TABLE IF EXISTS `asset_history_bak18Aug25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_history_bak18Aug25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4548 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_history_test`
--

DROP TABLE IF EXISTS `asset_history_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_history_test` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4550 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_managers`
--

DROP TABLE IF EXISTS `asset_managers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_managers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(10) DEFAULT NULL,
  `module_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `is_active` enum('1','0') DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata`
--

DROP TABLE IF EXISTS `assetdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7874 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata_bak18Aug25`
--

DROP TABLE IF EXISTS `assetdata_bak18Aug25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata_bak18Aug25` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=512 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata_bak4Sept25`
--

DROP TABLE IF EXISTS `assetdata_bak4Sept25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata_bak4Sept25` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1423 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata_bak4Sept25_2`
--

DROP TABLE IF EXISTS `assetdata_bak4Sept25_2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata_bak4Sept25_2` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1423 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata_bak9Oct25`
--

DROP TABLE IF EXISTS `assetdata_bak9Oct25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata_bak9Oct25` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1719 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assetdata_test`
--

DROP TABLE IF EXISTS `assetdata_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetdata_test` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1423 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `brand_category`
--

DROP TABLE IF EXISTS `brand_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brand_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `brand_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_code` varchar(10) NOT NULL,
  `category_code` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pair` (`brand_code`,`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_id` int DEFAULT NULL,
  `code` varchar(5) DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type_code` varchar(10) DEFAULT NULL,
  `image` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'logo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `code` varchar(20) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `type_code` varchar(5) DEFAULT NULL,
  `image` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costcenters`
--

DROP TABLE IF EXISTS `costcenters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costcenters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ramco_name` varchar(50) DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `owner_type` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `deprtment_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` int DEFAULT '0',
  `createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `old_asset_id` int DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `name` varchar(250) DEFAULT NULL,
  `ramco_name` varchar(100) DEFAULT NULL,
  `dept_desc_malay` varchar(250) DEFAULT NULL,
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `districts`
--

DROP TABLE IF EXISTS `districts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `districts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `old_asset_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee_oct25`
--

DROP TABLE IF EXISTS `employee_oct25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_oct25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `employee_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `grade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `work_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `employee_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'i/c',
  `position` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `costcenter` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `employee_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `org_hire_date` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `supervisor_id` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `supervisor_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=537 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `full_name` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `contact` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `gender` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `avatar` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `employment_type` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `employment_status` enum('active','resigned','retired','terminated') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT 'active',
  `grade` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `departmental_level` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `position` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `department` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `costcenter` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `section` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `district` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `wk_spv` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `supervisor_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `spv_email` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `nric` varchar(14) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `lic_exp` date DEFAULT NULL,
  `lic_class` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `emp_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `wk_pos_malay` text,
  `latest_from_hr` enum('new','missing','existing','') DEFAULT NULL,
  `latest_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=738 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees_bak3nov25`
--

DROP TABLE IF EXISTS `employees_bak3nov25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees_bak3nov25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `full_name` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `contact` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `gender` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `avatar` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `employment_type` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `employment_status` enum('active','resigned','retired','terminated') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT 'active',
  `grade` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `position` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `department` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `costcenter` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `section` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `district` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `wk_spv` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `supervisor_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `spv_email` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `nric` varchar(14) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `lic_exp` date DEFAULT NULL,
  `lic_class` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `emp_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `wk_pos_malay` text,
  `latest_from_hr` enum('new','missing','existing','') DEFAULT NULL,
  `latest_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=721 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees_bak5nov25`
--

DROP TABLE IF EXISTS `employees_bak5nov25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees_bak5nov25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `full_name` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `contact` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `gender` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `avatar` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `employment_type` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `employment_status` enum('active','resigned','retired','terminated') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT 'active',
  `grade` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `position` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `department` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `costcenter` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `section` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `district` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT 'tbr',
  `wk_spv` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `supervisor_id` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `spv_email` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `nric` varchar(14) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `lic_exp` date DEFAULT NULL,
  `lic_class` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `emp_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `wk_pos_malay` text,
  `latest_from_hr` enum('new','missing','existing','') DEFAULT NULL,
  `latest_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=734 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `ramco_name` varchar(100) DEFAULT NULL,
  `code` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_add` text NOT NULL,
  `loc_ctc` text NOT NULL,
  `loc_pic` text NOT NULL,
  `wk_dept` varchar(10) NOT NULL,
  `zone` int NOT NULL,
  `loc_stat` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `models`
--

DROP TABLE IF EXISTS `models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `image` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `specification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `generation` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `ramco_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sections`
--

DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `department_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `spec_properties`
--

DROP TABLE IF EXISTS `spec_properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spec_properties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_id` int DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `column_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `data_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `nullable` tinyint(1) DEFAULT '1',
  `default_value` varchar(255) DEFAULT NULL,
  `visible_on_form` int DEFAULT NULL,
  `options` text,
  `created_by` varchar(64) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_type_column` (`type_id`,`column_name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `test_assetdata`
--

DROP TABLE IF EXISTS `test_assetdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_assetdata` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'asset_id',
  `entry_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_year` year DEFAULT NULL,
  `vehicle_regno` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `transmission` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `fuel_type` varchar(6) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `classification` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `record_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `condition_status` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `action` varchar(20) DEFAULT NULL,
  `disposed_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1666 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transfer_checklists`
--

DROP TABLE IF EXISTS `transfer_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_checklists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_id` int DEFAULT NULL,
  `item` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transfer_items`
--

DROP TABLE IF EXISTS `transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `current_owner` varchar(6) DEFAULT NULL,
  `current_costcenter_id` int DEFAULT NULL,
  `current_department_id` int DEFAULT NULL,
  `current_location_id` int DEFAULT NULL,
  `new_owner` varchar(6) DEFAULT NULL,
  `new_costcenter_id` int DEFAULT NULL,
  `new_department_id` int DEFAULT NULL,
  `new_location_id` int DEFAULT NULL,
  `return_to_asset_manager` tinyint(1) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `acceptance_date` datetime DEFAULT NULL,
  `acceptance_by` varchar(10) DEFAULT NULL,
  `acceptance_checklist_items` varchar(20) DEFAULT NULL,
  `acceptance_remarks` varchar(200) DEFAULT NULL,
  `acceptance_attachments` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `approval_status` varchar(50) DEFAULT 'pending',
  `approved_by` varchar(10) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transfer_request`
--

DROP TABLE IF EXISTS `transfer_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_date` date DEFAULT NULL,
  `transfer_by` varchar(6) DEFAULT NULL COMMENT 'ramco_id',
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `transfer_status` varchar(50) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `approved_by` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `types`
--

DROP TABLE IF EXISTS `types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(3) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `description` text,
  `image` varchar(255) DEFAULT NULL,
  `manager` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_dt`
--

DROP TABLE IF EXISTS `vehicle_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_dt` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(10) DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4548 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_id` int DEFAULT NULL,
  `ordinal` int DEFAULT NULL COMMENT 'workflow_order',
  `ramco_id` int DEFAULT NULL,
  `trigger_event` int NOT NULL,
  `action` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-25 12:00:43
