"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("@/config/prisma");
const errors_1 = require("@/utils/errors");
const auth_schema_1 = require("./auth.schema");
class AuthService {
    async register(data) {
        // Verificar se usuário já existe
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new errors_1.AppError('Email já cadastrado', 400);
        }
        // Hash da senha
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        // Criar usuário
        const user = await prisma_1.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                fullName: data.fullName,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                createdAt: true,
            },
        });
        // Criar preferências padrão
        await prisma_1.prisma.userPreferences.create({
            data: { userId: user.id },
        });
        // Criar subscription free
        await prisma_1.prisma.subscription.create({
            data: {
                userId: user.id,
                tier: 'free',
            },
        });
        // Gerar token
        const token = this.generateToken(user.id);
        return { user, token };
    }
    async login(data) {
        // Buscar usuário
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (!user) {
            throw new errors_1.AppError('Credenciais inválidas', 401);
        }
        // Verificar senha
        const isValidPassword = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isValidPassword) {
            throw new errors_1.AppError('Credenciais inválidas', 401);
        }
        // Verificar se usuário está ativo
        if (!user.isActive) {
            throw new errors_1.AppError('Usuário inativo', 403);
        }
        // Gerar token
        const token = this.generateToken(user.id);
        // Remover senha do retorno
        const { passwordHash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }
    async getProfile(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                emailVerified: true,
                isActive: true,
                createdAt: true,
                preferences: true,
                subscription: true,
            },
        });
        if (!user) {
            throw new errors_1.AppError('Usuário não encontrado', 404);
        }
        return user;
    }
    generateToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map