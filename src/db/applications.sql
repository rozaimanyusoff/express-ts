-- MySQL dump 10.13  Distrib 8.0.34, for macos13 (arm64)
--
-- Host: localhost    Database: applications
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
-- Table structure for table `_assetdata`
--

DROP TABLE IF EXISTS `_assetdata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_assetdata` (
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
) ENGINE=InnoDB AUTO_INCREMENT=7861 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_vehicle_svc2`
--

DROP TABLE IF EXISTS `_vehicle_svc2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_vehicle_svc2` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` datetime DEFAULT NULL,
  `vehicle_id` int NOT NULL DEFAULT '0',
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'id of service options',
  `odo_start` int NOT NULL DEFAULT '0',
  `odo_end` int NOT NULL DEFAULT '0',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'comment or complain by driver',
  `req_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'coordinator remarks',
  `verification_stat` int NOT NULL DEFAULT '0' COMMENT '0 - not checked, 1 - approved, 2 - rejected, 3 - verified',
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'if request rejected',
  `rejection_date` datetime DEFAULT NULL,
  `ws_id` int NOT NULL DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recommendation_stat` int NOT NULL DEFAULT '0' COMMENT 'recommendation status',
  `recommendation_date` datetime DEFAULT NULL,
  `approval` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `approval_stat` int NOT NULL DEFAULT '0' COMMENT 'approval status',
  `approval_date` datetime DEFAULT NULL,
  `drv_stat` int NOT NULL DEFAULT '0' COMMENT 'driver acceptance ',
  `drv_date` datetime DEFAULT NULL COMMENT 'driver acceptance date',
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `form_upload_date` datetime DEFAULT NULL,
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously ''notice''',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously ''noticedate''',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'original request by driver',
  `stOthers` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'other request by driver',
  `stAttach` varchar(255) DEFAULT NULL COMMENT 'attachment image by driver',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `admRem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'remarks by admin if svc allowed',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `svcCancel` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'justification by admin if svc rejected',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `bill_upl` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `bill_udate` date DEFAULT NULL,
  `emailStat` int NOT NULL DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `date_create` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `staffID` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvtelno` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `adms_module`
--

