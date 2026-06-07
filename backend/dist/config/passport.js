"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_github2_1 = require("passport-github2");
const axios_1 = __importDefault(require("axios"));
const User_1 = require("../models/User");
const env_1 = require("./env");
passport_1.default.use(new passport_github2_1.Strategy({
    clientID: env_1.env.github.clientId,
    clientSecret: env_1.env.github.clientSecret,
    callbackURL: env_1.env.github.callbackUrl,
    userAgent: 'ccd-backend',
    scope: ['read:org', 'repo', 'workflow'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let email = profile.emails?.[0]?.value || null;
        // Fetch user emails manually if not provided automatically by passport-github2
        if (!email) {
            try {
                const emailResponse = await axios_1.default.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `token ${accessToken}`,
                        'User-Agent': 'ccd-backend',
                    },
                });
                if (Array.isArray(emailResponse.data)) {
                    const primaryEmail = emailResponse.data.find((e) => e.primary);
                    if (primaryEmail) {
                        email = primaryEmail.email;
                    }
                    else if (emailResponse.data.length > 0) {
                        email = emailResponse.data[0].email;
                    }
                }
            }
            catch (e) {
                console.warn('[Warning] Failed to fetch user emails from GitHub API:', e.message);
            }
        }
        const [user, created] = await User_1.User.findOrCreate({
            where: { github_id: String(profile.id) },
            defaults: {
                github_id: String(profile.id),
                login: profile.username,
                name: profile.displayName || profile.username,
                email: email,
                avatar_url: profile.photos?.[0]?.value || null,
                access_token: accessToken,
            },
        });
        if (!created) {
            await user.update({
                login: profile.username,
                name: profile.displayName || profile.username,
                email: email || user.email,
                avatar_url: profile.photos?.[0]?.value || user.avatar_url,
                access_token: accessToken,
            });
        }
        return done(null, user);
    }
    catch (err) {
        return done(err, null);
    }
}));
passport_1.default.serializeUser((user, done) => done(null, user.id));
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.User.findByPk(id);
        done(null, user);
    }
    catch (err) {
        done(err, null);
    }
});
