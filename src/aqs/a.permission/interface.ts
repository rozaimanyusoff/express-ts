export interface Permission {
    id: number;
    isActive: boolean;
    isDelete: boolean;
    isRead: boolean;
    isUpdate: boolean;
    isWrite: boolean;
    moduleId: number;
    roleId: number;
}