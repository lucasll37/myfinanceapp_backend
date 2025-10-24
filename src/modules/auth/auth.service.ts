import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { RegisterInput, LoginInput } from './auth.schema';

export class AuthService {
  async register(data: RegisterInput) {
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email já cadastrado', 400);
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Criar usuário
    const user = await prisma.user.create({
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
    await prisma.userPreferences.create({
      data: { userId: user.id },
    });

    // Criar subscription free
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'free',
      },
    });

    // Gerar token
    const token = this.generateToken(user.id);

    return { user, token };
  }

  async login(data: LoginInput) {
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new AppError('Usuário inativo', 403);
    }

    // Gerar token
    const token = this.generateToken(user.id);

    // Remover senha do retorno
    const { passwordHash, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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
      throw new AppError('Usuário não encontrado', 404);
    }

    return user;
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });
  }
}