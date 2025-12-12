export interface Auth {
    id: number;
    uuid: string;
    username: string;
    passwordHash: string;
    salt: string;
    roleId: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
