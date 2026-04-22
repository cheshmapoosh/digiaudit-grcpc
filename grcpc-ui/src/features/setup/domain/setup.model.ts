export interface SetupStatus {
    initialized: boolean;
}

export interface InitializeSystemRequest {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    mobile?: string;
    email?: string;
}
