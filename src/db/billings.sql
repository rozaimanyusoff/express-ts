-- MySQL dump 10.13  Distrib 8.0.34, for macos13 (arm64)
--
-- Host: localhost    Database: billings
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
-- Table structure for table `__tbl_celcom`
--

DROP TABLE IF EXISTS `__tbl_celcom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__tbl_celcom` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `util_id_copy2` int NOT NULL,
  `bill_id` int NOT NULL,
  `bill_ac` varchar(15) NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` text NOT NULL,
  `ubill_paystat` text NOT NULL,
  `ubill_ref` text NOT NULL,
  `ubill_payref` text NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `c_count` int NOT NULL,
  `c_mail` int NOT NULL,
  `c_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=520 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_assetdata`
--

DROP TABLE IF EXISTS `_assetdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_assetdata` (
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
-- Table structure for table `_costloc`
--

DROP TABLE IF EXISTS `_costloc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_costloc` (
  `loc_id` int NOT NULL AUTO_INCREMENT,
  `loc_fname` varchar(255) NOT NULL,
  `loc_sname` varchar(10) NOT NULL,
  PRIMARY KEY (`loc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_dept`
--

DROP TABLE IF EXISTS `_dept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_dept` (
  `dept_id` int NOT NULL AUTO_INCREMENT,
  `s_dept` varchar(5) NOT NULL,
  `l_dept` varchar(25) NOT NULL,
  PRIMARY KEY (`dept_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_data`
--

DROP TABLE IF EXISTS `asset_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(5) DEFAULT NULL,
  `asset_code` varchar(255) DEFAULT NULL,
  `code` decimal(10,2) DEFAULT NULL,
  `classification` varchar(255) DEFAULT NULL,
  `finance_tag` decimal(10,2) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `dop` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `year` varchar(4) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=7873 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `autoparts`
--

