export interface Role {
    description: string;
    id: number;
    isActive: boolean;
    roleName: string;
}

export interface RoleModulePermission {
    id: number;
    isCreate: boolean;
    isDelete: boolean;
    isRead: boolean;
    isUpdate: boolean;
    moduleId: number;
    roleId: number;
}