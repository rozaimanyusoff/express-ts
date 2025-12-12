import { Request, Response } from 'express';

import * as moduleModel from '../a.module/moduleModel';
import { Permission } from '../a.permission/interface';
import * as roleModulePermissionModel from '../a.permission/permissionModel';
import * as roleModel from './roleModel';

export const getAllRoles = async (req: Request, res: Response): Promise<Response> => {
    try {
        const [ roles, permissions ] = await Promise.all([
            roleModel.findAllRoles(),
            roleModulePermissionModel.findAllPermissions()
        ]);

        const rolesWithPermissions = roles.map(role => {
            const rolePermissions = permissions.filter(perm => perm.roleId === role.id);
            return {
                ...role,
                permissions: rolePermissions
            };
        });

        return res.status(200).json({
            data: rolesWithPermissions,
            message: 'Roles fetched successfully',
            success: true
        }); 

    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to fetch roles' });
    }
}

export const addRole = async (req: Request, res: Response): Promise<Response> => {
    const { description, permissions, roleName } = req.body;

    try {
        const [ newRole, modules ] = await Promise.all([
            roleModel.createRole(roleName, description),
            moduleModel.findAllModules()
        ]);

        const permissionMap = permissions as Record<string, any>;

        for (const module of modules) {
            const permsForModule = permissionMap[module.name];
            const permList: string[] = Array.isArray(permsForModule)
                ? permsForModule
                : (typeof permsForModule === 'string' ? permsForModule.split(',').map((s: string) => s.trim()) : []);

            const modulePerm = {
                isDelete: permList.includes('delete'),
                isRead: permList.includes('read'),
                isUpdate: permList.includes('update'),
                isWrite: permList.includes('write')
            };

            await roleModulePermissionModel.createPermission(
                newRole.id,
                parseInt(module.id),
                modulePerm.isRead,
                modulePerm.isWrite,
                modulePerm.isUpdate,
                modulePerm.isDelete
            );
        }
        
        return res.status(201).json({
            data: newRole,
            message: 'Role created successfully',
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to create role' });
    }
}

export const updateRole = async (req: Request, res: Response): Promise<Response> => {
    const roleId = parseInt(req.params.id, 10);
    const { description, permissions, roleName } = req.body;

    try {
        // const updatedRole = await roleModel.updateRole(roleId, roleName, description, permissions);
        
        const [ updatedRole, permission, modules ] = await Promise.all([
            roleModel.updateRole(roleId, roleName, description),
            roleModulePermissionModel.deletePermissionsByRoleId(roleId),
            moduleModel.findAllModules()
        ]);

        const permissionMap = permissions as Record<string, any>;

        for (const module of modules) {
            const permsForModule = permissionMap[module.name];
            const permList: string[] = Array.isArray(permsForModule)
                ? permsForModule
                : (typeof permsForModule === 'string' ? permsForModule.split(',').map((s: string) => s.trim()) : []);

            const modulePerm = {
                isDelete: permList.includes('delete'),
                isRead: permList.includes('read'),
                isUpdate: permList.includes('update'),
                isWrite: permList.includes('write')
            };

            await roleModulePermissionModel.createPermission(
                updatedRole.id,
                parseInt(module.id),
                modulePerm.isRead,
                modulePerm.isWrite,
                modulePerm.isUpdate,
                modulePerm.isDelete
            );
        }
        
        return res.status(200).json({
            data: updatedRole,
            message: 'Role updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update role' });
    }
}

export const toggleRole = async (req: Request, res: Response): Promise<Response> => {
    const roleId = parseInt(req.params.id, 10);

    try {
        const toggledRole = await roleModel.toggleRole(roleId);
        
        return res.status(200).json({
            data: toggledRole,
            message: 'Role toggled successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to toggle role' });
    }
}