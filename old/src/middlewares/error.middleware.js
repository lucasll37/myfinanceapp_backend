"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const express_1 = require("express");
const errors_1 = require("@/utils/errors");
const client_1 = require("@prisma/client");
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Erro customizado da aplicação
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
        });
    }
    // Erros do Prisma
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                return res.status(409).json({
                    success: false,
                    message: 'Registro duplicado',
                });
            case 'P2025':
                return res.status(404).json({
                    success: false,
                    message: 'Registro não encontrado',
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Erro no banco de dados',
                });
        }
    }
    // Erro genérico
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map