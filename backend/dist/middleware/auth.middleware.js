"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const env_1 = require("../config/env");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.ccd_token ||
            req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await User_1.User.findByPk(decoded.id);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        req.user = user.toJSON();
        next();
    }
    catch (err) {
        if (err instanceof Error &&
            (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }
        next(err);
    }
};
exports.authMiddleware = authMiddleware;
