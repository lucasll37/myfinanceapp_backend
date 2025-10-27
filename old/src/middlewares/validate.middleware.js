"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const errors_1 = require("@/utils/errors");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                next(new errors_1.AppError('Erro de validação', 400, errors));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map