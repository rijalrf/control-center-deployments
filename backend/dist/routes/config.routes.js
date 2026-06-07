"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const envPath = path_1.default.join(__dirname, '../../../.env');
router.use(auth_middleware_1.authMiddleware);
// GET /api/config/env - Get system .env content
router.get('/env', (req, res, next) => {
    try {
        if (!fs_1.default.existsSync(envPath)) {
            return res.json({ content: '' });
        }
        const content = fs_1.default.readFileSync(envPath, 'utf8');
        res.json({ content });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/config/env - Update system .env content
router.post('/env', (req, res, next) => {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Content must be a string' });
        }
        fs_1.default.writeFileSync(envPath, content, 'utf8');
        res.json({ success: true, message: '.env file updated successfully' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
