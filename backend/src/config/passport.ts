import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { VerifyCallback } from 'passport-oauth2';
import axios from 'axios';
import { User } from '../models/User';
import { env } from './env';

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

passport.use(
  new GitHubStrategy(
    {
      clientID:     env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL:  env.github.callbackUrl,
      userAgent:    'ccd-backend',
      scope:        ['read:org', 'repo', 'workflow'],
    },
    async (accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        let email = (profile.emails?.[0]?.value) ?? null;

        // Fetch user emails manually if not provided automatically by passport-github2
        if (!email) {
          try {
            const emailResponse = await axios.get<GitHubEmail[]>('https://api.github.com/user/emails', {
              headers: {
                Authorization: `token ${accessToken}`,
                'User-Agent':  'ccd-backend',
              },
            });
            if (Array.isArray(emailResponse.data)) {
              const primaryEmail = emailResponse.data.find((e) => e.primary);
              email = primaryEmail?.email ?? emailResponse.data[0]?.email ?? null;
            }
          } catch (e: unknown) {
            console.warn(
              '[Warning] Failed to fetch user emails from GitHub API:',
              e instanceof Error ? e.message : e,
            );
          }
        }

        const [user, created] = await User.findOrCreate({
          where:    { github_id: String(profile.id) },
          defaults: {
            github_id:    String(profile.id),
            login:        profile.username ?? '',
            name:         profile.displayName || profile.username,
            email:        email,
            avatar_url:   profile.photos?.[0]?.value ?? null,
            access_token: accessToken,
          },
        });

        if (!created) {
          await user.update({
            login:        profile.username ?? user.login,
            name:         profile.displayName || profile.username || user.name,
            email:        email ?? user.email,
            avatar_url:   profile.photos?.[0]?.value ?? user.avatar_url,
            access_token: accessToken,
          });
        }

        return done(null, user);
      } catch (err: unknown) {
        return done(err instanceof Error ? err : new Error(String(err)));
      }
    },
  ),
);

passport.serializeUser((user: Express.User, done) => done(null, user.id));

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user ?? undefined);
  } catch (err: unknown) {
    done(err instanceof Error ? err : new Error(String(err)));
  }
});
