import { RegisterInput, LoginInput } from './auth.schema';
export declare class AuthService {
    register(data: RegisterInput): Promise<{
        user: any;
        token: string;
    }>;
    login(data: LoginInput): Promise<{
        user: any;
        token: string;
    }>;
    getProfile(userId: string): Promise<any>;
    private generateToken;
}
//# sourceMappingURL=auth.service.d.ts.map