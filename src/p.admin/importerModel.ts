import {pool} from "../utils/db";

// TEMP TABLE IMPORTER
export const importTempTable = async (tableName: string, headers: string[], data: any[][]) => {
  // Sanitize table and column names (allow only alphanumeric and underscore)
  let safeHeaders = headers.map(h => h.replace(/[^a-zA-Z0-9_]/g, ""));
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, "");
  if (!safeTable || safeHeaders.length === 0) throw new Error("Invalid table or headers");

  // Check if table already exists
  const [existing] = await pool.query(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'temp' AND table_name = ?`,
    [safeTable]
  );
  const existsCount = Array.isArray(existing) && existing.length > 0 && (existing[0] as any).count;
  if (existsCount > 0) {
    throw new Error(`Table '${safeTable}' already exists in temp database.`);
  }

  // If first column is not 'id' (case-insensitive), add it as auto-increment primary key
  let addId = false;
  if (safeHeaders[0].toLowerCase() !== 'id') {
    addId = true;
    safeHeaders = ['id', ...safeHeaders];
    // Add id value for each row (auto-increment, so null)
    data = data.map(row => [null, ...row]);
  }

  // Build CREATE TABLE SQL
  let columnsDef = safeHeaders.map(h => `\`${h}\` TEXT`).join(", ");
  if (addId) {
    columnsDef = `id INT PRIMARY KEY AUTO_INCREMENT, ` + safeHeaders.slice(1).map(h => `\`${h}\` TEXT`).join(", ");
  }
  const createTableSQL = `CREATE TABLE IF NOT EXISTS temp.\`${safeTable}\` (${columnsDef})`;
  await pool.query(createTableSQL);

  // Build INSERT SQL (skip id if auto-increment)
  let insertHeaders = safeHeaders;
  let insertSQL = "";
  if (addId) {
    insertHeaders = safeHeaders.slice(1); // skip id
  }
  if (insertHeaders.length === 0) {
    throw new Error("No columns to insert");
  }
  const insertPlaceholders = insertHeaders.map(() => "?").join(", ");
  insertSQL = `INSERT INTO temp.\`${safeTable}\` (${insertHeaders.map(h => `\`${h}\``).join(", ")}) VALUES (${insertPlaceholders})`;
  for (const row of data) {
    // Ensure values length matches insertHeaders length
    const values = addId ? row.slice(1, insertHeaders.length + 1) : row.slice(0, insertHeaders.length);
    if (values.length !== insertHeaders.length) {
      throw new Error(`Row length (${values.length}) does not match columns (${insertHeaders.length})`);
    }
    await pool.query(insertSQL, values);
  }
  return { message: "Table created and data inserted", rows: data.length, table: safeTable };
};

// Get all table names in 'temp' schema
export const getTempTables = async () => {
  const [tables] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'temp'`
  );
  return Array.isArray(tables) ? tables.map((t: any) => t.table_name) : [];
};

// Get columns and properties for a given table in 'temp' schema
export const getTempTableColumns = async (table: string) => {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema = 'temp' AND table_name = ?`,
    [table]
  );
  return Array.isArray(columns) ? columns : [];
};
