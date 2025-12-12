export interface Auth {
    createdAt: Date;
    id: number;
    isActive: boolean;
    passwordHash: string;
    roleId: number;
    salt: string;
    updatedAt: Date;
    username: string;
    uuid: string;
}
