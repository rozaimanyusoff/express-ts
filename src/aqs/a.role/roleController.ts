import { Request, Response } from 'express';
import * as roleModel from './roleModel';
import * as roleModulePermissionModel from '../a.permission/permissionModel';
import * as moduleModel from '../a.module/moduleModel';
import { Permission } from '../a.permission/interface';

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
            success: true,
            message: 'Roles fetched successfully',
            data: rolesWithPermissions
        }); 

    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch roles', error: (error as Error).message });
    }
}

export const addRole = async (req: Request, res: Response): Promise<Response> => {
    const { roleName, description, permissions } = req.body;

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
                isRead: permList.includes('read'),
                isWrite: permList.includes('write'),
                isUpdate: permList.includes('update'),
                isDelete: permList.includes('delete')
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
            success: true,
            message: 'Role created successfully',
            data: newRole,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to create role', error: (error as Error).message });
    }
}

export const updateRole = async (req: Request, res: Response): Promise<Response> => {
    const roleId = parseInt(req.params.id, 10);
    const { roleName, description, permissions } = req.body;

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
                isRead: permList.includes('read'),
                isWrite: permList.includes('write'),
                isUpdate: permList.includes('update'),
                isDelete: permList.includes('delete')
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
            success: true,
            message: 'Role updated successfully',
            data: updatedRole
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update role', error: (error as Error).message });
    }
}

export const toggleRole = async (req: Request, res: Response): Promise<Response> => {
    const roleId = parseInt(req.params.id, 10);

    try {
        const toggledRole = await roleModel.toggleRole(roleId);
        
        return res.status(200).json({
            success: true,
            message: 'Role toggled successfully',
            data: toggledRole
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to toggle role', error: (error as Error).message });
    }
}