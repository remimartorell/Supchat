const passport            = require('passport');
const FacebookStrategy    = require('passport-facebook').Strategy;
const GoogleStrategy      = require('passport-google-oauth20').Strategy;
const User                = require('../models/User');

// --- FACEBOOK STRATEGY ---
passport.use(new FacebookStrategy({
        clientID:     process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:  `${process.env.BACK_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ facebookId: profile.id });
            if (!user) {
                user = new User({
                    facebookId: profile.id,
                    name:       profile.displayName ||
                        `${profile.name.givenName} ${profile.name.familyName}`,
                    email:      profile.emails?.[0].value,
                    isVerified: true,
                    password:   undefined
                });
                await user.save();
            }
            done(null, user);
        } catch (err) {
            done(err);
        }
    }
));

// --- GOOGLE STRATEGY ---
passport.use(new GoogleStrategy({
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${process.env.BACK_URL}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                user = new User({
                    googleId:   profile.id,
                    name:       profile.displayName ||
                        `${profile.name.givenName} ${profile.name.familyName}`,
                    email:      profile.emails?.[0].value,
                    isVerified: true,
                    password:   undefined
                });
                await user.save();
            }
            done(null, user);
        } catch (err) {
            done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
