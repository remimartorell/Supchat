const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.BACK_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
    },
    async function(accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ facebookId: profile.id });

            if (!user) {
                user = new User({
                    facebookId: profile.id,
                    name: profile.displayName || (profile.name.givenName + ' ' + profile.name.familyName),
                    email: (profile.emails && profile.emails[0].value) || undefined,
                    isVerified: true,
                    password: undefined,
                });
                await user.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
