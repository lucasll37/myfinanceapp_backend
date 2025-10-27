"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Email inválido'),
        password: zod_1.z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        fullName: zod_1.z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Email inválido'),
        password: zod_1.z.string().min(1, 'Senha é obrigatória'),
    }),
});
//# sourceMappingURL=auth.schema.js.map