DROP TABLE IF EXISTS `autoparts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autoparts` (
  `autopart_id` int NOT NULL AUTO_INCREMENT,
  `autocat_id` int DEFAULT NULL,
  `vtype_id` int DEFAULT NULL,
  `part_name` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_uprice` decimal(10,2) DEFAULT '0.00',
  `part_sst_rate` int DEFAULT '0',
  `part_sst_amount` decimal(10,2) DEFAULT '0.00',
  `part_disc_amount` decimal(10,2) DEFAULT '0.00',
  `part_final_amount` decimal(10,2) DEFAULT '0.00',
  `part_stat` int DEFAULT '0',
  `reg_date` date DEFAULT NULL,
  PRIMARY KEY (`autopart_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8789 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `autopartscat`
--

DROP TABLE IF EXISTS `autopartscat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autopartscat` (
  `autocat_id` int NOT NULL AUTO_INCREMENT,
  `cat_title` text NOT NULL,
  `cat_type` text NOT NULL,
  PRIMARY KEY (`autocat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bfcycat`
--

DROP TABLE IF EXISTS `bfcycat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bfcycat` (
  `cat_id` int NOT NULL AUTO_INCREMENT,
  `cat` text NOT NULL,
  PRIMARY KEY (`cat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `card_vehicle`
--

DROP TABLE IF EXISTS `card_vehicle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `card_vehicle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fc_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `vehicle_no` varchar(20) DEFAULT NULL,
  `formatted` varchar(50) DEFAULT NULL,
  `costcenter` varchar(50) DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=294 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `celcomsub`
--

DROP TABLE IF EXISTS `celcomsub`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `celcomsub` (
  `sim_id` int NOT NULL AUTO_INCREMENT,
  `ac_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `bill_desc` text NOT NULL,
  `sim_subno` varchar(15) NOT NULL COMMENT 'prod s/n for D-tech or sub_no for TM or a/c id for streamyx (sub_no)',
  `sim_ac` varchar(50) NOT NULL COMMENT 'product plan title & description',
  `sub_no_id` int DEFAULT NULL,
  `sim_plan` decimal(10,2) NOT NULL COMMENT 'fixed rental cost (sub_plan)',
  `sim_costctr` varchar(10) NOT NULL COMMENT 'sim user',
  `cc_id` int NOT NULL,
  `sim_user` varchar(50) NOT NULL COMMENT 'custodian',
  `sim_user_id` varchar(6) NOT NULL,
  `sim_loc` varchar(10) NOT NULL COMMENT '(sub_loc)',
  `loc_id` int NOT NULL,
  `sim_sn` varchar(20) NOT NULL,
  `pc_id` int NOT NULL,
  `sim_dev_sn` text NOT NULL,
  `bill_cont_start` date NOT NULL,
  `bill_cont_end` date NOT NULL,
  `sim_stat` varchar(10) NOT NULL COMMENT 'active/inactive',
  `last_change` text NOT NULL,
  `made_change` text NOT NULL,
  `sim_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sim_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6186 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `celcomsub_bak`
--

DROP TABLE IF EXISTS `celcomsub_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `celcomsub_bak` (
  `sim_id` int NOT NULL AUTO_INCREMENT,
  `ac_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `bill_desc` text NOT NULL,
  `sim_subno` varchar(15) NOT NULL COMMENT 'prod s/n for D-tech or sub_no for TM or a/c id for streamyx (sub_no)',
  `sim_ac` varchar(50) NOT NULL COMMENT 'product plan title & description',
  `sim_plan` decimal(10,2) NOT NULL COMMENT 'fixed rental cost (sub_plan)',
  `sim_costctr` varchar(10) NOT NULL COMMENT 'sim user',
  `cc_id` int NOT NULL,
  `sim_user` varchar(50) NOT NULL COMMENT 'custodian',
  `sim_user_id` varchar(6) NOT NULL,
  `sim_loc` varchar(10) NOT NULL COMMENT '(sub_loc)',
  `loc_id` int NOT NULL,
  `sim_sn` varchar(20) NOT NULL,
  `pc_id` int NOT NULL,
  `sim_dev_sn` text NOT NULL,
  `bill_cont_start` date NOT NULL,
  `bill_cont_end` date NOT NULL,
  `sim_stat` varchar(10) NOT NULL COMMENT 'active/inactive',
  `last_change` text NOT NULL,
  `made_change` text NOT NULL,
  `sim_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sim_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6068 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `celcomsub_dt`
--

DROP TABLE IF EXISTS `celcomsub_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `celcomsub_dt` (
  `sub_dt` int NOT NULL AUTO_INCREMENT,
  `sim_id` int NOT NULL,
  `ac_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `sim_subno` varchar(15) NOT NULL COMMENT 'prod s/n for D-tech or sub_no for TM or a/c id for streamyx (sub_no)',
  `sim_ac` text NOT NULL COMMENT 'ac that assigned by celcom to subno ',
  `sim_plan` decimal(10,2) NOT NULL COMMENT 'fixed rental cost (sub_plan)',
  `sim_costctr` varchar(10) NOT NULL COMMENT 'sim user',
  `cc_id` int NOT NULL,
  `sim_user` varchar(50) NOT NULL COMMENT 'custodian',
  `sim_user_id` varchar(6) NOT NULL,
  `sim_loc` varchar(10) NOT NULL COMMENT '(sub_loc)',
  `loc_id` int NOT NULL,
  `sim_sn` varchar(20) NOT NULL,
  `pc_id` int NOT NULL,
  `sim_dev_sn` text NOT NULL,
  `prod_con_st` date NOT NULL,
  `prod_con_en` date NOT NULL,
  `sim_stat` varchar(10) NOT NULL COMMENT 'active/inactive',
  `sim_assign_date` datetime NOT NULL,
  PRIMARY KEY (`sub_dt`)
) ENGINE=InnoDB AUTO_INCREMENT=722 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `ca_id` int NOT NULL AUTO_INCREMENT,
  `ca_regdate` date NOT NULL,
  `ca_type` varchar(50) NOT NULL,
  `ca_desc` varchar(200) NOT NULL,
  `ca_pic` varchar(100) NOT NULL,
  `ca_start` date NOT NULL,
  `ca_end` date NOT NULL,
  `ca_fterm` varchar(100) NOT NULL,
  `ca_fterm_mth` int NOT NULL,
  `ca_fterm_day` int NOT NULL,
  `ca_dept` varchar(10) NOT NULL,
  `ca_costctr` varchar(10) NOT NULL,
  `ca_loc` varchar(10) NOT NULL,
  `ca_deposit` decimal(10,2) NOT NULL,
  `ca_deposit_elec` decimal(10,2) NOT NULL,
  `ca_deposit_wtr` decimal(10,2) NOT NULL,
  `ca_deposit_park` decimal(10,2) NOT NULL,
  `ca_deposit_sd` decimal(10,2) NOT NULL,
  `ca_deposit_oth` decimal(10,2) NOT NULL,
  `ca_deposit_othdesc` varchar(150) NOT NULL,
  `ca_docs` varchar(255) NOT NULL,
  `ca_stat` varchar(10) NOT NULL,
  `ca_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ca_id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contracts_dt`
--

DROP TABLE IF EXISTS `contracts_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts_dt` (
  `cdt_id` int NOT NULL AUTO_INCREMENT,
  `ca_id` int NOT NULL,
  `cdt_renew_type` varchar(10) NOT NULL,
  `cdt_renew` date NOT NULL,
  `cdt_start` date NOT NULL,
  `cdt_end` date NOT NULL,
  `cdt_docs` varchar(255) NOT NULL,
  `ca_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costbfcy`
--

DROP TABLE IF EXISTS `costbfcy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costbfcy` (
  `bfcy_id` int NOT NULL AUTO_INCREMENT,
  `bfcy_name` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bfcy_desc` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cat_id` int DEFAULT NULL,
  `bfcy_fileno` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bfcy_cat` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bfcy_pic` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bfcy_ctc` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bfcy_logo` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `entry_by` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'ramco_id of data entry',
  `entry_position` varchar(100) DEFAULT NULL,
  `acc_no` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  PRIMARY KEY (`bfcy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=155 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costbill`
--

DROP TABLE IF EXISTS `costbill`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costbill` (
  `bill_id` int NOT NULL AUTO_INCREMENT,
  `bill_ac` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `prepared_by` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'ramco_id of data entry',
  `service` varchar(100) DEFAULT NULL,
  `bfcy_id` int DEFAULT NULL,
  `cat_id` int DEFAULT NULL,
  `bill_product` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_desc` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `bill_loc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `bill_depo` decimal(10,2) DEFAULT NULL,
  `bill_mth` decimal(10,2) DEFAULT NULL,
  `bill_stat` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_consumable` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_cont_start` date DEFAULT NULL,
  `bill_cont_end` date DEFAULT NULL,
  `bill_total` decimal(10,2) DEFAULT NULL,
  `bill_count` int DEFAULT NULL,
  `bill_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bill_bfcy` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `bfcy_cat` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `billowner` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`bill_id`)
) ENGINE=InnoDB AUTO_INCREMENT=395 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costbill2`
--

DROP TABLE IF EXISTS `costbill2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costbill2` (
  `bill_id` int NOT NULL AUTO_INCREMENT,
  `bill_ac` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `prepared_by` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'ramco_id of data entry',
  `service` varchar(100) DEFAULT NULL,
  `bfcy_id` int DEFAULT NULL,
  `cat_id` int DEFAULT NULL,
  `bill_product` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_desc` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `bill_loc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `bill_depo` decimal(10,2) DEFAULT NULL,
  `bill_mth` decimal(10,2) DEFAULT NULL,
  `bill_stat` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_consumable` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_cont_start` date DEFAULT NULL,
  `bill_cont_end` date DEFAULT NULL,
  `bill_total` decimal(10,2) DEFAULT NULL,
  `bill_count` int DEFAULT NULL,
  `bill_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bill_bfcy` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `bfcy_cat` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `billowner` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`bill_id`)
) ENGINE=InnoDB AUTO_INCREMENT=395 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costmth`
--

DROP TABLE IF EXISTS `costmth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costmth` (
  `mth_id` int(2) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `s_mth` varchar(5) NOT NULL,
  `f_mth` varchar(15) NOT NULL,
  PRIMARY KEY (`mth_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costprod`
--

DROP TABLE IF EXISTS `costprod`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costprod` (
  `prod_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `prod_item` varchar(100) NOT NULL COMMENT 'prod s/n for D-tech or sub_no for TM or a/c id for streamyx (sub_no)',
  `prod_desc` varchar(200) NOT NULL COMMENT 'product plan title & description',
  `prod_stat` varchar(10) NOT NULL,
  `prod_owner` varchar(10) NOT NULL COMMENT 'cost center owner (sub_owner)',
  `prod_rent` decimal(10,2) NOT NULL COMMENT 'fixed rental cost (sub_plan)',
  `prod_loc` varchar(10) NOT NULL COMMENT '(sub_loc)',
  `prod_desc2` varchar(100) NOT NULL,
  `prod_user` varchar(50) NOT NULL COMMENT 'individual owner',
  `prod_ac` varchar(25) NOT NULL,
  `prod_consumable` text NOT NULL,
  `prod_con_st` date NOT NULL,
  `prod_con_en` date NOT NULL,
  `prod_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `sim_user_id` text NOT NULL,
  PRIMARY KEY (`prod_id`)
) ENGINE=InnoDB AUTO_INCREMENT=829 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costws`
--

DROP TABLE IF EXISTS `costws`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costws` (
  `ws_id` int NOT NULL AUTO_INCREMENT,
  `ws_type` int NOT NULL,
  `ws_name` varchar(50) NOT NULL,
  `ws_add` varchar(1000) NOT NULL,
  `ws_ctc` varchar(10) NOT NULL,
  `ws_pic` varchar(50) NOT NULL,
  `ws_branch` varchar(50) NOT NULL,
  `ws_rem` varchar(200) NOT NULL,
  `ws_panel` varchar(10) NOT NULL,
  `ws_stat` varchar(20) NOT NULL,
  `agreement_date_from` date NOT NULL,
  `agreement_date_to` date NOT NULL,
  `sub_no` varchar(250) NOT NULL,
  PRIMARY KEY (`ws_id`)
) ENGINE=MyISAM AUTO_INCREMENT=185 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet2`
--

DROP TABLE IF EXISTS `fleet2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fuel_id` int DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `bill_order_no` int DEFAULT NULL,
  `card_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `pin` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `remarks` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `purpose` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `check` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'tbr',
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `reg_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=408 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet2_bak_30Jul25`
--

DROP TABLE IF EXISTS `fleet2_bak_30Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet2_bak_30Jul25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fuel_id` int DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `bill_order_no` int DEFAULT NULL,
  `card_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `pin` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `remarks` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `check` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'tbr',
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `reg_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet2_bak_31Jul25`
--

DROP TABLE IF EXISTS `fleet2_bak_31Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet2_bak_31Jul25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fuel_id` int DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `bill_order_no` int DEFAULT NULL,
  `card_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `pin` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `register_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `remarks` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `check` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'tbr',
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `reg_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=345 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet3`
--

DROP TABLE IF EXISTS `fleet3`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet3` (
  `id` int NOT NULL AUTO_INCREMENT,
  `register_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_from_imported` smallint DEFAULT NULL,
  `imported_card_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_from_old_fleet` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `matched_fc_no_from_fleet` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_id_fleet2` int DEFAULT NULL,
  `fleet2_card` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_fl_fl2_register_number` (`register_number`),
  KEY `idx_import_fl_fl2_vehicle_from_imported` (`vehicle_from_imported`),
  KEY `idx_import_fl_fl2_imported_card_no` (`imported_card_no`),
  KEY `idx_import_fl_fl2_vehicle_from_old_fleet` (`vehicle_from_old_fleet`),
  KEY `idx_import_fl_fl2_matched_fc_no_from_fleet` (`matched_fc_no_from_fleet`)
) ENGINE=InnoDB AUTO_INCREMENT=332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet_asset`
--

DROP TABLE IF EXISTS `fleet_asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet_asset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fleetcard_asset` (`card_id`,`asset_id`)
) ENGINE=InnoDB AUTO_INCREMENT=599 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet_history`
--

DROP TABLE IF EXISTS `fleet_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_id` int DEFAULT NULL,
  `old_asset_id` int DEFAULT NULL,
  `new_asset_id` int DEFAULT NULL,
  `old_costcenter_id` int DEFAULT NULL,
  `new_costcenter_id` int DEFAULT NULL,
  `changed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet_temp`
--

DROP TABLE IF EXISTS `fleet_temp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet_temp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `statement_id` text,
  `fc_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `fleet_card_issuer` text,
  `register_number` text,
  `costcenter` text,
  `cc_id` int DEFAULT NULL,
  `district` text,
  `amount` text,
  `check` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=324 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2013`
--

DROP TABLE IF EXISTS `fuel2013`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2013` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `shellcardno` varchar(225) NOT NULL,
  `expenses` decimal(8,2) NOT NULL,
  `regno` varchar(225) NOT NULL,
  `model` varchar(225) NOT NULL,
  `department` varchar(225) NOT NULL,
  `location` varchar(225) NOT NULL,
  `groupx` varchar(225) NOT NULL,
  `shellcardlimit` varchar(225) NOT NULL,
  `m1` decimal(8,2) NOT NULL,
  `m2` decimal(8,2) NOT NULL,
  `m3` decimal(8,2) NOT NULL,
  `m4` decimal(8,2) NOT NULL,
  `m5` decimal(8,2) NOT NULL,
  `m6` decimal(8,2) NOT NULL,
  `m7` decimal(8,2) NOT NULL,
  `m8` decimal(8,2) NOT NULL,
  `m9` decimal(8,2) NOT NULL,
  `m10` decimal(8,2) NOT NULL,
  `m11` decimal(8,2) NOT NULL,
  `m12` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`),
  UNIQUE KEY `regno` (`regno`),
  FULLTEXT KEY `group` (`groupx`)
) ENGINE=MyISAM AUTO_INCREMENT=243 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2014`
--

DROP TABLE IF EXISTS `fuel2014`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2014` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `shellcardno` varchar(225) NOT NULL,
  `expenses` decimal(8,2) NOT NULL,
  `regno` varchar(225) NOT NULL,
  `model` varchar(225) NOT NULL,
  `department` varchar(225) NOT NULL,
  `location` varchar(225) NOT NULL,
  `groupx` varchar(225) NOT NULL,
  `shellcardlimit` varchar(225) NOT NULL,
  `m1` decimal(8,2) NOT NULL,
  `m2` decimal(8,2) NOT NULL,
  `m3` decimal(8,2) NOT NULL,
  `m4` decimal(8,2) NOT NULL,
  `m5` decimal(8,2) NOT NULL,
  `m6` decimal(8,2) NOT NULL,
  `m7` decimal(8,2) NOT NULL,
  `m8` decimal(8,2) NOT NULL,
  `m9` decimal(8,2) NOT NULL,
  `m10` decimal(8,2) NOT NULL,
  `m11` decimal(8,2) NOT NULL,
  `m12` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`),
  UNIQUE KEY `regno` (`regno`),
  UNIQUE KEY `regno_2` (`regno`),
  FULLTEXT KEY `group` (`groupx`)
) ENGINE=MyISAM AUTO_INCREMENT=240 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2015`
--

DROP TABLE IF EXISTS `fuel2015`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2015` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `cardno` varchar(225) NOT NULL,
  `expenses` decimal(8,2) NOT NULL,
  `regno` varchar(225) NOT NULL,
  `model` varchar(225) NOT NULL,
  `department` varchar(225) NOT NULL,
  `location` varchar(225) NOT NULL,
  `groupx` varchar(225) NOT NULL,
  `cardlimit` varchar(225) NOT NULL,
  `cardtype` varchar(20) NOT NULL,
  `m1` decimal(8,2) NOT NULL,
  `m2` decimal(8,2) NOT NULL,
  `m3` decimal(8,2) NOT NULL,
  `m4` decimal(8,2) NOT NULL,
  `m5` decimal(8,2) NOT NULL,
  `m6` decimal(8,2) NOT NULL,
  `m7` decimal(8,2) NOT NULL,
  `m8` decimal(8,2) NOT NULL,
  `m9` decimal(8,2) NOT NULL,
  `m10` decimal(8,2) NOT NULL,
  `m11` decimal(8,2) NOT NULL,
  `m12` decimal(8,2) NOT NULL,
  `expences_p` decimal(8,2) NOT NULL,
  `m1_p` decimal(8,2) NOT NULL,
  `m2_p` decimal(8,2) NOT NULL,
  `m3_p` decimal(8,2) NOT NULL,
  `m4_p` decimal(8,2) NOT NULL,
  `m5_p` decimal(8,2) NOT NULL,
  `m6_p` decimal(8,2) NOT NULL,
  `m7_p` decimal(8,2) NOT NULL,
  `m8_p` decimal(8,2) NOT NULL,
  `m9_p` decimal(8,2) NOT NULL,
  `m10_p` decimal(8,2) NOT NULL,
  `m11_p` decimal(8,2) NOT NULL,
  `m12_p` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`),
  UNIQUE KEY `regno` (`regno`),
  FULLTEXT KEY `group` (`groupx`)
) ENGINE=MyISAM AUTO_INCREMENT=241 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2016`
--

DROP TABLE IF EXISTS `fuel2016`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2016` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `cardno` varchar(225) NOT NULL,
  `expenses` decimal(8,2) NOT NULL,
  `regno` varchar(225) NOT NULL,
  `model` varchar(225) NOT NULL,
  `department` varchar(225) NOT NULL,
  `location` varchar(225) NOT NULL,
  `groupx` varchar(225) NOT NULL,
  `cardlimit` varchar(225) NOT NULL,
  `cardtype` varchar(20) NOT NULL,
  `m1` decimal(8,2) NOT NULL,
  `m2` decimal(8,2) NOT NULL,
  `m3` decimal(8,2) NOT NULL,
  `m4` decimal(8,2) NOT NULL,
  `m5` decimal(8,2) NOT NULL,
  `m6` decimal(8,2) NOT NULL,
  `m7` decimal(8,2) NOT NULL,
  `m8` decimal(8,2) NOT NULL,
  `m9` decimal(8,2) NOT NULL,
  `m10` decimal(8,2) NOT NULL,
  `m11` decimal(8,2) NOT NULL,
  `m12` decimal(8,2) NOT NULL,
  `expences_p` decimal(8,2) NOT NULL,
  `m1_p` decimal(8,2) NOT NULL,
  `m2_p` decimal(8,2) NOT NULL,
  `m3_p` decimal(8,2) NOT NULL,
  `m4_p` decimal(8,2) NOT NULL,
  `m5_p` decimal(8,2) NOT NULL,
  `m6_p` decimal(8,2) NOT NULL,
  `m7_p` decimal(8,2) NOT NULL,
  `m8_p` decimal(8,2) NOT NULL,
  `m9_p` decimal(8,2) NOT NULL,
  `m10_p` decimal(8,2) NOT NULL,
  `m11_p` decimal(8,2) NOT NULL,
  `m12_p` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`),
  UNIQUE KEY `regno` (`regno`),
  FULLTEXT KEY `group` (`groupx`)
) ENGINE=MyISAM AUTO_INCREMENT=264 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2017`
--

DROP TABLE IF EXISTS `fuel2017`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2017` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `cardno` varchar(225) NOT NULL,
  `expenses` decimal(8,2) NOT NULL,
  `regno` varchar(225) NOT NULL,
  `model` varchar(225) NOT NULL,
  `department` varchar(225) NOT NULL,
  `location` varchar(225) NOT NULL,
  `groupx` varchar(225) NOT NULL,
  `cardlimit` varchar(225) NOT NULL,
  `cardtype` varchar(20) NOT NULL,
  `m1` decimal(8,2) NOT NULL,
  `m2` decimal(8,2) NOT NULL,
  `m3` decimal(8,2) NOT NULL,
  `m4` decimal(8,2) NOT NULL,
  `m5` decimal(8,2) NOT NULL,
  `m6` decimal(8,2) NOT NULL,
  `m7` decimal(8,2) NOT NULL,
  `m8` decimal(8,2) NOT NULL,
  `m9` decimal(8,2) NOT NULL,
  `m10` decimal(8,2) NOT NULL,
  `m11` decimal(8,2) NOT NULL,
  `m12` decimal(8,2) NOT NULL,
  `expences_p` decimal(8,2) NOT NULL,
  `m1_p` decimal(8,2) NOT NULL,
  `m2_p` decimal(8,2) NOT NULL,
  `m3_p` decimal(8,2) NOT NULL,
  `m4_p` decimal(8,2) NOT NULL,
  `m5_p` decimal(8,2) NOT NULL,
  `m6_p` decimal(8,2) NOT NULL,
  `m7_p` decimal(8,2) NOT NULL,
  `m8_p` decimal(8,2) NOT NULL,
  `m9_p` decimal(8,2) NOT NULL,
  `m10_p` decimal(8,2) NOT NULL,
  `m11_p` decimal(8,2) NOT NULL,
  `m12_p` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`),
  UNIQUE KEY `regno` (`regno`),
  FULLTEXT KEY `group` (`groupx`)
) ENGINE=MyISAM AUTO_INCREMENT=299 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2018`
--

DROP TABLE IF EXISTS `fuel2018`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2018` (
  `generatedno` int DEFAULT NULL,
  `cardno` bigint DEFAULT NULL,
  `expenses` decimal(6,2) DEFAULT NULL,
  `regno` varchar(10) DEFAULT NULL,
  `model` varchar(25) DEFAULT NULL,
  `department` varchar(27) DEFAULT NULL,
  `location` varchar(11) DEFAULT NULL,
  `groupx` varchar(25) DEFAULT NULL,
  `cardlimit` varchar(8) DEFAULT NULL,
  `cardtype` varchar(15) DEFAULT NULL,
  `m1` decimal(5,2) DEFAULT NULL,
  `m2` decimal(5,2) DEFAULT NULL,
  `m3` decimal(5,2) DEFAULT NULL,
  `m4` decimal(5,2) DEFAULT NULL,
  `m5` decimal(5,2) DEFAULT NULL,
  `m6` decimal(5,2) DEFAULT NULL,
  `m7` decimal(5,2) DEFAULT NULL,
  `m8` decimal(6,2) DEFAULT NULL,
  `m9` decimal(5,2) DEFAULT NULL,
  `m10` decimal(5,2) DEFAULT NULL,
  `m11` decimal(5,2) DEFAULT NULL,
  `m12` decimal(5,2) DEFAULT NULL,
  `expences_p` decimal(6,2) DEFAULT NULL,
  `m1_p` decimal(5,2) DEFAULT NULL,
  `m2_p` decimal(6,2) DEFAULT NULL,
  `m3_p` decimal(6,2) DEFAULT NULL,
  `m4_p` decimal(5,2) DEFAULT NULL,
  `m5_p` decimal(5,2) DEFAULT NULL,
  `m6_p` decimal(5,2) DEFAULT NULL,
  `m7_p` decimal(6,2) DEFAULT NULL,
  `m8_p` decimal(6,2) DEFAULT NULL,
  `m9_p` decimal(5,2) DEFAULT NULL,
  `m10_p` varchar(8) DEFAULT NULL,
  `m11_p` decimal(6,2) DEFAULT NULL,
  `m12_p` decimal(6,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel2019`
--

DROP TABLE IF EXISTS `fuel2019`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel2019` (
  `generatedno` varchar(3) DEFAULT NULL,
  `cardno` varchar(19) DEFAULT NULL,
  `expenses` varchar(6) DEFAULT NULL,
  `regno` varchar(10) DEFAULT NULL,
  `model` varchar(25) DEFAULT NULL,
  `department` varchar(27) DEFAULT NULL,
  `location` varchar(11) DEFAULT NULL,
  `groupx` varchar(25) DEFAULT NULL,
  `cardlimit` varchar(8) DEFAULT NULL,
  `cardtype` varchar(15) DEFAULT NULL,
  `m1` varchar(5) DEFAULT NULL,
  `m2` varchar(5) DEFAULT NULL,
  `m3` varchar(5) DEFAULT NULL,
  `m4` varchar(5) DEFAULT NULL,
  `m5` varchar(5) DEFAULT NULL,
  `m6` varchar(5) DEFAULT NULL,
  `m7` varchar(10) DEFAULT NULL,
  `m8` varchar(3) DEFAULT NULL,
  `m9` varchar(3) DEFAULT NULL,
  `m10` varchar(10) DEFAULT NULL,
  `m11` varchar(10) DEFAULT NULL,
  `m12` varchar(10) DEFAULT NULL,
  `expences_p` varchar(7) DEFAULT NULL,
  `m1_p` varchar(5) DEFAULT NULL,
  `m2_p` varchar(5) DEFAULT NULL,
  `m3_p` varchar(8) DEFAULT NULL,
  `m4_p` varchar(8) DEFAULT NULL,
  `m5_p` varchar(5) DEFAULT NULL,
  `m6_p` varchar(5) DEFAULT NULL,
  `m7_p` varchar(1) DEFAULT NULL,
  `m8_p` varchar(1) DEFAULT NULL,
  `m9_p` varchar(1) DEFAULT NULL,
  `m10_p` varchar(1) DEFAULT NULL,
  `m11_p` varchar(1) DEFAULT NULL,
  `m12_p` varchar(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_product`
--

DROP TABLE IF EXISTS `fuel_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_product` (
  `ft_id` int NOT NULL AUTO_INCREMENT,
  `vfuel_type` text NOT NULL,
  `vehicle_type` text NOT NULL,
  PRIMARY KEY (`ft_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt`
--

DROP TABLE IF EXISTS `fuel_stmt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt` (
  `stmt_id` int NOT NULL AUTO_INCREMENT,
  `fuel_id` int NOT NULL DEFAULT '0' COMMENT 'stmt_issuer',
  `stmt_no` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `stmt_date` date DEFAULT NULL,
  `stmt_issuer` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `petrol` decimal(10,2) DEFAULT NULL,
  `diesel` decimal(10,2) DEFAULT NULL,
  `stmt_ron95` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_ron97` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_diesel` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bill_payment` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `stmt_count` int NOT NULL DEFAULT '0',
  `stmt_litre` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_total_odo` int NOT NULL DEFAULT '0',
  `stmt_stotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_tax` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_rounding` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_disc` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_entry` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stmt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=391 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail`
--

DROP TABLE IF EXISTS `fuel_stmt_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `card_id` int DEFAULT NULL COMMENT 'card_id',
  `cc_id` int DEFAULT NULL COMMENT 'costcenter_id',
  `purpose` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) DEFAULT NULL,
  `start_odo` int DEFAULT NULL,
  `end_odo` int DEFAULT NULL,
  `total_km` int DEFAULT NULL,
  `effct` decimal(10,1) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=81206 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail_backup`
--

DROP TABLE IF EXISTS `fuel_stmt_detail_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail_backup` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int NOT NULL DEFAULT '0',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) NOT NULL DEFAULT '0.00',
  `start_odo` int NOT NULL DEFAULT '0',
  `end_odo` int NOT NULL DEFAULT '0',
  `total_km` int NOT NULL DEFAULT '0',
  `effct` decimal(10,1) NOT NULL DEFAULT '0.0',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=63221 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail_bak2_6oct25`
--

DROP TABLE IF EXISTS `fuel_stmt_detail_bak2_6oct25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail_bak2_6oct25` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `card_id` int DEFAULT NULL COMMENT 'card_id',
  `cc_id` int DEFAULT NULL COMMENT 'costcenter_id',
  `purpose` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) DEFAULT NULL,
  `start_odo` int DEFAULT NULL,
  `end_odo` int DEFAULT NULL,
  `total_km` int DEFAULT NULL,
  `effct` decimal(10,1) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=78305 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail_bak_6oct25`
--

DROP TABLE IF EXISTS `fuel_stmt_detail_bak_6oct25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail_bak_6oct25` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `card_id` int DEFAULT NULL COMMENT 'card_id',
  `cc_id` int DEFAULT NULL COMMENT 'costcenter_id',
  `purpose` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) DEFAULT NULL,
  `start_odo` int DEFAULT NULL,
  `end_odo` int DEFAULT NULL,
  `total_km` int DEFAULT NULL,
  `effct` decimal(10,1) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=78305 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail_bak_7jul25`
--

DROP TABLE IF EXISTS `fuel_stmt_detail_bak_7jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail_bak_7jul25` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int NOT NULL DEFAULT '0',
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int NOT NULL DEFAULT '0',
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) NOT NULL DEFAULT '0.00',
  `start_odo` int NOT NULL DEFAULT '0',
  `end_odo` int NOT NULL DEFAULT '0',
  `total_km` int NOT NULL DEFAULT '0',
  `effct` decimal(10,1) NOT NULL DEFAULT '0.0',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=66474 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_stmt_detail_bak_8Jul25`
--

DROP TABLE IF EXISTS `fuel_stmt_detail_bak_8Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt_detail_bak_8Jul25` (
  `s_id` int NOT NULL AUTO_INCREMENT,
  `stmt_id` int NOT NULL DEFAULT '0',
  `asset_id` int DEFAULT NULL,
  `vehicle_id` int NOT NULL DEFAULT '0',
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `stmt_date` date DEFAULT NULL,
  `reg_no` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `location` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `claim_issuer` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `fuel_type` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `total_litre` decimal(10,2) NOT NULL DEFAULT '0.00',
  `start_odo` int NOT NULL DEFAULT '0',
  `end_odo` int NOT NULL DEFAULT '0',
  `total_km` int NOT NULL DEFAULT '0',
  `effct` decimal(10,1) NOT NULL DEFAULT '0.0',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`s_id`)
) ENGINE=InnoDB AUTO_INCREMENT=66474 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuel_vendor`
--

DROP TABLE IF EXISTS `fuel_vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_vendor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `logo` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `image2` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `new_telco_accounts`
--

DROP TABLE IF EXISTS `new_telco_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_telco_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_master` varchar(20) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `plan` decimal(5,2) DEFAULT NULL,
  `old_bill_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_master` (`account_master`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `old_telco_accounts`
--

DROP TABLE IF EXISTS `old_telco_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `old_telco_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account` varchar(100) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `old_bill_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rec_maintenance`
--

DROP TABLE IF EXISTS `rec_maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rec_maintenance` (
  `generatedno` int(4) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `last_modified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reg_no` varchar(225) NOT NULL,
  `tarikh` varchar(225) NOT NULL,
  `month` varchar(225) NOT NULL,
  `year` varchar(225) NOT NULL,
  `workshop` varchar(225) NOT NULL,
  `mileage` varchar(225) NOT NULL,
  `invoice` text NOT NULL,
  `detail1` varchar(225) NOT NULL,
  `amount1` decimal(8,2) NOT NULL,
  `detail2` varchar(225) NOT NULL,
  `amount2` decimal(8,2) NOT NULL,
  `detail3` varchar(225) NOT NULL,
  `amount3` decimal(8,2) NOT NULL,
  `detail4` varchar(225) NOT NULL,
  `amount4` decimal(8,2) NOT NULL,
  `detail5` varchar(225) NOT NULL,
  `amount5` decimal(8,2) NOT NULL,
  `detail6` varchar(225) NOT NULL,
  `amount6` decimal(8,2) NOT NULL,
  `detail7` varchar(225) NOT NULL,
  `amount7` decimal(8,2) NOT NULL,
  `detail8` varchar(225) NOT NULL,
  `amount8` decimal(8,2) NOT NULL,
  `detail9` varchar(225) NOT NULL,
  `amount9` decimal(8,2) NOT NULL,
  `detail10` varchar(225) NOT NULL,
  `amount10` decimal(8,2) NOT NULL,
  `detail11` varchar(225) NOT NULL,
  `amount11` decimal(8,2) NOT NULL,
  `detail12` varchar(225) NOT NULL,
  `amount12` decimal(8,2) NOT NULL,
  `detail13` varchar(225) NOT NULL,
  `amount13` decimal(8,2) NOT NULL,
  `detail14` varchar(225) NOT NULL,
  `amount14` decimal(8,2) NOT NULL,
  `detail15` varchar(225) NOT NULL,
  `amount15` decimal(8,2) NOT NULL,
  `detail16` varchar(225) NOT NULL,
  `amount16` decimal(8,2) NOT NULL,
  `detail17` varchar(225) NOT NULL,
  `amount17` decimal(8,2) NOT NULL,
  `detail18` varchar(225) NOT NULL,
  `amount18` decimal(8,2) NOT NULL,
  `detail19` varchar(225) NOT NULL,
  `amount19` decimal(8,2) NOT NULL,
  `detail20` varchar(255) NOT NULL,
  `amount20` decimal(8,2) NOT NULL,
  `detail21` varchar(225) NOT NULL,
  `amount21` decimal(8,2) NOT NULL,
  `detail22` varchar(225) NOT NULL,
  `amount22` decimal(8,2) NOT NULL,
  `detail23` varchar(225) NOT NULL,
  `amount23` decimal(8,2) NOT NULL,
  `detail24` varchar(225) NOT NULL,
  `amount24` decimal(8,2) NOT NULL,
  `detail25` varchar(225) NOT NULL,
  `amount25` decimal(8,2) NOT NULL,
  `detail26` varchar(225) NOT NULL,
  `amount26` decimal(8,2) NOT NULL,
  `detail27` varchar(225) NOT NULL,
  `amount27` decimal(8,2) NOT NULL,
  `detail28` varchar(225) NOT NULL,
  `amount28` decimal(8,2) NOT NULL,
  `detail29` varchar(225) NOT NULL,
  `amount29` decimal(8,2) NOT NULL,
  `detail30` varchar(225) NOT NULL,
  `amount30` decimal(8,2) NOT NULL,
  `detail31` varchar(225) NOT NULL,
  `amount31` decimal(8,2) NOT NULL,
  `detail32` varchar(225) NOT NULL,
  `amount32` decimal(8,2) NOT NULL,
  `detail33` varchar(225) NOT NULL,
  `amount33` decimal(8,2) NOT NULL,
  `detail34` varchar(225) NOT NULL,
  `amount34` decimal(8,2) NOT NULL,
  `detail35` varchar(225) NOT NULL,
  `amount35` decimal(8,2) NOT NULL,
  `detail36` varchar(225) NOT NULL,
  `amount36` decimal(8,2) NOT NULL,
  `detail37` varchar(225) NOT NULL,
  `amount37` decimal(8,2) NOT NULL,
  `detail38` varchar(225) NOT NULL,
  `amount38` decimal(8,2) NOT NULL,
  `detail39` varchar(225) NOT NULL,
  `amount39` decimal(8,2) NOT NULL,
  `detail40` varchar(225) NOT NULL,
  `amount40` decimal(8,2) NOT NULL,
  `total` decimal(8,2) NOT NULL,
  `q1` double NOT NULL,
  `q2` double NOT NULL,
  `q3` double NOT NULL,
  `q4` double NOT NULL,
  `q5` double NOT NULL,
  `q6` double NOT NULL,
  `q7` double NOT NULL,
  `q8` double NOT NULL,
  `q9` double NOT NULL,
  `q10` double NOT NULL,
  `q11` double NOT NULL,
  `q12` double NOT NULL,
  `q13` double NOT NULL,
  `q14` double NOT NULL,
  `q15` double NOT NULL,
  `q16` double NOT NULL,
  `q17` double NOT NULL,
  `q18` double NOT NULL,
  `q19` double NOT NULL,
  `q20` double NOT NULL,
  `q21` double NOT NULL,
  `q22` double NOT NULL,
  `q23` double NOT NULL,
  `q24` double NOT NULL,
  `q25` double NOT NULL,
  `q26` double NOT NULL,
  `q27` double NOT NULL,
  `q28` double NOT NULL,
  `q29` double NOT NULL,
  `q30` double NOT NULL,
  `q31` double NOT NULL,
  `q32` double NOT NULL,
  `q33` double NOT NULL,
  `q34` double NOT NULL,
  `q35` double NOT NULL,
  `q36` double NOT NULL,
  `q37` double NOT NULL,
  `q38` double NOT NULL,
  `q39` double NOT NULL,
  `q40` double NOT NULL,
  `amountx1` decimal(8,2) NOT NULL,
  `amountx2` decimal(8,2) NOT NULL,
  `amountx3` decimal(8,2) NOT NULL,
  `amountx4` decimal(8,2) NOT NULL,
  `amountx5` decimal(8,2) NOT NULL,
  `amountx6` decimal(8,2) NOT NULL,
  `amountx7` decimal(8,2) NOT NULL,
  `amountx8` decimal(8,2) NOT NULL,
  `amountx9` decimal(8,2) NOT NULL,
  `amountx10` decimal(8,2) NOT NULL,
  `amountx11` decimal(8,2) NOT NULL,
  `amountx12` decimal(8,2) NOT NULL,
  `amountx13` decimal(8,2) NOT NULL,
  `amountx14` decimal(8,2) NOT NULL,
  `amountx15` decimal(8,2) NOT NULL,
  `amountx16` decimal(8,2) NOT NULL,
  `amountx17` decimal(8,2) NOT NULL,
  `amountx18` decimal(8,2) NOT NULL,
  `amountx19` decimal(8,2) NOT NULL,
  `amountx20` decimal(8,2) NOT NULL,
  `amountx21` decimal(8,2) NOT NULL,
  `amountx22` decimal(8,2) NOT NULL,
  `amountx23` decimal(8,2) NOT NULL,
  `amountx24` decimal(8,2) NOT NULL,
  `amountx25` decimal(8,2) NOT NULL,
  `amountx26` decimal(8,2) NOT NULL,
  `amountx27` decimal(8,2) NOT NULL,
  `amountx28` decimal(8,2) NOT NULL,
  `amountx29` decimal(8,2) NOT NULL,
  `amountx30` decimal(8,2) NOT NULL,
  `amountx31` decimal(8,2) NOT NULL,
  `amountx32` decimal(8,2) NOT NULL,
  `amountx33` decimal(8,2) NOT NULL,
  `amountx34` decimal(8,2) NOT NULL,
  `amountx35` decimal(8,2) NOT NULL,
  `amountx36` decimal(8,2) NOT NULL,
  `amountx37` decimal(8,2) NOT NULL,
  `amountx38` decimal(8,2) NOT NULL,
  `amountx39` decimal(8,2) NOT NULL,
  `amountx40` decimal(8,2) NOT NULL,
  PRIMARY KEY (`generatedno`)
) ENGINE=MyISAM AUTO_INCREMENT=8113 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscribers`
--

DROP TABLE IF EXISTS `subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscribers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `account_sub` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` enum('active','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `register_date` date DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=269 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_celcom_det`
--

DROP TABLE IF EXISTS `tbl_celcom_det`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_celcom_det` (
  `util2_id` int NOT NULL AUTO_INCREMENT,
  `util_id_copy2` int DEFAULT NULL,
  `util_id` int DEFAULT NULL COMMENT 'adms4:',
  `bill_id` int DEFAULT NULL COMMENT 'tbr',
  `account_id` int DEFAULT NULL COMMENT 'adms4',
  `ramco_id` varchar(10) DEFAULT NULL COMMENT 'adms4',
  `sub_id` int DEFAULT NULL COMMENT 'adms4: subs_id',
  `sim_id` int DEFAULT NULL COMMENT 'adms4: old_sim_id',
  `new_sim_id` int DEFAULT NULL COMMENT 'adms4',
  `loc_id` int DEFAULT NULL,
  `cc_id` int DEFAULT NULL COMMENT 'adms4: costcenter_id',
  `sim_user_id` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `cc_no` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_user` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `util2_plan` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `util2_usage` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `util2_disc` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `util2_amt` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `cc_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util2_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23685 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_corr`
--

DROP TABLE IF EXISTS `tbl_corr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_corr` (
  `corr_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `corr_refno` int NOT NULL,
  `corr_date` date NOT NULL,
  `corr_title` varchar(255) NOT NULL,
  `corr_desc` text NOT NULL,
  `corr_upl` varchar(255) NOT NULL,
  `corr_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`corr_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_cw`
--

DROP TABLE IF EXISTS `tbl_cw`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_cw` (
  `cw_id` int NOT NULL AUTO_INCREMENT,
  `cw_inv` varchar(25) NOT NULL,
  `cw_invdate` date NOT NULL,
  `cw_workshop` varchar(50) NOT NULL,
  `ws_id` int NOT NULL,
  `cw_stotal` decimal(10,2) NOT NULL,
  `cw_disc` decimal(10,2) NOT NULL,
  `cw_taxrate` int NOT NULL,
  `cw_taxamt` decimal(10,2) NOT NULL,
  `cw_round` decimal(10,2) NOT NULL,
  `cw_total` decimal(10,2) NOT NULL,
  `cw_payment` varchar(50) NOT NULL,
  `cw_count` int NOT NULL,
  `cw_entry` varchar(6) NOT NULL,
  `cw_entrydate` date NOT NULL,
  `cw_upddate` date NOT NULL,
  `cw_billready` int NOT NULL,
  `cw_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cw_id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_cw_dt`
--

DROP TABLE IF EXISTS `tbl_cw_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_cw_dt` (
  `w_id` int NOT NULL AUTO_INCREMENT,
  `cw_id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `cw_so` varchar(15) NOT NULL,
  `cw_date` date NOT NULL,
  `cw_amt` decimal(10,2) NOT NULL,
  `cw_order_no` varchar(15) NOT NULL COMMENT 'to be removed',
  `cw_regno` varchar(10) NOT NULL COMMENT 'to be removed',
  `inv_costctr` varchar(12) NOT NULL COMMENT 'to be removed',
  PRIMARY KEY (`w_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1256 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv`
--

DROP TABLE IF EXISTS `tbl_inv`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv` (
  `inv_id` int NOT NULL AUTO_INCREMENT,
  `inv_no` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_date` date DEFAULT NULL,
  `svc_order` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `reg_no` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `inv_costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `cc_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `workshop` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_id` int DEFAULT '0',
  `svc_date` date DEFAULT NULL,
  `svc_odo` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `payment` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `upload` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ptotal_amt` decimal(10,2) DEFAULT NULL,
  `ptotal_tax` decimal(10,2) DEFAULT '0.00',
  `ptotal_disc` decimal(10,2) DEFAULT '0.00',
  `p_stotal` decimal(10,2) DEFAULT '0.00',
  `inv_taxrate` int DEFAULT '0',
  `inv_taxamt` decimal(10,2) DEFAULT '0.00',
  `inv_total_tax` decimal(10,2) DEFAULT '0.00',
  `inv_disc` decimal(10,2) DEFAULT '0.00',
  `rounding` decimal(10,2) DEFAULT '0.00',
  `inv_total` decimal(10,2) DEFAULT '0.00',
  `entry` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `entry_date` datetime DEFAULT NULL,
  `entry_upd` datetime DEFAULT NULL,
  `entry_by` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_stat` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_remarks` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_rdate` date DEFAULT NULL,
  `inv_datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `running_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`inv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14252 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv2`
--

DROP TABLE IF EXISTS `tbl_inv2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv2` (
  `inv_id` int NOT NULL AUTO_INCREMENT,
  `inv_no` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_date` date DEFAULT NULL,
  `svc_order` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `reg_no` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `entry_code` varchar(20) DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `inv_costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `cc_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `workshop` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_id` int DEFAULT '0',
  `svc_date` date DEFAULT NULL,
  `svc_odo` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `payment` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `upload` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ptotal_amt` decimal(10,2) DEFAULT NULL,
  `ptotal_tax` decimal(10,2) DEFAULT '0.00',
  `ptotal_disc` decimal(10,2) DEFAULT '0.00',
  `p_stotal` decimal(10,2) DEFAULT '0.00',
  `inv_taxrate` int DEFAULT '0',
  `inv_taxamt` decimal(10,2) DEFAULT '0.00',
  `inv_total_tax` decimal(10,2) DEFAULT '0.00',
  `inv_disc` decimal(10,2) DEFAULT '0.00',
  `rounding` decimal(10,2) DEFAULT '0.00',
  `inv_total` decimal(10,2) DEFAULT '0.00',
  `entry` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `entry_date` datetime DEFAULT NULL,
  `entry_upd` datetime DEFAULT NULL,
  `entry_by` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_stat` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `inv_remarks` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_rdate` date DEFAULT NULL,
  `inv_datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `running_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`inv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13852 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv_bak`
--

DROP TABLE IF EXISTS `tbl_inv_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv_bak` (
  `inv_id` int NOT NULL AUTO_INCREMENT,
  `inv_no` varchar(255) NOT NULL,
  `inv_date` date NOT NULL,
  `svc_order` varchar(25) NOT NULL,
  `reg_no` varchar(10) NOT NULL,
  `vehicle_id` int NOT NULL,
  `inv_costctr` varchar(12) NOT NULL,
  `workshop` varchar(50) NOT NULL,
  `ws_id` int NOT NULL,
  `svc_date` date NOT NULL,
  `svc_odo` int NOT NULL,
  `payment` varchar(30) NOT NULL,
  `upload` varchar(100) NOT NULL,
  `ptotal_amt` decimal(10,2) NOT NULL,
  `ptotal_tax` decimal(10,2) NOT NULL,
  `ptotal_disc` decimal(10,2) NOT NULL,
  `p_stotal` decimal(10,2) NOT NULL,
  `inv_taxrate` int NOT NULL,
  `inv_taxamt` decimal(10,2) NOT NULL,
  `inv_total_tax` decimal(10,2) NOT NULL,
  `inv_disc` decimal(10,2) NOT NULL,
  `rounding` decimal(10,2) NOT NULL,
  `inv_total` decimal(10,2) NOT NULL,
  `entry` varchar(6) NOT NULL,
  `entry_date` date NOT NULL,
  `entry_upd` date NOT NULL,
  `inv_stat` varchar(255) NOT NULL,
  `inv_remarks` varchar(255) NOT NULL,
  `bill_rdate` date NOT NULL,
  `inv_datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`inv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7546 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv_bak2`
--

DROP TABLE IF EXISTS `tbl_inv_bak2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv_bak2` (
  `inv_id` int NOT NULL AUTO_INCREMENT,
  `inv_no` varchar(255) NOT NULL,
  `inv_date` date NOT NULL,
  `svc_order` varchar(25) NOT NULL,
  `reg_no` varchar(10) NOT NULL,
  `vehicle_id` int NOT NULL,
  `inv_costctr` varchar(12) NOT NULL,
  `workshop` varchar(50) NOT NULL,
  `ws_id` int NOT NULL,
  `svc_date` date NOT NULL,
  `svc_odo` int NOT NULL,
  `payment` varchar(30) NOT NULL,
  `upload` varchar(100) NOT NULL,
  `ptotal_amt` decimal(10,2) NOT NULL,
  `ptotal_tax` decimal(10,2) NOT NULL,
  `ptotal_disc` decimal(10,2) NOT NULL,
  `p_stotal` decimal(10,2) NOT NULL,
  `inv_taxrate` int NOT NULL,
  `inv_taxamt` decimal(10,2) NOT NULL,
  `inv_total_tax` decimal(10,2) NOT NULL,
  `inv_disc` decimal(10,2) NOT NULL,
  `rounding` decimal(10,2) NOT NULL,
  `inv_total` decimal(10,2) NOT NULL,
  `entry` varchar(6) NOT NULL,
  `entry_date` datetime NOT NULL,
  `entry_upd` date NOT NULL,
  `inv_stat` varchar(255) NOT NULL,
  `inv_remarks` varchar(255) NOT NULL,
  `bill_rdate` date NOT NULL,
  `inv_datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`inv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7807 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv_part`
--

DROP TABLE IF EXISTS `tbl_inv_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv_part` (
  `part_id` int NOT NULL AUTO_INCREMENT,
  `autopart_id` int DEFAULT NULL,
  `inv_id` int DEFAULT NULL,
  `svc_order_no` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_name` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_qty` int NOT NULL DEFAULT '0',
  `part_uprice` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_sst_rate` int NOT NULL DEFAULT '0',
  `part_sst_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_disc_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_final_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reg_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`part_id`)
) ENGINE=InnoDB AUTO_INCREMENT=54832 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_inv_part_bak`
--

DROP TABLE IF EXISTS `tbl_inv_part_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv_part_bak` (
  `part_id` int NOT NULL AUTO_INCREMENT,
  `autopart_id` int NOT NULL,
  `inv_id` int NOT NULL,
  `svc_order_no` varchar(25) NOT NULL,
  `part_name` varchar(250) NOT NULL,
  `part_qty` int NOT NULL,
  `part_uprice` decimal(10,2) NOT NULL,
  `part_amount` decimal(10,2) NOT NULL,
  `part_sst_rate` int NOT NULL,
  `part_sst_amount` decimal(10,2) NOT NULL,
  `part_disc_amount` decimal(10,2) NOT NULL,
  `part_final_amount` decimal(10,2) NOT NULL,
  `reg_date` datetime NOT NULL,
  PRIMARY KEY (`part_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25076 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_printing`
--

DROP TABLE IF EXISTS `tbl_printing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_printing` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `bfcy_cat` varchar(50) NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_ref` varchar(255) NOT NULL,
  `ubill_paystat` varchar(10) NOT NULL,
  `ubill_payref` varchar(100) NOT NULL,
  `ubill_submit` varchar(15) NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_taxrate` int NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_count` int NOT NULL,
  `util_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_printing_det`
--

DROP TABLE IF EXISTS `tbl_printing_det`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_printing_det` (
  `util2_id` int NOT NULL AUTO_INCREMENT,
  `util_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_rent` decimal(10,2) NOT NULL,
  `ubill_bw` decimal(10,2) NOT NULL,
  `ubill_color` decimal(10,2) NOT NULL,
  `util2_sst` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_ref` text NOT NULL,
  `ubill_submit` text NOT NULL,
  `ubill_paystat` text NOT NULL,
  `prod_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bill_id_prod` int NOT NULL COMMENT 'to be removed',
  `prod_loc` text NOT NULL COMMENT 'to be removed',
  `prod_owner` varchar(10) NOT NULL COMMENT 'to be removed',
  `util2_prod_id` int NOT NULL COMMENT 'to be removed',
  `util2_prod` varchar(100) NOT NULL COMMENT 'to be removed',
  `util2_usage` decimal(10,2) NOT NULL COMMENT 'to be removed',
  `util2_bwmtr` varchar(10) NOT NULL COMMENT 'to be removed',
  `util2_colormtr` varchar(10) NOT NULL COMMENT 'to be removed',
  PRIMARY KEY (`util2_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2208 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_rental`
--

DROP TABLE IF EXISTS `tbl_rental`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_rental` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_paystat` varchar(10) NOT NULL,
  `ubill_submit` varchar(15) NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_rent` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_taxrate` int NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_count` int NOT NULL,
  `util_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ubill_payref` varchar(100) NOT NULL,
  `ubill_ref` text NOT NULL,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=820 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_services`
--

DROP TABLE IF EXISTS `tbl_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_services` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `bfcy_cat` varchar(50) NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_ref` varchar(255) NOT NULL,
  `ubill_paystat` varchar(10) NOT NULL,
  `ubill_payref` varchar(100) NOT NULL,
  `ubill_submit` varchar(15) NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_rent` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_taxrate` int NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_count` int NOT NULL,
  `util_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7514 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_telephone`
--

DROP TABLE IF EXISTS `tbl_telephone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_telephone` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `util_id_copy` int NOT NULL,
  `bill_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `bfcy_cat` varchar(50) NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_ref` varchar(255) NOT NULL,
  `ubill_paystat` varchar(10) NOT NULL,
  `ubill_payref` varchar(100) NOT NULL,
  `ubill_submit` varchar(15) NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_rent` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_taxrate` int NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_count` int NOT NULL,
  `util_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2698 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_telephone_det`
--

DROP TABLE IF EXISTS `tbl_telephone_det`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_telephone_det` (
  `util2_id` int NOT NULL AUTO_INCREMENT,
  `util_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `prod_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `util2_billno` varchar(25) NOT NULL,
  `util2_rent` decimal(10,2) NOT NULL,
  `util2_usage` decimal(10,2) NOT NULL COMMENT 'per item amount',
  `util2_bwchg` decimal(10,2) NOT NULL,
  `util2_colorchg` decimal(10,2) NOT NULL,
  `util2_sst` decimal(10,2) NOT NULL,
  `util2_disc` decimal(10,2) NOT NULL,
  `util2_amt` decimal(10,2) NOT NULL,
  `prod_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `util2_prod` varchar(100) NOT NULL COMMENT 'to be removed',
  `ubill_no` varchar(50) NOT NULL COMMENT 'to be removed',
  `ubill_date` date NOT NULL COMMENT 'to be removed',
  PRIMARY KEY (`util2_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3375 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_util`
--

DROP TABLE IF EXISTS `tbl_util`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_util` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `bfcy_id` int DEFAULT NULL,
  `util_id_copy` int DEFAULT NULL,
  `util_id_copy2` int DEFAULT NULL COMMENT 'celcom',
  `bill_id` int DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `account_id` int DEFAULT NULL COMMENT 'ADMS4',
  `new_acc_id` int DEFAULT NULL,
  `account` varchar(100) DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `ubill_date` date DEFAULT NULL COMMENT 'adms4',
  `ubill_no` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `ubill_ref` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill upload',
  `ubill_submit` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'ready for finance submission',
  `ubill_rent` decimal(10,2) DEFAULT NULL,
  `ubill_color` decimal(10,2) DEFAULT NULL COMMENT 'printing only',
  `ubill_bw` decimal(10,2) DEFAULT NULL COMMENT 'printing only',
  `ubill_stotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_taxrate` int DEFAULT NULL,
  `ubill_tax` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_round` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_deduct` decimal(10,2) DEFAULT NULL,
  `ubill_gtotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_count` int DEFAULT NULL COMMENT 'to be removed',
  `ubill_disc` decimal(10,2) DEFAULT NULL,
  `ubill_usage` int DEFAULT NULL,
  `ubill_payref` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment reference',
  `ubill_paystat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment status',
  `util_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `running_no` int DEFAULT NULL,
  `running_no_multibill` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24403 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_util_bak_14Jul25`
--

DROP TABLE IF EXISTS `tbl_util_bak_14Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_util_bak_14Jul25` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `util_id_copy` int DEFAULT '0',
  `util_id_copy2` int DEFAULT '0' COMMENT 'celcom',
  `bill_id` int DEFAULT '0',
  `account` varchar(100) DEFAULT NULL,
  `cc_id` int DEFAULT '0',
  `loc_id` int DEFAULT '0',
  `ubill_date` date DEFAULT NULL,
  `ubill_no` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill/invoice no',
  `ubill_ref` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill upload',
  `ubill_submit` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'ready for finance submission',
  `ubill_rent` decimal(10,2) DEFAULT '0.00',
  `ubill_color` decimal(10,2) DEFAULT '0.00' COMMENT 'printing only',
  `ubill_bw` decimal(10,2) DEFAULT '0.00' COMMENT 'printing only',
  `ubill_stotal` decimal(10,2) DEFAULT '0.00',
  `ubill_taxrate` int DEFAULT '0',
  `ubill_tax` decimal(10,2) DEFAULT '0.00',
  `ubill_round` decimal(10,2) DEFAULT '0.00',
  `ubill_deduct` decimal(10,2) DEFAULT '0.00',
  `ubill_gtotal` decimal(10,2) DEFAULT '0.00',
  `ubill_count` int DEFAULT '0' COMMENT 'to be removed',
  `ubill_disc` decimal(10,2) DEFAULT '0.00',
  `ubill_usage` int DEFAULT '0',
  `ubill_payref` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment reference',
  `ubill_paystat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment status',
  `util_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `running_no` int DEFAULT '0',
  `running_no_multibill` int DEFAULT '0',
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23717 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_utilities`
--

DROP TABLE IF EXISTS `tbl_utilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_utilities` (
  `util_id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `bfcy_cat` varchar(50) NOT NULL,
  `ubill_date` date NOT NULL,
  `ubill_no` varchar(25) NOT NULL,
  `ubill_ref` varchar(255) NOT NULL,
  `ubill_paystat` varchar(10) NOT NULL,
  `ubill_payref` varchar(100) NOT NULL,
  `ubill_submit` varchar(15) NOT NULL,
  `ubill_stotal` decimal(10,2) NOT NULL,
  `ubill_disc` decimal(10,2) NOT NULL,
  `ubill_taxrate` int NOT NULL,
  `ubill_tax` decimal(10,2) NOT NULL,
  `ubill_round` decimal(10,2) NOT NULL,
  `ubill_gtotal` decimal(10,2) NOT NULL,
  `ubill_usage` decimal(10,2) NOT NULL,
  `ubill_deduct` decimal(10,2) NOT NULL,
  `ubill_count` int NOT NULL,
  `util_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`util_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16104 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_account_subs`
--

DROP TABLE IF EXISTS `telco_account_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_account_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  `status` enum('active','moved','retired') DEFAULT 'active',
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sub_no_id` (`sub_no_id`),
  KEY `account_id` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=323 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_accounts`
--

DROP TABLE IF EXISTS `telco_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_master` varchar(20) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `plan` decimal(5,2) DEFAULT NULL,
  `old_bill_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_master` (`account_master`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_bill_details_backup_1766494621348`
--

DROP TABLE IF EXISTS `telco_bill_details_backup_1766494621348`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bill_details_backup_1766494621348` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int DEFAULT NULL COMMENT 'adms4: telco_bills.id',
  `util_id` int DEFAULT NULL COMMENT 'adms4: tbr',
  `account_id` int DEFAULT NULL COMMENT 'adms4',
  `ramco_id` varchar(10) DEFAULT NULL COMMENT 'adms4',
  `sub_id` int DEFAULT NULL COMMENT 'adms4: subs_id',
  `sim_id` int DEFAULT NULL COMMENT 'tbr: old_sim_id',
  `new_sim_id` int DEFAULT NULL COMMENT 'adms4',
  `loc_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL COMMENT 'adms4: costcenter_id',
  `sim_user_id` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'tbr: replace with ramco_id',
  `cc_no` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'tbr',
  `cc_user` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'tbr',
  `plan` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `usage` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `discount` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `amount` decimal(10,2) DEFAULT NULL COMMENT 'adms4:',
  `cc_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17309 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_bills_backup_1766494719532`
--

DROP TABLE IF EXISTS `telco_bills_backup_1766494719532`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bills_backup_1766494719532` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bfcy_id` int DEFAULT NULL,
  `util_id_copy` int DEFAULT '0',
  `util_id_copy2` int DEFAULT '0' COMMENT 'celcom',
  `bill_id` int DEFAULT '0',
  `provider` varchar(100) DEFAULT NULL,
  `account_id` int DEFAULT NULL COMMENT 'ADMS4',
  `new_acc_id` int DEFAULT NULL,
  `account` varchar(100) DEFAULT NULL,
  `cc_id` int DEFAULT '0',
  `bill_date` date DEFAULT NULL COMMENT 'adms4',
  `bill_no` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `reference` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill upload',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `tax` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `rounding` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_deduct` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_count` int DEFAULT '0' COMMENT 'to be removed',
  `discount` decimal(10,2) DEFAULT NULL,
  `usage` int DEFAULT NULL,
  `status` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment status',
  `util_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23889 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_bills_bak17Jul25`
--

DROP TABLE IF EXISTS `telco_bills_bak17Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bills_bak17Jul25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `util_id_copy` int DEFAULT '0' COMMENT 'ref. telco_bill_details',
  `bill_id` int DEFAULT '0' COMMENT 'tbr - replace with account_id',
  `provider` varchar(100) DEFAULT NULL,
  `account_id` int DEFAULT NULL COMMENT 'ADMS4',
  `account` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'tbr',
  `cc_id` int DEFAULT '0',
  `loc_id` int DEFAULT '0' COMMENT 'tbr',
  `bill_date` date DEFAULT NULL COMMENT 'adms4',
  `bill_no` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `reference` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4: doc uploads',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `discount` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `tax` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `rounding` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `grand_total` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `status` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1998 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_bills_bak18Jul25`
--

DROP TABLE IF EXISTS `telco_bills_bak18Jul25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bills_bak18Jul25` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bfcy_id` int DEFAULT NULL,
  `util_id_copy` int DEFAULT '0',
  `util_id_copy2` int DEFAULT '0' COMMENT 'celcom',
  `bill_id` int DEFAULT '0',
  `provider` varchar(100) DEFAULT NULL,
  `account_id` int DEFAULT NULL COMMENT 'ADMS4',
  `new_acc_id` int DEFAULT NULL,
  `account` varchar(100) DEFAULT NULL,
  `cc_id` int DEFAULT '0',
  `bill_date` date DEFAULT NULL COMMENT 'adms4',
  `bill_no` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `reference` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill upload',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `tax` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `rounding` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_deduct` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_count` int DEFAULT '0' COMMENT 'to be removed',
  `discount` decimal(10,2) DEFAULT NULL,
  `usage` int DEFAULT NULL,
  `status` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment status',
  `util_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23732 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_contracts`
--

DROP TABLE IF EXISTS `telco_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` int DEFAULT NULL,
  `product_type` varchar(20) DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `plan` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `vendor_id` int DEFAULT (NULL),
  `price` decimal(10,2) DEFAULT NULL,
  `duration` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_department_subs`
--

DROP TABLE IF EXISTS `telco_department_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_department_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=329 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_sims_subs`
--

DROP TABLE IF EXISTS `telco_sims_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_sims_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sim_id` int DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sim_id` (`sim_id`),
  KEY `idx_sub_no_id` (`sub_no_id`)
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_sims`
--

DROP TABLE IF EXISTS `telco_sims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_sims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sim_sn` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `activated_at` datetime DEFAULT NULL,
  `deactivated_at` datetime DEFAULT NULL,
  `reason` enum('new','lost','broken','replace') DEFAULT 'new',
  `status` varchar(20) DEFAULT 'active',
  `replacement_sim_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_replacement_sim_id` (`replacement_sim_id`)
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_subs_devices`
--

DROP TABLE IF EXISTS `telco_subs_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_subs_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sub_no_id` (`sub_no_id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_subs`
--

DROP TABLE IF EXISTS `telco_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `account_sub` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` enum('active','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `costcenter_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `register_date` date DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=290 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_user_subs`
--

DROP TABLE IF EXISTS `telco_user_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_user_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(100) DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telco_vendors`
--

DROP TABLE IF EXISTS `telco_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `register_date` date DEFAULT NULL,
  `address` text,
  `contact_name` varchar(100) DEFAULT NULL,
  `contact_no` varchar(30) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tmsub`
--

DROP TABLE IF EXISTS `tmsub`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tmsub` (
  `tm_id` int NOT NULL AUTO_INCREMENT,
  `prod_id` int NOT NULL,
  `ac_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `bill_desc` text NOT NULL,
  `cc_id` int NOT NULL,
  `loc_id` int NOT NULL,
  `tm_ac` varchar(50) NOT NULL COMMENT 'product plan title & description',
  `tm_plan` decimal(10,2) NOT NULL COMMENT 'fixed rental cost (sub_plan)',
  `sim_subno` varchar(15) NOT NULL COMMENT 'prod s/n for D-tech or sub_no for TM or a/c id for streamyx (sub_no)',
  `sim_costctr` varchar(10) NOT NULL COMMENT 'sim user',
  `sim_user` varchar(50) NOT NULL COMMENT 'custodian',
  `sim_user_id` varchar(6) NOT NULL,
  `sim_loc` varchar(10) NOT NULL COMMENT '(sub_loc)',
  `sim_sn` varchar(20) NOT NULL,
  `pc_id` int NOT NULL,
  `sim_dev_sn` text NOT NULL,
  `tm_cont_start` date NOT NULL,
  `tm_cont_end` date NOT NULL,
  `tm_stat` varchar(10) NOT NULL COMMENT 'active/inactive',
  `tm_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tm_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `util_beneficiary`
--

DROP TABLE IF EXISTS `util_beneficiary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `util_beneficiary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `description` varchar(200) DEFAULT NULL,
  `logo` varchar(200) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `entry_by` varchar(6) DEFAULT NULL COMMENT 'ramco_id',
  `entry_position` varchar(100) DEFAULT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `contact_no` varchar(15) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `file_reference` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `util_billing_ac`
--

DROP TABLE IF EXISTS `util_billing_ac`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `util_billing_ac` (
  `bill_id` int NOT NULL AUTO_INCREMENT,
  `account` text,
  `category` text,
  `description` text,
  `beneficiary` text,
  `beneficiary_id` int DEFAULT NULL,
  `costcenter` text,
  `location` text,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `status` text,
  `contract_start` text,
  `contract_end` text,
  `deposit` decimal(10,2) DEFAULT NULL,
  `rental` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`bill_id`)
) ENGINE=InnoDB AUTO_INCREMENT=407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `util_billing_account`
--

DROP TABLE IF EXISTS `util_billing_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `util_billing_account` (
  `no` int NOT NULL AUTO_INCREMENT,
  `bill_id` int DEFAULT NULL,
  `ac_no` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `category` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `beneficiary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `costcenter` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `status` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `contract_start` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `contract_end` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `deposit` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `cc_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  PRIMARY KEY (`no`)
) ENGINE=InnoDB AUTO_INCREMENT=283 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-25 11:28:10
