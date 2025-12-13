CREATE TABLE IF NOT EXISTS `compliance`.`computer_assessment` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- Assessment metadata
  `assessment_year` VARCHAR(4) NULL COMMENT 'e.g., 2024',
  `assessment_date` DATE NULL COMMENT 'Date of assessment',
  `technician` VARCHAR(255) NULL COMMENT 'Technician ID or username',
  `overall_score` INT NULL COMMENT '0-5 score for overall health',
  `remarks` LONGTEXT NULL COMMENT 'General remarks and summarization',
  
  -- Asset reference
  `asset_id` INT NULL COMMENT 'Reference to asset',
  `register_number` VARCHAR(255) NULL COMMENT 'Asset register number',
  `category` VARCHAR(255) NULL COMMENT 'Asset category (laptop, desktop, etc.)',
  `brand` VARCHAR(255) NULL COMMENT 'Brand name (Dell, HP, etc.)',
  `model` VARCHAR(255) NULL COMMENT 'Model name',
  `purchase_date` DATE NULL COMMENT 'Date of purchase',
  
  -- Asset ownership
  `costcenter_id` INT NULL COMMENT 'Cost center ID',
  `department_id` INT NULL COMMENT 'Department ID',
  `location_id` INT NULL COMMENT 'Location ID',
  `ramco_id` VARCHAR(255) NULL COMMENT 'Employee RAMCO ID (owner)',
  
  -- OS specifications
  `os_name` VARCHAR(255) NULL COMMENT 'e.g., Windows, macOS, Linux',
  `os_version` VARCHAR(255) NULL COMMENT 'e.g., 11 Pro, Sonoma',
  `os_patch_status` VARCHAR(255) NULL COMMENT 'Updated, Pending, etc.',
  
  -- CPU specifications
  `cpu_manufacturer` VARCHAR(255) NULL COMMENT 'e.g., Intel, AMD',
  `cpu_model` VARCHAR(255) NULL COMMENT 'e.g., i5-1340P',
  `cpu_generation` VARCHAR(255) NULL COMMENT 'e.g., 13th Gen',
  
  -- Memory specifications
  `memory_manufacturer` VARCHAR(255) NULL COMMENT 'e.g., Samsung, Corsair',
  `memory_type` VARCHAR(255) NULL COMMENT 'e.g., DDR5, DDR4',
  `memory_size_gb` INT NULL COMMENT 'Size in GB (8, 16, 32, etc.)',
  
  -- Storage specifications
  `storage_manufacturer` VARCHAR(255) NULL COMMENT 'e.g., Samsung, WD',
  `storage_type` VARCHAR(255) NULL COMMENT 'e.g., SSD NVMe, HDD',
  `storage_size_gb` INT NULL COMMENT 'Size in GB',
  
  -- Graphics specifications
  `graphics_type` VARCHAR(255) NULL COMMENT 'Integrated, Dedicated',
  `graphics_manufacturer` VARCHAR(255) NULL COMMENT 'e.g., Intel, NVIDIA, AMD',
  `graphics_specs` VARCHAR(255) NULL COMMENT 'e.g., Iris Xe, RTX 4090',
  
  -- Display specifications
  `display_manufacturer` VARCHAR(255) NULL COMMENT 'e.g., LG, Dell',
  `display_size` DECIMAL(4, 2) NULL COMMENT 'Size in inches',
  `display_resolution` VARCHAR(255) NULL COMMENT 'e.g., 1920x1080, 2560x1600',
  `display_form_factor` VARCHAR(255) NULL COMMENT 'Standard, Ultrawide, etc.',
  `display_interfaces` JSON NULL COMMENT 'Array of display interfaces: ["HDMI", "USB-C", "DisplayPort"]',
  
  -- Ports
  `ports_usb_a` INT NULL DEFAULT 0 COMMENT 'Number of USB-A ports',
  `ports_usb_c` INT NULL DEFAULT 0 COMMENT 'Number of USB-C ports',
  `ports_thunderbolt` INT NULL DEFAULT 0 COMMENT 'Number of Thunderbolt ports',
  `ports_ethernet` INT NULL DEFAULT 0 COMMENT 'Number of Ethernet ports',
  `ports_hdmi` INT NULL DEFAULT 0 COMMENT 'Number of HDMI ports',
  `ports_displayport` INT NULL DEFAULT 0 COMMENT 'Number of DisplayPort ports',
  `ports_vga` INT NULL DEFAULT 0 COMMENT 'Number of VGA ports',
  `ports_sdcard` INT NULL DEFAULT 0 COMMENT 'Number of SD Card readers',
  `ports_audiojack` INT NULL DEFAULT 0 COMMENT 'Number of audio jack ports',
  
  -- Battery & Adapter
  `battery_equipped` BOOLEAN NULL COMMENT 'Has internal battery',
  `battery_capacity` VARCHAR(255) NULL COMMENT 'e.g., 56Wh, 80Wh',
  `adapter_equipped` BOOLEAN NULL COMMENT 'Has power adapter',
  `adapter_output` VARCHAR(255) NULL COMMENT 'e.g., 65W, 140W',
  
  -- Security & VPN
  `av_installed` VARCHAR(255) NULL COMMENT 'Installed, Not installed, etc.',
  `av_vendor` VARCHAR(255) NULL COMMENT 'e.g., ESET, Norton, Windows Defender',
  `av_status` VARCHAR(255) NULL COMMENT 'Active, Inactive, etc.',
  `av_license` VARCHAR(255) NULL COMMENT 'Valid, Expired, etc.',
  `vpn_installed` VARCHAR(255) NULL COMMENT 'Installed, Not installed, etc.',
  `vpn_setup_type` VARCHAR(255) NULL COMMENT 'Type of VPN setup',
  `vpn_username` VARCHAR(255) NULL COMMENT 'VPN username if applicable',
  
  -- Software
  `installed_software` LONGTEXT NULL COMMENT 'Comma-separated or detailed list of installed software',
  
  -- Metadata
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  KEY `idx_asset_id` (`asset_id`),
  KEY `idx_assessment_year` (`assessment_year`),
  KEY `idx_technician` (`technician`),
  KEY `idx_ramco_id` (`ramco_id`),
  KEY `idx_costcenter_id` (`costcenter_id`),
  KEY `idx_department_id` (`department_id`),
  KEY `idx_location_id` (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Computer/Laptop IT Health Assessment';
