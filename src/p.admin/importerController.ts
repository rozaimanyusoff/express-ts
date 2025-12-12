import { Request, Response } from 'express';

import * as importerModel from './importerModel';

export const importTempTable = async (req: Request, res: Response) => {
  const { data, headers, tableName } = req.body;
  if (!tableName || !Array.isArray(headers) || !Array.isArray(data)) {
    return res.status(400).json({ message: 'Invalid payload', status: 'error' });
  }
  try {
    const result = await importerModel.importTempTable(tableName, headers, data);
    res.json({ message: result.message, rows: result.rows, status: 'success', table: result.table });
  } catch (err: any) {
    res.status(500).json({ message: err.message, status: 'error' });
  }
};

export const getTempTables = async (req: Request, res: Response) => {
  try {
    const tables = await importerModel.getTempTables();
    if (!tables.length) {
      return res.json({ data: [], message: 'No tables found', status: 'success' });
    }
    // For each table, get columns and format as requested
    const result = [];
    for (const tableName of tables) {
      const columnsRaw = await importerModel.getTempTableColumns(tableName);
      // Ensure columnsRaw is an array of RowDataPacket
      const columnsArr = Array.isArray(columnsRaw) ? columnsRaw : [];
      const columns = columnsArr.map((col: any) => {
        let type = col.COLUMN_TYPE;
        if (typeof type !== 'string') type = '';
        if (/^int/i.test(type)) type = 'integer';
        else if (/^varchar/i.test(type)) type = type.replace('varchar', 'varchar');
        else if (/^timestamp/i.test(type)) type = 'timestamp';
        // Build constraints array
        const constraints = [];
        if (col.COLUMN_KEY === 'PRI') constraints.push('PRIMARY KEY');
        if (col.COLUMN_KEY === 'UNI') constraints.push('UNIQUE');
        if (col.IS_NULLABLE === 'NO') constraints.push('NOT NULL');
        if (col.EXTRA) constraints.push(String(col.EXTRA).toUpperCase());
        if (col.COLUMN_DEFAULT !== undefined && col.COLUMN_DEFAULT !== null) {
          constraints.push(`DEFAULT ${col.COLUMN_DEFAULT}`);
        }
        return {
          constraints,
          name: col.COLUMN_NAME,
          type
        };
      });
      result.push({ columns, table_name: tableName });
    }
    // If only one table, return as object, else as array
    const data = result.length === 1 ? result[0] : result;
    res.json({ data, message: 'Data processed successfully', status: 'success' });
  } catch (err: any) {
    res.status(500).json({ message: err.message, status: 'error' });
  }
};

