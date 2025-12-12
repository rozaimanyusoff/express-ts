export interface Role {
    id: number;
    roleName: string;
    description: string;
    isActive: boolean;
}

export interface RoleModulePermission {
    id: number;
    roleId: number;
    moduleId: number;
    isCreate: boolean;
    isRead: boolean;
    isUpdate: boolean;
    isDelete: boolean;
}