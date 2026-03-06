
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
DROP TABLE IF EXISTS `autoparts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autoparts` (
  `autopart_id` int NOT NULL AUTO_INCREMENT,
  `autocat_id` int DEFAULT NULL,
  `vtype_id` int DEFAULT NULL,
  `part_name` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_uprice` decimal(10,2) DEFAULT '0.00',
  `part_sst_rate` int DEFAULT NULL,
  `part_sst_amount` decimal(10,2) DEFAULT '0.00',
  `part_disc_amount` decimal(10,2) DEFAULT '0.00',
  `part_final_amount` decimal(10,2) DEFAULT '0.00',
  `part_stat` int DEFAULT NULL,
  `reg_date` date DEFAULT NULL,
  PRIMARY KEY (`autopart_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9077 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `ca_fterm` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ca_fterm_mth` int DEFAULT NULL,
  `ca_fterm_day` int DEFAULT NULL,
  `ca_dept` varchar(10) NOT NULL,
  `ca_costctr` varchar(10) NOT NULL,
  `ca_loc` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ca_deposit` decimal(10,2) NOT NULL,
  `ca_deposit_elec` decimal(10,2) NOT NULL,
  `ca_deposit_wtr` decimal(10,2) NOT NULL,
  `ca_deposit_park` decimal(10,2) NOT NULL,
  `ca_deposit_sd` decimal(10,2) NOT NULL,
  `ca_deposit_oth` decimal(10,2) NOT NULL,
  `ca_deposit_othdesc` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ca_docs` varchar(255) NOT NULL,
  `ca_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ca_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ca_id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contracts_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts_dt` (
  `cdt_id` int NOT NULL AUTO_INCREMENT,
  `ca_id` int DEFAULT NULL,
  `cdt_renew_type` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cdt_renew` date DEFAULT NULL,
  `cdt_start` date NOT NULL,
  `cdt_end` date NOT NULL,
  `cdt_docs` varchar(255) NOT NULL,
  `ca_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `costws`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costws` (
  `ws_id` int NOT NULL AUTO_INCREMENT,
  `ws_type` int DEFAULT NULL,
  `ws_name` varchar(50) NOT NULL,
  `ws_add` varchar(1000) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_ctc` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_pic` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_branch` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_rem` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ws_panel` varchar(10) NOT NULL,
  `ws_stat` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `agreement_date_from` date DEFAULT NULL,
  `agreement_date_to` date DEFAULT NULL,
  `sub_no` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`ws_id`)
) ENGINE=MyISAM AUTO_INCREMENT=185 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `assignment` enum('new','replacement') DEFAULT 'new',
  `replacement_card_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=426 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=611 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `stmt_date` date DEFAULT NULL,
  `stmt_id` int DEFAULT NULL,
  `changed_at` datetime DEFAULT NULL,
  `updated_by` varchar(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fuel_stmt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_stmt` (
  `stmt_id` int NOT NULL AUTO_INCREMENT,
  `fuel_id` int DEFAULT NULL COMMENT 'stmt_issuer',
  `stmt_no` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `stmt_date` date DEFAULT NULL,
  `stmt_issuer` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `petrol` decimal(10,2) DEFAULT NULL,
  `diesel` decimal(10,2) DEFAULT NULL,
  `stmt_ron95` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_ron97` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_diesel` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bill_payment` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `stmt_count` int DEFAULT NULL,
  `stmt_litre` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_total_odo` int DEFAULT NULL,
  `stmt_stotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_tax` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_rounding` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_disc` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stmt_entry` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stmt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=396 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=81217 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `ws_id` int DEFAULT NULL,
  `svc_date` date DEFAULT NULL,
  `svc_odo` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `payment` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `upload` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ptotal_amt` decimal(10,2) DEFAULT NULL,
  `ptotal_tax` decimal(10,2) DEFAULT '0.00',
  `ptotal_disc` decimal(10,2) DEFAULT '0.00',
  `p_stotal` decimal(10,2) DEFAULT '0.00',
  `inv_taxrate` int DEFAULT NULL,
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
  `running_no` int DEFAULT NULL,
  PRIMARY KEY (`inv_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14604 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tbl_inv_part`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inv_part` (
  `part_id` int NOT NULL AUTO_INCREMENT,
  `autopart_id` int DEFAULT NULL,
  `inv_id` int DEFAULT NULL,
  `svc_order_no` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_name` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `part_qty` int DEFAULT NULL,
  `part_uprice` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_sst_rate` int DEFAULT NULL,
  `part_sst_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_disc_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `part_final_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reg_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`part_id`)
) ENGINE=InnoDB AUTO_INCREMENT=56601 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=24778 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `telco_bill_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bill_details` (
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
) ENGINE=InnoDB AUTO_INCREMENT=17880 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telco_bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bfcy_id` int DEFAULT NULL,
  `util_id_copy` int DEFAULT NULL,
  `util_id_copy2` int DEFAULT NULL COMMENT 'celcom',
  `bill_id` int DEFAULT NULL COMMENT 'no longer use',
  `provider` varchar(100) DEFAULT NULL,
  `account_id` int DEFAULT NULL COMMENT 'ADMS4',
  `new_acc_id` int DEFAULT NULL,
  `account` varchar(100) DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `bill_date` date DEFAULT NULL COMMENT 'adms4',
  `bill_no` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'adms4',
  `reference` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'bill upload',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `tax` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `rounding` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_deduct` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT NULL COMMENT 'adms4',
  `ubill_count` int DEFAULT NULL COMMENT 'to be removed',
  `discount` decimal(10,2) DEFAULT NULL,
  `usage` int DEFAULT NULL,
  `status` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'payment status',
  `category_id` int DEFAULT NULL,
  `util_dt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23971 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `telco_department_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_department_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telco_sims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_sims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sim_sn` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `activated_at` date DEFAULT NULL,
  `deactivated_at` date DEFAULT NULL,
  `reason` enum('new','lost','broken','replace') DEFAULT 'new',
  `status` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `replacement_sim_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telco_sims_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_sims_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sim_id` int DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telco_sims_subs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_sims_subs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sim_id` int DEFAULT NULL,
  `sub_no_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `telco_subs_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_subs_account` (
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
DROP TABLE IF EXISTS `telco_subs_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telco_subs_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=252 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=429 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

