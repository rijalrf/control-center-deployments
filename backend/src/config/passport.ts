import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import axios from 'axios';
import { User } from '../models/User';
import { env } from './env';

passport.use(
  new GitHubStrategy(
    {
      clientID: env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL: env.github.callbackUrl,
      userAgent: 'ccd-backend',
      scope: ['read:org', 'repo', 'workflow'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        let email = profile.emails?.[0]?.value || null;

        // Fetch user emails manually if not provided automatically by passport-github2
        if (!email) {
          try {
            const emailResponse = await axios.get('https://api.github.com/user/emails', {
              headers: {
                Authorization: `token ${accessToken}`,
                'User-Agent': 'ccd-backend',
              },
            });
            if (Array.isArray(emailResponse.data)) {
              const primaryEmail = emailResponse.data.find((e: any) => e.primary);
              if (primaryEmail) {
                email = primaryEmail.email;
              } else if (emailResponse.data.length > 0) {
                email = emailResponse.data[0].email;
              }
            }
          } catch (e: any) {
            console.warn('[Warning] Failed to fetch user emails from GitHub API:', e.message);
          }
        }

        const [user, created] = await User.findOrCreate({
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
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
