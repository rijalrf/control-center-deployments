"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
router.get('/github', passport_1.default.authenticate('github', {
    scope: ['read:org', 'repo', 'workflow'],
    session: false,
}));
router.get('/github/callback', passport_1.default.authenticate('github', { session: false, failureRedirect: `${env_1.env.FRONTEND_URL}/login?error=auth_failed` }), auth_controller_1.AuthController.githubCallback);
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.AuthController.getMe);
router.post('/logout', auth_controller_1.AuthController.logout);
exports.default = router;
