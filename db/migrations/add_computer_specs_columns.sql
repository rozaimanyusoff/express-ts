-- Add comprehensive computer hardware specification columns to 1_specs table
-- Supports 40+ hardware fields for computer assessments

ALTER TABLE `assets`.`1_specs` ADD COLUMN `os_name` varchar(50) DEFAULT NULL AFTER `os`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `os_version` varchar(50) DEFAULT NULL AFTER `os_name`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `os_patch_status` varchar(50) DEFAULT NULL AFTER `os_version`;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `cpu_manufacturer` varchar(50) DEFAULT NULL AFTER `cpu`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `cpu_model` varchar(100) DEFAULT NULL AFTER `cpu_manufacturer`;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `memory_manufacturer` varchar(50) DEFAULT NULL AFTER `memory`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `memory_type` varchar(50) DEFAULT NULL AFTER `memory_manufacturer`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `memory_size_gb` smallint DEFAULT NULL AFTER `memory_type`;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `storage_manufacturer` varchar(50) DEFAULT NULL AFTER `storage`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `storage_type` varchar(50) DEFAULT NULL AFTER `storage_manufacturer`;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `storage_size_gb` int DEFAULT NULL AFTER `storage_type`;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `graphics_type` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `graphics_manufacturer` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `graphics_specs` varchar(100) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `display_manufacturer` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `display_size` varchar(30) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `display_resolution` varchar(20) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `display_form_factor` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `display_interfaces` varchar(200) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_usb_a` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_usb_c` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_thunderbolt` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_ethernet` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_hdmi` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_displayport` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_vga` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_sdcard` tinyint DEFAULT 0;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `ports_audiojack` tinyint DEFAULT 0;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `battery_equipped` tinyint(1) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `battery_capacity` varchar(20) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `adapter_equipped` tinyint(1) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `adapter_output` varchar(20) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `av_installed` varchar(30) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `av_vendor` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `av_status` varchar(30) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `av_license` varchar(30) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `vpn_installed` varchar(30) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `vpn_setup_type` varchar(50) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `vpn_username` varchar(50) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `installed_software` text DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `office_account` varchar(200) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `attachment_1` varchar(255) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `attachment_2` varchar(255) DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `attachment_3` varchar(255) DEFAULT NULL;

ALTER TABLE `assets`.`1_specs` ADD COLUMN `assess_id` int DEFAULT NULL;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `assets`.`1_specs` ADD COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
