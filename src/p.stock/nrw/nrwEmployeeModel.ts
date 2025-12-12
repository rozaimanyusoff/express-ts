import { RowDataPacket } from "mysql2";

import { pool } from "../../utils/db";

// --- DB & TABLE DECLARATIONS ---
const dbName = 'web_stock';
const employeesTable = `${dbName}.employees`;
const levelsTable = `${dbName}.levels`;
const departmentsTable = `${dbName}.departments`;
const costcentersTable = `${dbName}.costcenters`;
const locationsTable = `${dbName}.locations`;

// ---- EMPLOYEES ----
export const createEmployee = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${employeesTable} SET ?`, [data]);
    return result;
};

export const getEmployees = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${employeesTable} ORDER BY id DESC`);
    return rows;
};

export const getEmployeeById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${employeesTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getEmployeesByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${employeesTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateEmployee = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${employeesTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteEmployee = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${employeesTable} WHERE id = ?`, [id]);
    return result;
};

// ---- LEVELS ----
export const createLevel = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${levelsTable} SET ?`, [data]);
    return result;
};

export const getLevels = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${levelsTable} ORDER BY id DESC`);
    return rows;
};

export const getLevelById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${levelsTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getLevelsByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${levelsTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateLevel = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${levelsTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteLevel = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${levelsTable} WHERE id = ?`, [id]);
    return result;
};

// ---- DEPARTMENTS ----
export const createDepartment = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${departmentsTable} SET ?`, [data]);
    return result;
};

export const getDepartments = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${departmentsTable} ORDER BY id DESC`);
    return rows;
};

export const getDepartmentById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${departmentsTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getDepartmentsByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${departmentsTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateDepartment = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${departmentsTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteDepartment = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${departmentsTable} WHERE id = ?`, [id]);
    return result;
};

// ---- COSTCENTERS ----
export const createCostcenter = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${costcentersTable} SET ?`, [data]);
    return result;
};

export const getCostcenters = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${costcentersTable} ORDER BY id DESC`);
    return rows;
};

export const getCostcenterById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${costcentersTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getCostcentersByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${costcentersTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateCostcenter = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${costcentersTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteCostcenter = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${costcentersTable} WHERE id = ?`, [id]);
    return result;
};

// ---- LOCATIONS ----
export const createLocation = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${locationsTable} SET ?`, [data]);
    return result;
};

export const getLocations = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${locationsTable} ORDER BY id DESC`);
    return rows;
};

export const getLocationById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${locationsTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getLocationsByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${locationsTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateLocation = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${locationsTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteLocation = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${locationsTable} WHERE id = ?`, [id]);
    return result;
};
