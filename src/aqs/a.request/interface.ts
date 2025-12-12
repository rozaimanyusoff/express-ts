export interface RequestAccess {
    id: string;
    name: string;
    email: string;
    contactNo: string;
    employmentType: string;
    department: string;
    position: string;
    reasonAccess: string;
    status: string;
    reasonReject?: string;
    approvalNote?: string;
    createdAt: Date;
    updatedAt: Date;
}