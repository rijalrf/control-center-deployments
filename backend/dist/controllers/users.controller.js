"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = require("../models/User");
class UsersController {
    static async list(_req, res, next) {
        try {
            const users = await User_1.User.findAll({
                attributes: { exclude: ['password', 'access_token'] },
                order: [['login', 'ASC']],
            });
            res.json(users);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const { login, name, email, avatar_url, password, github_id } = req.body;
            if (!login || !password) {
                res.status(400).json({ error: 'Username (login) and password are required' });
                return;
            }
            const existingUser = await User_1.User.findOne({ where: { login } });
            if (existingUser) {
                res.status(400).json({ error: 'Username already exists' });
                return;
            }
            const hashedPassword = crypto_1.default.createHash('sha256').update(password).digest('hex');
            const resolvedGithubId = github_id || `local-${crypto_1.default.randomBytes(8).toString('hex')}`;
            const user = await User_1.User.create({
                github_id: resolvedGithubId,
                login,
                name: name || null,
                email: email || null,
                avatar_url: avatar_url || null,
                password: hashedPassword,
                access_token: null,
            });
            const responseUser = {
                id: user.id,
                github_id: user.github_id,
                login: user.login,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
                updated_at: user.updated_at,
            };
            res.status(201).json(responseUser);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const { login, name, email, avatar_url, password, github_id } = req.body;
            const user = await User_1.User.findByPk(req.params.id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            if (login && login !== user.login) {
                const existingUser = await User_1.User.findOne({ where: { login } });
                if (existingUser) {
                    res.status(400).json({ error: 'Username already exists' });
                    return;
                }
            }
            const updates = {};
            if (login !== undefined)
                updates.login = login;
            if (name !== undefined)
                updates.name = name;
            if (email !== undefined)
                updates.email = email;
            if (avatar_url !== undefined)
                updates.avatar_url = avatar_url;
            if (github_id !== undefined)
                updates.github_id = github_id;
            if (password) {
                updates.password = crypto_1.default.createHash('sha256').update(password).digest('hex');
            }
            await user.update(updates);
            const responseUser = {
                id: user.id,
                github_id: user.github_id,
                login: user.login,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
                updated_at: user.updated_at,
            };
            res.json(responseUser);
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const userIdToDelete = parseInt(req.params.id, 10);
            const currentUserId = req.user?.id;
            if (currentUserId && userIdToDelete === currentUserId) {
                res.status(400).json({ error: 'You cannot delete your own account' });
                return;
            }
            const user = await User_1.User.findByPk(userIdToDelete);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            await user.destroy();
            res.json({ message: 'User deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UsersController = UsersController;
