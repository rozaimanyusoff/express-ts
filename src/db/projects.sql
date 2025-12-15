-- Projects module schema
-- Using MySQL 8.0

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assignment_type ENUM('task','support') NOT NULL,
  status ENUM('not_started','in_progress','completed','at_risk') NOT NULL DEFAULT 'not_started',
  start_date DATE NULL,
  due_date DATE NULL,
  percent_complete TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_percent CHECK (percent_complete BETWEEN 0 AND 100),
  CONSTRAINT chk_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

-- Optional: computed duration; MySQL lacks true computed persisted from two nullable dates; compute on SELECT using DATEDIFF.

CREATE TABLE IF NOT EXISTS project_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  assignor_id INT NOT NULL,
  assignee_id INT NOT NULL,
  role ENUM('primary','collaborator','observer') NOT NULL DEFAULT 'collaborator',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assignment (project_id, assignee_id, role),
  INDEX idx_project (project_id),
  CONSTRAINT fk_pa_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_date DATE NULL,
  status ENUM('not_started','in_progress','completed','at_risk') NOT NULL DEFAULT 'not_started',
  description TEXT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pm_project (project_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_progress_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  logged_by_id INT NOT NULL,
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE()),
  percent_complete TINYINT UNSIGNED NULL,
  remaining_effort_days INT NULL,
  status_override ENUM('not_started','in_progress','completed','at_risk') NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ppl_project_date (project_id, log_date),
  CONSTRAINT chk_ppl_percent CHECK (percent_complete IS NULL OR (percent_complete BETWEEN 0 AND 100)),
  CONSTRAINT fk_ppl_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color_hex CHAR(7) NOT NULL DEFAULT '#10b981'
);

CREATE TABLE IF NOT EXISTS project_tag_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  tag_id INT NOT NULL,
  UNIQUE KEY uq_tag_link (project_id, tag_id),
  CONSTRAINT fk_ptl_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ptl_tag FOREIGN KEY (tag_id) REFERENCES project_tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_scopes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NOT NULL DEFAULT 'not_started',
  priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  assignee VARCHAR(50) NULL,
  task_groups TEXT NULL,
  planned_start_date DATE NULL,
  planned_end_date DATE NULL,
  actual_start_date DATE NULL,
  actual_end_date DATE NULL,
  planned_mandays INT NULL,
  actual_mandays INT NULL,
  attachment TEXT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_progress CHECK (progress BETWEEN 0 AND 100),
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  INDEX idx_assignee (assignee),
  INDEX idx_order (project_id, order_index),
  CONSTRAINT fk_ps_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_scope_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scope_id INT NOT NULL,
  project_id INT NOT NULL,
  activity_type ENUM('status_change','review_comment','progress_update','assignee_change','attachment_added','priority_change') NOT NULL,
  old_status ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NULL,
  new_status ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  reason TEXT NULL,
  comments TEXT NULL,
  changed_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scope (scope_id),
  INDEX idx_project (project_id),
  INDEX idx_type (activity_type),
  INDEX idx_created (created_at),
  INDEX idx_changed_by (changed_by),
  CONSTRAINT fk_activity_scope FOREIGN KEY (scope_id) REFERENCES project_scopes(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_support_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end DATETIME NOT NULL,
  coverage_hours DECIMAL(5,2) GENERATED ALWAYS AS (TIMESTAMPDIFF(MINUTE, shift_start, shift_end) / 60) VIRTUAL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pss_project (project_id),
  CONSTRAINT fk_pss_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Views
CREATE OR REPLACE VIEW view_project_health AS
SELECT p.id,
       p.code,
       p.name,
       p.status,
       p.assignment_type,
       p.start_date,
       p.due_date,
       DATEDIFF(p.due_date, CURRENT_DATE()) AS days_remaining,
       p.percent_complete,
       (
         SELECT CASE WHEN COUNT(*) >= 2 THEN
            CASE
              WHEN MAX(CASE WHEN x.rn = 2 THEN x.percent_complete END) IS NULL THEN NULL
              WHEN MAX(CASE WHEN x.rn = 1 THEN x.percent_complete END) > MAX(CASE WHEN x.rn = 2 THEN x.percent_complete END) THEN 'down'
              WHEN MAX(CASE WHEN x.rn = 1 THEN x.percent_complete END) < MAX(CASE WHEN x.rn = 2 THEN x.percent_complete END) THEN 'up'
              ELSE 'flat'
            END
          ELSE NULL END
         FROM (
           SELECT l.percent_complete,
                  ROW_NUMBER() OVER (PARTITION BY l.project_id ORDER BY l.log_date DESC, l.id DESC) rn
           FROM project_progress_logs l WHERE l.project_id = p.id
         ) x
       ) AS trend
FROM projects p;

CREATE OR REPLACE VIEW view_project_burndown_daily AS
SELECT l.project_id,
       d.dt AS snapshot_date,
       l.percent_complete,
       l.remaining_effort_days
FROM (
  SELECT DISTINCT log_date AS dt FROM project_progress_logs
) d
JOIN project_progress_logs l
  ON l.log_date = d.dt;

-- Optional: simple audit table & triggers (basic example)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  action ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  row_id BIGINT NULL,
  payload JSON NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER $$
CREATE TRIGGER trg_projects_ai AFTER INSERT ON projects FOR EACH ROW
BEGIN
  INSERT INTO audit_log(table_name, action, row_id, payload) VALUES('projects','INSERT', NEW.id, JSON_OBJECT('code', NEW.code, 'name', NEW.name));
END$$
CREATE TRIGGER trg_projects_au AFTER UPDATE ON projects FOR EACH ROW
BEGIN
  INSERT INTO audit_log(table_name, action, row_id, payload) VALUES('projects','UPDATE', NEW.id, JSON_OBJECT('code', NEW.code, 'name', NEW.name));
END$$
DELIMITER ;
