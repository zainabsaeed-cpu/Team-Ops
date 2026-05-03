const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { User, VerificationToken, Workspace, Board, Column, formatUser } = require('../models');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '175739577750-6pglkgnai3nha232d8js957jl529ep5i.apps.googleusercontent.com';
const googleClient = new OAuth2Client(googleClientId);

const createStarterWorkspace = async (userId) => {
    const workspace = await Workspace.create({
        name: 'My Workspace',
        owner: userId,
        inviteCode: `TEAM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        members: [{ user: userId, role: 'owner' }],
    });

    const board = await Board.create({
        workspaceId: workspace._id,
        name: 'Sprint 4',
        color: '#7c5cfc',
    });

    await Column.insertMany([
        { workspace: workspace._id, board: board._id, title: 'To Do', position: 0 },
        { workspace: workspace._id, board: board._id, title: 'In Progress', position: 1 },
        { workspace: workspace._id, board: board._id, title: 'In Review', position: 2 },
        { workspace: workspace._id, board: board._id, title: 'Done', position: 3 },
    ]);

    return workspace;
};

const issueSession = (user) => ({
    user: formatUser(user),
    token: jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '7d' }),
});


exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const hashed = await bcrypt.hash(password, 10);

        const existing = await User.findOne({ email: normalizedEmail });

        if (existing) {
            if (existing.verified) {
                return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
            }
            const user = await User.findByIdAndUpdate(
                existing._id,
                {
                    name: trimmedName,
                    passwordHash: hashed,
                    authProvider: 'email',
                    verified: false,
                },
                { new: true }
            );

            await VerificationToken.deleteMany({ userId: user._id });
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await VerificationToken.create({ userId: user._id, token: otp, expiresAt });
            await sendVerificationEmail(normalizedEmail, otp);

            return res.status(200).json({
                ...issueSession(user),
                message: 'Account created. Continue to workspace setup.'
            });
        }

        const user = await User.create({ 
            name: trimmedName, 
            email: normalizedEmail, 
            passwordHash: hashed,
            authProvider: 'email',
            verified: false 
        });

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await VerificationToken.create({ userId: user._id, token: otp, expiresAt });
        await sendVerificationEmail(normalizedEmail, otp);

        res.status(201).json({
            ...issueSession(user),
            message: 'Account created. Continue to workspace setup.'
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ error: 'Registration failed. Please try again.' });
    }
};

exports.verify = async (req, res) => {
    const { token, email } = req.body;
    
    try {
        let verificationToken;
        if (email) {
            const user = await User.findOne({ email: email.toLowerCase().trim() });
            if (user) {
                verificationToken = await VerificationToken.findOne({ userId: user._id, token });
            }
        } else {
            verificationToken = await VerificationToken.findOne({ token });
        }
        
        if (!verificationToken) {
            return res.status(400).json({ error: 'Invalid verification token' });
        }

        if (verificationToken.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Verification token has expired' });
        }

        // Mark user as verified
        const user = await User.findByIdAndUpdate(
            verificationToken.userId,
            { verified: true },
            { new: true }
        );

        // Delete used token
        await VerificationToken.deleteOne({ _id: verificationToken._id });

        // Create starter workspace only if user has no workspaces
        const existingWorkspace = await Workspace.findOne({ 'members.user': user._id }).lean();
        if (!existingWorkspace) {
            await createStarterWorkspace(user._id);
        }

        // Issue JWT token
        const jwtToken = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
        
        res.json({ 
            user: formatUser(user), 
            token: jwtToken,
            message: 'Email verified! Your account is ready.'
        });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
};

exports.resendVerification = async (req, res) => {
    const { email } = req.body;

    try {
        const normalizedEmail = email?.toLowerCase().trim();
        if (!normalizedEmail) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.verified) return res.json({ message: 'Email is already verified' });

        await VerificationToken.deleteMany({ userId: user._id });
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await VerificationToken.create({ userId: user._id, token: otp, expiresAt });
        await sendVerificationEmail(normalizedEmail, otp);

        res.json({ message: 'Verification code sent' });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ error: 'Could not send verification code' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const normalizedEmail = email?.toLowerCase().trim();
        if (!normalizedEmail) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email: normalizedEmail });
        if (user) {
            await VerificationToken.deleteMany({ userId: user._id });
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await VerificationToken.create({ userId: user._id, token: otp, expiresAt });
            await sendPasswordResetEmail(normalizedEmail, otp);
        }

        res.json({ message: 'If that email exists, a password reset code has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Could not start password reset' });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const normalizedEmail = email?.toLowerCase().trim();
        if (!normalizedEmail || !token || !password) {
            return res.status(400).json({ error: 'Email, reset code, and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ error: 'Invalid reset code' });

        const resetToken = await VerificationToken.findOne({ userId: user._id, token });
        if (!resetToken || resetToken.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, { passwordHash, verified: true, authProvider: 'email' });
        await VerificationToken.deleteOne({ _id: resetToken._id });

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Could not reset password' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.authProvider === 'google' && !user.passwordHash) {
            return res.status(403).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
        }

        if (!user.verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        res.json(issueSession(user));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.googleLogin = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Google credential is required' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
        });

        const payload = ticket.getPayload();
        const googleId = payload?.sub;
        const email = payload?.email?.toLowerCase().trim();
        const name = payload?.name || payload?.given_name || email?.split('@')[0] || 'Google User';

        if (!googleId || !email) {
            return res.status(400).json({ error: 'Google account data is incomplete' });
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        let createdWorkspace = false;

        if (!user) {
            user = await User.create({
                name,
                email,
                passwordHash: null,
                googleId,
                authProvider: 'google',
                verified: true,
                avatarUrl: payload?.picture || null,
            });
            createdWorkspace = true;
        } else {
            const updates = {
                verified: true,
                googleId: user.googleId || googleId,
            };

            if (!user.name && name) {
                updates.name = name;
            }

            if (!user.avatarUrl && payload?.picture) {
                updates.avatarUrl = payload.picture;
            }

            user = await User.findByIdAndUpdate(user._id, updates, { new: true });
        }

        if (createdWorkspace) {
            await createStarterWorkspace(user._id);
        }

        res.json(issueSession(user));
    } catch (err) {
        console.error('Google login error:', err);
        res.status(401).json({ error: 'Google sign-in failed' });
    }
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ user: formatUser(user) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
