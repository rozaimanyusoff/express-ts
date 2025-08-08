-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL COMMENT 'CAPEX, OPEX, SERVICES',
    costcenter VARCHAR(50) NOT NULL COMMENT 'Cost center code',
    pic VARCHAR(200) COMMENT 'Person in charge',
    item_type VARCHAR(100) COMMENT 'Type/category of item',
    items TEXT NOT NULL COMMENT 'Item description',
    supplier VARCHAR(200) COMMENT 'Supplier name',
    brand VARCHAR(100) COMMENT 'Brand name',
    qty INT NOT NULL DEFAULT 1 COMMENT 'Quantity',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Unit price',
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total price (qty * unit_price)',
    pr_date DATE COMMENT 'Purchase Request date',
    pr_no VARCHAR(100) COMMENT 'Purchase Request number',
    po_date DATE COMMENT 'Purchase Order date',
    po_no VARCHAR(100) COMMENT 'Purchase Order number',
    do_date DATE COMMENT 'Delivery Order date',
    do_no VARCHAR(100) COMMENT 'Delivery Order number',
    inv_date DATE COMMENT 'Invoice date',
    inv_no VARCHAR(100) COMMENT 'Invoice number',
    grn_date DATE COMMENT 'Goods Receipt Note date',
    grn_no VARCHAR(100) COMMENT 'Goods Receipt Note number',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_request_type (request_type),
    INDEX idx_costcenter (costcenter),
    INDEX idx_supplier (supplier),
    INDEX idx_pr_no (pr_no),
    INDEX idx_po_no (po_no),
    INDEX idx_pr_date (pr_date),
    INDEX idx_po_date (po_date),
    INDEX idx_grn_date (grn_date),
    
    -- Unique constraint on PR number if not null
    UNIQUE KEY unique_pr_no (pr_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase records table';

-- Insert sample data for testing
INSERT INTO purchases (
    request_type, costcenter, pic, item_type, items, supplier, brand, 
    qty, unit_price, total_price, pr_date, pr_no, po_date, po_no, 
    do_date, do_no, inv_date, inv_no, grn_date, grn_no
) VALUES 
(
    'CAPEX', 'TC100', 'John Doe', 'Computer Hardware', 
    'HP PRO INTEL I3 MONITOR', 'FLOW ELITE ENGINEERING', 'HP',
    1, 1199.00, 1199.00, '2024-12-17', '10674', 
    '2024-12-14', '5458', '2024-11-14', 'FRE0100104',
    '2024-11-14', 'FE0100104', '2024-11-14', '7205'
),
(
    'OPEX', 'TC200', 'Jane Smith', 'Office Supplies', 
    'Printer Paper A4 Box', 'OFFICE MART SDN BHD', 'PaperOne',
    10, 25.50, 255.00, '2024-12-10', '10675', 
    '2024-12-12', '5459', NULL, NULL,
    NULL, NULL, NULL, NULL
),
(
    'SERVICES', 'TC150', 'Mike Johnson', 'Maintenance', 
    'Monthly Server Maintenance', 'TECH SUPPORT SOLUTIONS', NULL,
    1, 850.00, 850.00, '2024-12-05', '10676', 
    '2024-12-08', '5460', '2024-12-09', 'TSS001',
    '2024-12-09', 'TSS-INV-001', '2024-12-10', '7206'
);
