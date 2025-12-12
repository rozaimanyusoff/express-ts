export interface Permission {
    id: number;
    roleId: number;
    moduleId: number;
    isActive: boolean;
    isRead: boolean;
    isWrite: boolean;
    isUpdate: boolean;
    isDelete: boolean;
}