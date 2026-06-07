"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const env_1 = require("../config/env");
const errorHandler = (err, _req, res, _next) => {
    console.error(`[ERROR] ${err.message}`, err.stack);
    if (err.oauthError) {
        console.error('[OAUTH ERROR DETAILS]', err.oauthError);
        if (err.oauthError.data) {
            console.error('[OAUTH ERROR DATA]', err.oauthError.data);
        }
    }
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        error: message,
        ...(env_1.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
