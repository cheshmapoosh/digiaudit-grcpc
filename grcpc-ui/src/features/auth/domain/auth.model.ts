export type AuthUser = {
    userId: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    rootUser: boolean;
    authorities: string[];
};

export type AuthMeResponse = {
    authenticated: boolean;
    userId: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    rootUser: boolean;
    authorities: string[];
};

export type LoginRequest = {
    username: string;
    password: string;
};
