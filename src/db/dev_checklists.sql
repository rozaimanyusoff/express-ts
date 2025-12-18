-- Development Checklists Schema
-- For tracking and managing project development checklists

CREATE TABLE IF NOT EXISTS dev_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS scope_checklist_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  scope_id INT NOT NULL,
  checklist_id INT NOT NULL,
  remarks TEXT NULL,
  status INT NULL,
  created_by VARCHAR(10) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_scope (project_id, scope_id),
  INDEX idx_checklist (checklist_id),
  CONSTRAINT fk_scm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_scope FOREIGN KEY (scope_id) REFERENCES project_scopes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_checklist FOREIGN KEY (checklist_id) REFERENCES dev_checklists(id) ON DELETE CASCADE
);
