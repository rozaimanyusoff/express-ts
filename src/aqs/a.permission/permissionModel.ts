import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { Permission } from "./interface";

const permissionsTable = "role_module_permissions";

export const findAllPermissions = async (): Promise<Permission[]> => {
    try {
        const { rows } = await pgPool.query<Permission>(
            `SELECT * FROM auth.${permissionsTable};`);
        return rows.map((row: Permission) => ({
            id: row.id,
            isActive: row.isActive,
            isDelete: row.isDelete,
            isRead: row.isRead,
            isUpdate: row.isUpdate,
            isWrite: row.isWrite,
            moduleId: row.moduleId,
            roleId: row.roleId,
        }));
    } catch (error) {
        logger.error(`Database error in findAllPermissionsByRoleId: ${error}`);
        throw error;
    }
};

export const createPermission = async (roleId: number, moduleId: number, isRead: boolean, isWrite: boolean, isUpdate: boolean, isDelete: boolean): Promise<Permission> => {
    try {
        const { rows } = await pgPool.query<Permission>(
            `INSERT INTO auth.${permissionsTable} ("roleId", "moduleId", "isRead", "isWrite", "isUpdate", "isDelete") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [roleId, moduleId, isRead, isWrite, isUpdate, isDelete]
        );
        return rows[0];
    } catch (error) {
        logger.error(`Database error in createPermission: ${error}`);
        throw error;
    }
};

export const deletePermissionsByRoleId = async (roleId: number): Promise<void> => {
    try {
        await pgPool.query(
            `DELETE FROM auth.${permissionsTable} WHERE "roleId" = $1`,
            [roleId]
        );
    } catch (error) {
        logger.error(`Database error in deletePermissionsByRoleId: ${error}`);
        throw error;
    }
};