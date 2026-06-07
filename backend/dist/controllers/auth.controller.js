"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === 'production',
    sameSite: (env_1.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
class AuthController {
    static githubCallback(req, res) {
        if (!req.user) {
            return res.redirect(`${env_1.env.FRONTEND_URL}/login?error=auth_failed`);
        }
        const token = jsonwebtoken_1.default.sign({ id: req.user.id, login: req.user.login }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
        res.cookie('ccd_token', token, COOKIE_OPTIONS);
        res.redirect(`${env_1.env.FRONTEND_URL}/dashboard`);
    }
    static getMe(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id, github_id, login, name, email, avatar_url, created_at } = req.user;
        res.json({ id, github_id, login, name, email, avatar_url, created_at });
    }
    static logout(req, res) {
        res.clearCookie('ccd_token', COOKIE_OPTIONS);
        res.json({ message: 'Logged out successfully' });
    }
}
exports.AuthController = AuthController;
