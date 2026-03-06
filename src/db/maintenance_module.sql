-- Maintenance Module Database Schema
-- Tables used by p.maintenance/ module from 'applications' database

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_svc` (
  `req_id` int NOT NULL AUTO_INCREMENT,
  `req_date` date DEFAULT NULL COMMENT 'previously date_req',
  `asset_id` int DEFAULT NULL,
  `entry_code` varchar(10) DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `ramco_id` varchar(6) DEFAULT NULL COMMENT 'previously staffID',
  `ctc_m` varchar(50) DEFAULT NULL,
  `cc_id` int DEFAULT NULL COMMENT 'TBR',
  `costcenter_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `svc_opt` text COMMENT 'previously st',
  `st` text,
  `odo_start` int DEFAULT NULL,
  `odo_end` int DEFAULT NULL,
  `req_comment` text COMMENT 'previously stOthers',
  `req_upload` varchar(255) DEFAULT NULL COMMENT 'previously stAttach',
  `upload_date` datetime DEFAULT NULL,
  `verification_comment` text COMMENT 'previously admRem',
  `verification_stat` int DEFAULT NULL,
  `verification_date` datetime DEFAULT NULL,
  `rejection_comment` text COMMENT 'previously svcCancel',
  `ws_id` int DEFAULT NULL,
  `major_opt` text,
  `major_svc_comment` text,
  `recommendation` text COMMENT 'replace recPIC',
  `recommendation_stat` int DEFAULT NULL,
  `recommendation_date` datetime DEFAULT NULL,
  `approval` text COMMENT 'replace appPIC',
  `approval_stat` int DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `drv_stat` int DEFAULT NULL,
  `drv_date` datetime DEFAULT NULL,
  `form_upload` text COMMENT 'when driver uploaded form',
  `form_upload_date` date DEFAULT NULL,
  `late_notice` text COMMENT 'previously notice',
  `late_notice_date` datetime DEFAULT NULL,
  `f_name` varchar(50) DEFAULT NULL COMMENT 'to be removed',
  `drvemail` varchar(50) DEFAULT NULL COMMENT 'to be removed',
  `spvname` varchar(125) DEFAULT NULL COMMENT 'to be removed',
  `spvemail` varchar(50) DEFAULT NULL COMMENT 'to be removed',
  `spvid` varchar(6) DEFAULT NULL COMMENT 'to be removed',
  `svcComp` text COMMENT 'complaint by driver',
  `stAdm` varchar(200) DEFAULT NULL COMMENT 'approved request b admin',
  `instWs` text COMMENT 'instruction to workshop',
  `appStat` varchar(25) DEFAULT NULL COMMENT 'if svc reject checked',
  `recPIC` varchar(100) DEFAULT NULL,
  `recDate` date DEFAULT NULL,
  `appPIC` varchar(100) DEFAULT NULL,
  `appDate` date DEFAULT NULL,
  `emailStat` int DEFAULT NULL,
  `stAdmRem` varchar(300) DEFAULT NULL,
  `extra_mileage` varchar(6) DEFAULT NULL,
  `date_create` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regNo` varchar(10) DEFAULT NULL COMMENT 'to be removed',
  `ws` varchar(100) DEFAULT NULL COMMENT 'to be removed',
  `vloc` varchar(25) DEFAULT NULL,
  `staffID3` varchar(11) DEFAULT NULL COMMENT 'deprecated',
  `costctr` varchar(12) DEFAULT NULL COMMENT 'to be removed',
  `inv_status` int DEFAULT NULL,
  `drv_cancel_comment` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`req_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poolcar` (
  `pcar_id` int NOT NULL AUTO_INCREMENT,
  `pcar_datereq` date DEFAULT NULL,
  `pcar_empid` varchar(7) DEFAULT NULL,
  `ctc_m` varchar(12) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `pcar_booktype` varchar(10) DEFAULT NULL,
  `pcar_type` int DEFAULT NULL,
  `pcar_datefr` datetime DEFAULT NULL,
  `pcar_dateto` datetime DEFAULT NULL,
  `pcar_day` int DEFAULT NULL,
  `pcar_hour` int DEFAULT NULL,
  `pcar_dest` text,
  `pcar_purp` text,
  `pcar_opt` varchar(150) DEFAULT NULL,
  `pass` text COMMENT 'passenger',
  `vehicle_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `pcar_driver` varchar(6) DEFAULT NULL,
  `pcar_rem` text COMMENT 'admin''s remarks',
  `recommendation` text,
  `recommendation_stat` int DEFAULT NULL,
  `recommendation_date` datetime DEFAULT NULL,
  `cancel_date` datetime DEFAULT NULL,
  `approval` text,
  `approval_stat` int DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `pcar_driver_chklist` text,
  `pcar_odo_start` varchar(6) DEFAULT NULL,
  `pcar_odo_end` varchar(6) DEFAULT NULL,
  `pcar_condition` text,
  `pcar_condition_rem` text,
  `pcar_driver_upload` text,
  `pcar_retdate` datetime DEFAULT NULL,
  `tng_id` int DEFAULT NULL,
  `fleetcard_id` int DEFAULT NULL,
  `tng_usage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'TnG Balance amount',
  `pcar_stat` varchar(10) DEFAULT NULL,
  `pcar_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pcar_email` varchar(100) DEFAULT NULL COMMENT 'to be removed',
  `pcar_timefr` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_empname` varchar(100) DEFAULT NULL COMMENT 'to be removed',
  `pcar_timeto` time DEFAULT NULL COMMENT 'to be removed',
  `pcar_type2` varchar(50) DEFAULT NULL COMMENT 'to be removed',
  `pcar_cancel` varchar(10) DEFAULT NULL,
  `pcar_canrem` text,
  `cancel_by` varchar(50) DEFAULT NULL,
  `pcar_poolcar` varchar(10) DEFAULT NULL COMMENT 'replaced with vehicle_id',
  `pcar_vPIC` varchar(100) DEFAULT NULL COMMENT 'not used',
  `pcar_driver2` varchar(100) DEFAULT NULL COMMENT 'if drivers checked',
  `pcar_aPIC` varchar(100) DEFAULT NULL COMMENT 'to be removed',
  `pcar_sPIC` varchar(100) DEFAULT NULL COMMENT 'to be removed',
  `pcar_sDate` date DEFAULT NULL,
  `pcar_aDate` date DEFAULT NULL,
  `pcar_vDate` date DEFAULT NULL,
  `pcar_rettime` time DEFAULT NULL COMMENT 'to be removed',
  PRIMARY KEY (`pcar_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_insurance` (
  `rt_id` int NOT NULL AUTO_INCREMENT,
  `insurance_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `register_number` varchar(20) DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `insurer` text,
  `ins_policy` text,
  `ins_exp` date DEFAULT NULL,
  `ins_upload` text,
  `rt_exp` date DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`rt_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helpdesk` (
  `helpdesk_id` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `ticket_no` varchar(50) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `module_id` int DEFAULT NULL,
  `submodule_id` int DEFAULT NULL,
  `issue_details` text,
  `supp_upload` text,
  `priority_level` varchar(50) DEFAULT NULL COMMENT 'Low; Medium; High',
  `minor_bugs` int DEFAULT NULL,
  `major_bugs` int DEFAULT NULL,
  `new_dev` int DEFAULT NULL,
  `remarks_by_pic` text,
  `expected_date_resolved` date DEFAULT NULL,
  `date_resolved` date DEFAULT NULL,
  `update_by` varchar(6) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` int DEFAULT NULL,
  `approved_by` varchar(6) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status_data` int DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`helpdesk_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support` (
  `supp_id` int NOT NULL AUTO_INCREMENT,
  `supp_date` datetime DEFAULT NULL,
  `supp_empid` varchar(6) DEFAULT NULL,
  `ctc_m` varchar(12) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `cat_pic` text,
  `cat_id` int DEFAULT NULL,
  `svc_id` int DEFAULT NULL,
  `sn` text,
  `supp_det` text,
  `supp_upload` text,
  `supp_stat` int DEFAULT NULL,
  PRIMARY KEY (`supp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_cat` (
  `cat_id` int NOT NULL AUTO_INCREMENT,
  `cat_pic` text,
  `cat_desc` text,
  `dept_id` int DEFAULT NULL,
  PRIMARY KEY (`cat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_det` (
  `sd_id` int NOT NULL AUTO_INCREMENT,
  `supp_id` int DEFAULT NULL,
  `sd_date` datetime DEFAULT NULL,
  `sd_action` text,
  `sd_method` int DEFAULT NULL,
  `sd_stat` int DEFAULT NULL,
  PRIMARY KEY (`sd_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_svc` (
  `svc_id` int NOT NULL AUTO_INCREMENT,
  `cat_id` int DEFAULT NULL,
  `svc_name` text,
  `svc_desc` text,
  `svc_sla` int DEFAULT NULL,
  `sla_desc` text,
  PRIMARY KEY (`svc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `svctype` (
  `svcTypeId` int NOT NULL AUTO_INCREMENT,
  `svcType` varchar(50) DEFAULT NULL,
  `svcOpt` int DEFAULT NULL,
  `group_desc` text,
  `orders` int DEFAULT NULL,
  `appearance` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`svcTypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `touchngo` (
  `tng_id` int NOT NULL AUTO_INCREMENT,
  `tng_sn` text NOT NULL,
  `tng_exp` date NOT NULL,
  `tng_tagname` text NOT NULL,
  `tng_bal` decimal(10,2) NOT NULL,
  `topup_date` date DEFAULT NULL,
  `topup_amt` decimal(10,2) NOT NULL,
  `pcar_driver` text,
  `pcar_poolcar` text,
  `pcar_datefr` date DEFAULT NULL,
  `tng_usage` decimal(10,2) NOT NULL,
  `tng_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tng_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `touchngo_det` (
  `tngd_id` int NOT NULL AUTO_INCREMENT,
  `tng_id` int DEFAULT NULL,
  `topup_date` date DEFAULT NULL,
  `topup_amt` decimal(10,2) NOT NULL,
  `topup_bill` text,
  `pcar_id` int DEFAULT NULL,
  `pcar_driver` text,
  `pcar_poolcar` text,
  `vehicle_id` int DEFAULT NULL,
  `pcar_datefr` date DEFAULT NULL,
  `tng_usage` decimal(10,2) NOT NULL,
  `usage_stat` text COMMENT 'if poolcar cancelled',
  PRIMARY KEY (`tngd_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `insurance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `insurer` varchar(100) DEFAULT NULL,
  `policy` varchar(100) DEFAULT NULL,
  `expiry` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adms_module` (
  `module_id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(50) DEFAULT NULL,
  `status_data` int DEFAULT NULL,
  PRIMARY KEY (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adms_submodule` (
  `submodule_id` int NOT NULL AUTO_INCREMENT,
  `module_id` int DEFAULT NULL,
  `submodule` varchar(50) DEFAULT NULL,
  `status_data` int DEFAULT NULL,
  PRIMARY KEY (`submodule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_aduan_she` (
  `id_aduan` int NOT NULL AUTO_INCREMENT,
  `ramco_id` varchar(6) DEFAULT NULL,
  `no_tel_pengadu` varchar(50) DEFAULT NULL,
  `jenis_aduan_kelakuan` int DEFAULT NULL,
  `jenis_aduan_keadaan` int DEFAULT NULL,
  `tarikh_kejadian` date DEFAULT NULL,
  `waktu_kejadian` time DEFAULT NULL,
  `lokasi_kejadian` varchar(100) DEFAULT NULL,
  `lokasi_latitude` float(10,6) DEFAULT NULL,
  `lokasi_longitude` float(10,6) DEFAULT NULL,
  `keterangan_aduan` text,
  `lampiran_aduan` varchar(100) DEFAULT NULL,
  `tarikh_aduan_dihantar` datetime DEFAULT NULL,
  `komen_seksyen_kkas` text,
  `jabatan_lain_yatidak` int DEFAULT NULL,
  `id_jabatan_lain` int DEFAULT NULL,
  `jkkas_yatidak` int DEFAULT NULL,
  `lain_lain_yatidak` int DEFAULT NULL,
  `tindakan_lain_komen` text,
  `status_pengesahan` int DEFAULT NULL,
  `tarikh_disahkan` datetime DEFAULT NULL,
  `disahkan_oleh` varchar(50) DEFAULT NULL,
  `komen_tolak_aduan` text,
  `tarikh_aduan_diselesaikan` date DEFAULT NULL,
  `langkah_pencegahan` text,
  `disahkan_oleh_jbtn_lain` varchar(50) DEFAULT NULL,
  `status_pengesahan_jbtn_lain` int DEFAULT NULL,
  `tarikh_disahkan_jabatan_lain` datetime DEFAULT NULL,
  `status_penerimaan` int DEFAULT NULL,
  `diterima_oleh` varchar(50) DEFAULT NULL,
  `tarikh_terima` datetime DEFAULT NULL,
  `aduan_file` varchar(255) DEFAULT NULL,
  `aduan_dt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aduan`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
