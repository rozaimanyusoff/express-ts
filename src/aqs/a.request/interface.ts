export interface RequestAccess {
    approvalNote?: string;
    contactNo: string;
    createdAt: Date;
    department: string;
    email: string;
    employmentType: string;
    id: string;
    name: string;
    position: string;
    reasonAccess: string;
    reasonReject?: string;
    status: string;
    updatedAt: Date;
}