DROP TABLE IF EXISTS `adms_module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adms_module` (
  `module_id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(50) DEFAULT NULL,
  `status_data` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`module_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `adms_submodule`
--

DROP TABLE IF EXISTS `adms_submodule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adms_submodule` (
  `submodule_id` int NOT NULL AUTO_INCREMENT,
  `module_id` int DEFAULT '0',
  `submodule` varchar(50) DEFAULT NULL,
  `status_data` int DEFAULT '0',
  PRIMARY KEY (`submodule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `apps_auth`
--

DROP TABLE IF EXISTS `apps_auth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `apps_auth` (
  `auth_id` int NOT NULL AUTO_INCREMENT,
  `apps` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `approval` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `effective_date` date NOT NULL,
  `status` int NOT NULL DEFAULT '0' COMMENT '1-active, 0-inactive',
  PRIMARY KEY (`auth_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
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
) ENGINE=InnoDB AUTO_INCREMENT=7868 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `authorized`
--

DROP TABLE IF EXISTS `authorized`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authorized` (
  `authID` int NOT NULL AUTO_INCREMENT,
  `authPin` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `authOwner` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `authOwnID` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `authEmail` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `authType` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`authID`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `e_aduan_she`
--

DROP TABLE IF EXISTS `e_aduan_she`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_aduan_she` (
  `id_aduan` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `no_tel_pengadu` varchar(50) DEFAULT NULL,
  `jenis_aduan_kelakuan` int DEFAULT '0',
  `jenis_aduan_keadaan` int DEFAULT '0',
  `tarikh_kejadian` date DEFAULT NULL,
  `waktu_kejadian` time DEFAULT NULL,
  `lokasi_kejadian` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `lokasi_latitude` float(10,6) DEFAULT NULL,
  `lokasi_longitude` float(10,6) DEFAULT NULL,
  `keterangan_aduan` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `lampiran_aduan` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `tarikh_aduan_dihantar` datetime DEFAULT NULL,
  `komen_seksyen_kkas` text,
  `jabatan_lain_yatidak` int DEFAULT '0' COMMENT 'inform dept lain? 1-ya; 2-tidak',
  `id_jabatan_lain` int DEFAULT '0' COMMENT 'id jabatan lain',
  `jkkas_yatidak` int DEFAULT '0' COMMENT 'bawa ke jkkas? 1-ya; 2-tidak',
  `lain_lain_yatidak` int DEFAULT '0' COMMENT 'tindakan lain? 1-ya; 2-tidak',
  `tindakan_lain_komen` text,
  `status_pengesahan` int DEFAULT '0',
  `tarikh_disahkan` datetime DEFAULT NULL,
  `disahkan_oleh` varchar(50) DEFAULT NULL,
  `komen_tolak_aduan` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `tarikh_aduan_diselesaikan` date DEFAULT NULL,
  `langkah_pencegahan` text,
  `disahkan_oleh_jbtn_lain` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `status_pengesahan_jbtn_lain` int DEFAULT '0',
  `tarikh_disahkan_jabatan_lain` datetime DEFAULT NULL,
  `status_penerimaan` int DEFAULT '0',
  `diterima_oleh` varchar(50) DEFAULT NULL,
  `tarikh_terima` datetime DEFAULT NULL,
  `aduan_file` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `aduan_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aduan`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fleet_insurance`
--

DROP TABLE IF EXISTS `fleet_insurance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fleet_insurance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `insurer` varchar(200) DEFAULT NULL,
  `policy_no` varchar(100) DEFAULT NULL,
  `coverage_start` date DEFAULT NULL,
  `coverage_end` date DEFAULT NULL,
  `coverage_details` varchar(250) DEFAULT NULL,
  `premium_amount` decimal(10,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `helpdesk`
--

DROP TABLE IF EXISTS `helpdesk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helpdesk` (
  `helpdesk_id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `ticket_no` varchar(50) DEFAULT NULL,
  `dept_id` int DEFAULT '0',
  `module_id` int DEFAULT '0',
  `submodule_id` int DEFAULT '0',
  `issue_details` text,
  `supp_upload` text,
  `priority_level` varchar(50) DEFAULT NULL COMMENT 'Low; Medium; High',
  `minor_bugs` int DEFAULT '0' COMMENT '0-No; 1-Yes',
  `major_bugs` int DEFAULT '0' COMMENT '0-No; 1-Yes',
  `new_dev` int DEFAULT '0' COMMENT '0-No; 1-Yes',
  `remarks_by_pic` text,
  `expected_date_resolved` date DEFAULT NULL,
  `date_resolved` date DEFAULT NULL,
  `update_by` varchar(6) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` int DEFAULT '0' COMMENT '0-Pending; 1-Approve; 2-Reject',
  `approved_by` varchar(6) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status_data` int DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`helpdesk_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poolcar`
--

DROP TABLE IF EXISTS `poolcar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar` (
  `pcar_id` int NOT NULL AUTO_INCREMENT,
  `pcar_datereq` date DEFAULT NULL,
  `pcar_empid` varchar(7) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `dept_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `pcar_booktype` varchar(10) DEFAULT NULL,
  `pcar_type` int NOT NULL DEFAULT '0',
  `pcar_datefr` datetime DEFAULT NULL,
  `pcar_dateto` datetime DEFAULT NULL,
  `pcar_day` int NOT NULL DEFAULT '0',
  `pcar_hour` int DEFAULT '0',
  `pcar_dest` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_purp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_opt` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pass` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'passenger',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `asset_id` int DEFAULT NULL,
  `pcar_driver` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'admin''s remarks',
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation_stat` int NOT NULL DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL,
  `cancel_date` datetime DEFAULT NULL,
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `approval_stat` int NOT NULL DEFAULT '0',
  `approval_date` datetime DEFAULT NULL,
  `pcar_driver_chklist` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_odo_start` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_odo_end` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_condition` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_condition_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_driver_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_retdate` datetime DEFAULT NULL COMMENT 'returns date',
  `tng_id` int DEFAULT NULL,
  `fleetcard_id` int DEFAULT NULL,
  `tng_usage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'TnG Balance amount',
  `pcar_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pcar_email` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timefr` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_empname` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timeto` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_type2` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_cancel` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_canrem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `cancel_by` varchar(50) DEFAULT NULL,
  `pcar_poolcar` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'replaced with vehicle_id',
  `pcar_vPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'not used',
  `pcar_driver2` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if drivers checked',
  `pcar_aPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_aDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_vDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_rettime` time DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`pcar_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2243 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poolcar2`
--

DROP TABLE IF EXISTS `poolcar2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar2` (
  `pcar_id` int NOT NULL AUTO_INCREMENT,
  `pcar_datereq` date DEFAULT NULL,
  `pcar_empid` varchar(7) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `dept_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `pcar_booktype` varchar(10) DEFAULT NULL,
  `pcar_type` int NOT NULL DEFAULT '0',
  `pcar_datefr` datetime DEFAULT NULL,
  `pcar_dateto` datetime DEFAULT NULL,
  `pcar_day` int NOT NULL DEFAULT '0',
  `pcar_hour` int DEFAULT '0',
  `pcar_dest` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_purp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_opt` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pass` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'passenger',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `asset_id` int DEFAULT NULL,
  `pcar_driver` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'admin''s remarks',
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation_stat` int NOT NULL DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL,
  `cancel_date` datetime DEFAULT NULL,
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `approval_stat` int NOT NULL DEFAULT '0',
  `approval_date` datetime DEFAULT NULL,
  `pcar_driver_chklist` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_odo_start` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_odo_end` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_condition` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_condition_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_driver_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_retdate` datetime DEFAULT NULL COMMENT 'returns date',
  `tng_id` int DEFAULT NULL,
  `fleetcard_id` int DEFAULT NULL,
  `tng_usage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'TnG Balance amount',
  `pcar_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pcar_email` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timefr` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_empname` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timeto` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_type2` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_cancel` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `cancel_by` varchar(6) DEFAULT NULL,
  `pcar_canrem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'to be removed',
  `pcar_poolcar` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'replaced with vehicle_id',
  `pcar_vPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'not used',
  `pcar_driver2` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if drivers checked',
  `pcar_aPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_aDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_vDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_rettime` time DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`pcar_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2162 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poolcar_bak`
--

DROP TABLE IF EXISTS `poolcar_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar_bak` (
  `pcar_id` int NOT NULL AUTO_INCREMENT,
  `pcar_datereq` date DEFAULT NULL,
  `pcar_empid` varchar(7) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `dept_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `pcar_type` int NOT NULL DEFAULT '0',
  `pcar_datefr` datetime DEFAULT NULL,
  `pcar_dateto` datetime DEFAULT NULL,
  `pcar_day` int NOT NULL DEFAULT '0',
  `pcar_hour` int NOT NULL DEFAULT '0',
  `pcar_dest` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_purp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_opt` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pass` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'passenger',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `pcar_driver` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if drivers checked',
  `tng_id` int NOT NULL DEFAULT '0',
  `tng_usage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `pcar_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'admin''s remarks',
  `pcar_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_aPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approver''s',
  `pcar_sPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'supervisor''s',
  `pcar_sDate` date DEFAULT NULL COMMENT 'spv approval date',
  `pcar_vDate` date DEFAULT NULL COMMENT 'admin''s verify date',
  `pcar_aDate` date DEFAULT NULL COMMENT 'admin''s verify date',
  `pcar_retdate` date DEFAULT NULL COMMENT 'returns date',
  `pcar_rettime` time DEFAULT NULL COMMENT 'returns time',
  `pcar_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pcar_email` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timefr` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_empname` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timeto` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_type2` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_cancel` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_canrem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'to be removed',
  `pcar_poolcar` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'replaced with vehicle_id',
  `pcar_vPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'not used',
  PRIMARY KEY (`pcar_id`)
) ENGINE=InnoDB AUTO_INCREMENT=836 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poolcar_bak_13oct25`
--

DROP TABLE IF EXISTS `poolcar_bak_13oct25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar_bak_13oct25` (
  `pcar_id` int NOT NULL AUTO_INCREMENT,
  `pcar_datereq` date DEFAULT NULL,
  `pcar_empid` varchar(7) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `dept_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `pcar_type` int NOT NULL DEFAULT '0',
  `pcar_datefr` datetime DEFAULT NULL,
  `pcar_dateto` datetime DEFAULT NULL,
  `pcar_day` int NOT NULL DEFAULT '0',
  `pcar_hour` int DEFAULT '0',
  `pcar_dest` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_purp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_opt` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pass` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'passenger',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `asset_id` int NOT NULL,
  `pcar_driver` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'admin''s remarks',
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation_stat` int NOT NULL DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL,
  `cancel_date` datetime DEFAULT NULL,
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `approval_stat` int NOT NULL DEFAULT '0',
  `approval_date` datetime DEFAULT NULL,
  `pcar_driver_chklist` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_odo_start` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_odo_end` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_condition` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_condition_rem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_driver_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `pcar_retdate` datetime DEFAULT NULL COMMENT 'returns date',
  `tng_id` int NOT NULL DEFAULT '0',
  `tng_usage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'TnG Balance amount',
  `pcar_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pcar_email` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timefr` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_empname` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_timeto` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_type2` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_cancel` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_canrem` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'to be removed',
  `pcar_poolcar` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'replaced with vehicle_id',
  `pcar_vPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'not used',
  `pcar_driver2` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if drivers checked',
  `pcar_aPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `pcar_sDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_aDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_vDate` date DEFAULT NULL COMMENT 'to be removed',
  `pcar_rettime` time DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`pcar_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2150 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poolcar_pass`
--

DROP TABLE IF EXISTS `poolcar_pass`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar_pass` (
  `pp_id` int NOT NULL AUTO_INCREMENT,
  `pcar_id` int NOT NULL DEFAULT '0',
  `pcar_pass` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_driver_email` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_pass_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_pass_dept` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_pass_stat` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `pcar_pass_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1215 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roadtax`
--

DROP TABLE IF EXISTS `roadtax`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roadtax` (
  `id` int NOT NULL AUTO_INCREMENT,
  `insurer_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `register_number` varchar(50) DEFAULT NULL,
  `roadtax_expiry` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `she_aduan`
--

DROP TABLE IF EXISTS `she_aduan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `she_aduan` (
  `she_id` int NOT NULL AUTO_INCREMENT,
  `she_datereg` date DEFAULT NULL,
  `she_ramco` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_ctc` int NOT NULL DEFAULT '0',
  `she_act_type` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_act_loc` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_loc_lat` float(10,6) NOT NULL,
  `she_loc_long` float(10,6) NOT NULL,
  `she_act_date` date DEFAULT NULL,
  `she_act_time` time DEFAULT NULL,
  `she_act_desc` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `she_act_upl` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_action` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `she_stat` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_file` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`she_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `she_aduan_comm`
--

DROP TABLE IF EXISTS `she_aduan_comm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `she_aduan_comm` (
  `she_comm_id` int NOT NULL AUTO_INCREMENT,
  `she_id` int NOT NULL DEFAULT '0',
  `she_comm_in` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `she_comm_out` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `she_comm_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`she_comm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `she_aduan_file`
--

DROP TABLE IF EXISTS `she_aduan_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `she_aduan_file` (
  `she_file_id` int NOT NULL AUTO_INCREMENT,
  `she_id` int NOT NULL DEFAULT '0',
  `she_file` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `she_file_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`she_file_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support`
--

DROP TABLE IF EXISTS `support`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support` (
  `supp_id` int NOT NULL AUTO_INCREMENT,
  `supp_date` datetime DEFAULT NULL,
  `supp_empid` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ctc_m` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `dept_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `cat_pic` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `cat_id` int NOT NULL DEFAULT '0',
  `svc_id` int NOT NULL DEFAULT '0',
  `sn` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `supp_det` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `supp_upload` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `supp_stat` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`supp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_cat`
--

DROP TABLE IF EXISTS `support_cat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_cat` (
  `cat_id` int NOT NULL AUTO_INCREMENT,
  `cat_pic` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `cat_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `dept_id` int DEFAULT '0' COMMENT 'Owner',
  PRIMARY KEY (`cat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_det`
--

DROP TABLE IF EXISTS `support_det`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_det` (
  `sd_id` int NOT NULL AUTO_INCREMENT,
  `supp_id` int NOT NULL DEFAULT '0',
  `sd_date` datetime DEFAULT NULL,
  `sd_action` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `sd_method` int NOT NULL DEFAULT '0',
  `sd_stat` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`sd_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_svc`
--

DROP TABLE IF EXISTS `support_svc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_svc` (
  `svc_id` int NOT NULL AUTO_INCREMENT,
  `cat_id` int NOT NULL DEFAULT '0',
  `svc_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `svc_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `svc_sla` int NOT NULL DEFAULT '0',
  `sla_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`svc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `svctype`
--

DROP TABLE IF EXISTS `svctype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `svctype` (
  `svcTypeId` int NOT NULL AUTO_INCREMENT,
  `svcType` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `svcOpt` int NOT NULL DEFAULT '0',
  `group_desc` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `orders` int DEFAULT NULL,
  `appearance` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`svcTypeId`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_14`
--

DROP TABLE IF EXISTS `table_14`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_14` (
  `doc_id` int NOT NULL AUTO_INCREMENT,
  `doc_cat` varchar(17) DEFAULT NULL,
  `doc_owner` varchar(20) DEFAULT NULL,
  `doc_title` varchar(116) DEFAULT NULL,
  `doc_no` varchar(23) DEFAULT NULL,
  `doc_rev` varchar(2) DEFAULT NULL,
  `doc_reg_date` date DEFAULT NULL,
  `ACTION` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`doc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_task`
--

DROP TABLE IF EXISTS `tbl_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_task` (
  `task_id` int NOT NULL AUTO_INCREMENT,
  `task_member` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `task_count` int NOT NULL DEFAULT '0',
  `task_completed` int NOT NULL DEFAULT '0',
  `task_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_task_dt`
--

DROP TABLE IF EXISTS `tbl_task_dt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_task_dt` (
  `ts_id` int NOT NULL AUTO_INCREMENT,
  `ts_task` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `ts_assign_date` date DEFAULT NULL,
  `ts_due_date` date DEFAULT NULL,
  `ts_progress` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `ts_stat` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `ts_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ts_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vb_cat`
--

DROP TABLE IF EXISTS `vb_cat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vb_cat` (
  `vbID` int NOT NULL AUTO_INCREMENT,
  `vbImg` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vbRegNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vbVtype` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`vbID`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_svc`
--

DROP TABLE IF EXISTS `vehicle_svc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int DEFAULT NULL COMMENT 'TBR',
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT '0' COMMENT 'TBR',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously st',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `odo_start` int DEFAULT '0' COMMENT 'previously curr_odo',
  `odo_end` int DEFAULT '0' COMMENT 'previously next_odo',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL COMMENT 'will be removed. same as req_date',
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously admRem',
  `verification_stat` int DEFAULT '0',
  `verification_date` datetime DEFAULT NULL,
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously svcCancel',
  `ws_id` int DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace recPIC',
  `recommendation_stat` int DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL COMMENT 'replace recDate',
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace appPIC',
  `approval_stat` int DEFAULT '0',
  `approval_date` datetime DEFAULT NULL COMMENT 'replace appDate',
  `drv_stat` int DEFAULT NULL COMMENT 'driver response 1: accept, 2: cancelled',
  `drv_date` datetime DEFAULT NULL COMMENT 'when driver uploaded form',
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'when driver uploaded form',
  `form_upload_date` date DEFAULT NULL COMMENT 'previously bill_udate',
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously noticedate',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `date_create` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `inv_status` int DEFAULT '0',
  `drv_cancel_comment` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12000 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_svc2`
--

DROP TABLE IF EXISTS `vehicle_svc2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc2` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT '0',
  `register_number` varchar(100) DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT '0',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously st',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `odo_start` int DEFAULT '0' COMMENT 'previously curr_odo',
  `odo_end` int DEFAULT '0' COMMENT 'previously next_odo',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL COMMENT 'will be removed. same as req_date',
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously admRem',
  `verification_stat` int DEFAULT '0',
  `verification_date` datetime DEFAULT NULL,
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously svcCancel',
  `ws_id` int DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace recPIC',
  `recommendation_stat` int DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL COMMENT 'replace recDate',
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace appPIC',
  `approval_stat` int DEFAULT '0',
  `approval_date` datetime DEFAULT NULL COMMENT 'replace appDate',
  `drv_stat` int DEFAULT NULL COMMENT 'driver response 1: accept, 2: cancelled',
  `drv_date` datetime DEFAULT NULL COMMENT 'when driver uploaded form',
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'when driver uploaded form',
  `form_upload_date` date DEFAULT NULL COMMENT 'previously bill_udate',
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously noticedate',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `date_create` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `inv_status` int DEFAULT '0',
  `drv_cancel_comment` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11493 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_svc_bak`
--

DROP TABLE IF EXISTS `vehicle_svc_bak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc_bak` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously st',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `odo_start` int NOT NULL DEFAULT '0' COMMENT 'previously curr_odo',
  `odo_end` int NOT NULL DEFAULT '0' COMMENT 'previously next_odo',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL,
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously admRem',
  `verification_stat` int NOT NULL DEFAULT '0',
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously svcCancel',
  `ws_id` int NOT NULL DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace recPIC',
  `recommendation_stat` int DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL COMMENT 'replace recDate',
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace appPIC',
  `approval_stat` int NOT NULL DEFAULT '0',
  `approval_date` datetime DEFAULT NULL COMMENT 'replace appDate',
  `drv_stat` int NOT NULL DEFAULT '0',
  `drv_date` datetime DEFAULT NULL,
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously bill_upl',
  `form_upload_date` date DEFAULT NULL COMMENT 'previously bill_udate',
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously noticedate',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int NOT NULL DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `date_create` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4301 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_svc_bak18Aug25`
--

DROP TABLE IF EXISTS `vehicle_svc_bak18Aug25`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc_bak18Aug25` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `vehicle_id` int DEFAULT '0',
  `register_number` varchar(100) DEFAULT NULL,
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int DEFAULT NULL,
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT '0',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously st',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `odo_start` int DEFAULT '0' COMMENT 'previously curr_odo',
  `odo_end` int DEFAULT '0' COMMENT 'previously next_odo',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL COMMENT 'will be removed. same as req_date',
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously admRem',
  `verification_stat` int DEFAULT '0',
  `verification_date` datetime DEFAULT NULL,
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously svcCancel',
  `ws_id` int DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace recPIC',
  `recommendation_stat` int DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL COMMENT 'replace recDate',
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace appPIC',
  `approval_stat` int DEFAULT '0',
  `approval_date` datetime DEFAULT NULL COMMENT 'replace appDate',
  `drv_stat` int DEFAULT NULL COMMENT 'when driver uploaded form',
  `drv_date` datetime DEFAULT NULL COMMENT 'when driver uploaded form',
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'when driver uploaded form',
  `form_upload_date` date DEFAULT NULL COMMENT 'previously bill_udate',
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously noticedate',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `date_create` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `inv_status` int DEFAULT '0',
  `drv_cancel_comment` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11155 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_svc_bak2`
--

DROP TABLE IF EXISTS `vehicle_svc_bak2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc_bak2` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `vehicle_id` int NOT NULL DEFAULT '0',
  `ramco_id` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `cc_id` int NOT NULL DEFAULT '0',
  `loc_id` int NOT NULL DEFAULT '0',
  `svc_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously st',
  `st` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `odo_start` int NOT NULL DEFAULT '0' COMMENT 'previously curr_odo',
  `odo_end` int NOT NULL DEFAULT '0' COMMENT 'previously next_odo',
  `req_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL COMMENT 'will be removed. same as req_date',
  `verification_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously admRem',
  `verification_stat` int DEFAULT NULL,
  `rejection_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously svcCancel',
  `ws_id` int NOT NULL DEFAULT '0',
  `major_opt` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `major_svc_comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `recommendation` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace recPIC',
  `recommendation_stat` int NOT NULL DEFAULT '0',
  `recommendation_date` datetime DEFAULT NULL COMMENT 'replace recDate',
  `approval` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'replace appPIC',
  `approval_stat` int NOT NULL DEFAULT '0',
  `approval_date` datetime DEFAULT NULL COMMENT 'replace appDate',
  `drv_stat` int NOT NULL DEFAULT '0',
  `drv_date` datetime DEFAULT NULL,
  `form_upload` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously bill_upl',
  `form_upload_date` date DEFAULT NULL COMMENT 'previously bill_udate',
  `late_notice` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL COMMENT 'previously noticedate',
  `f_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'complaint by driver',
  `stAdm` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text CHARACTER SET latin1 COLLATE latin1_swedish_ci COMMENT 'instruction to workshop',
  `appStat` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int NOT NULL DEFAULT '0',
  `stAdmRem` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `extra_mileage` varchar(6) NOT NULL,
  `date_create` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `staffID3` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4304 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-25 11:28:14
