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
        const token = req.cookies?.ccd_token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await User_1.User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        req.user = user.toJSON();
        next();
    }
    catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
        next(err);
    }
};
exports.authMiddleware = authMiddleware;
