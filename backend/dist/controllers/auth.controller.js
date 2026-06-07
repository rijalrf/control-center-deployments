"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const crypto_1 = __importDefault(require("crypto"));
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === 'production',
    sameSite: (env_1.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                res.status(400).json({ error: 'Username and password are required' });
                return;
            }
            const user = await User_1.User.findOne({ where: { login: username } });
            if (!user) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }
            const hashedPassword = crypto_1.default.createHash('sha256').update(password).digest('hex');
            if (user.password !== hashedPassword) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, login: user.login }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
            res.cookie('ccd_token', token, COOKIE_OPTIONS);
            res.json({
                message: 'Logged in successfully',
                user: {
                    id: user.id,
                    github_id: user.github_id,
                    login: user.login,
                    name: user.name,
                    email: user.email,
                    avatar_url: user.avatar_url,
                    created_at: user.created_at
                }
            });
        }
        catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    }
    static getMe(req, res) {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id, github_id, login, name, email, avatar_url, created_at } = req.user;
        res.json({ id, github_id, login, name, email, avatar_url, created_at });
    }
    static logout(_req, res) {
        res.clearCookie('ccd_token', COOKIE_OPTIONS);
        res.json({ message: 'Logged out successfully' });
    }
}
exports.AuthController = AuthController;
