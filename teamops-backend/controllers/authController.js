const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, VerificationToken, Workspace, Column, formatUser } = require('../models');
const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';

const createStarterWorkspace = async (userId) => {
    const workspace = await Workspace.create({
        name: 'My Workspace',
        owner: userId,
        inviteCode: `invite-${Date.now().toString(36)}`,
        members: [{ user: userId, role: 'owner' }],
    });

    await Column.insertMany([
        { workspace: workspace._id, title: 'To Do', position: 0 },
        { workspace: workspace._id, title: 'In Progress', position: 1 },
        { workspace: workspace._id, title: 'Done', position: 2 },
    ]);

    return workspace;
};

const sendVerificationEmail = async (email, verificationToken) => {
    // For development: log verification link to console
    const verificationLink = `http://localhost:5174/verify?token=${verificationToken}`;
    console.log(`\n📧 VERIFICATION EMAIL (DEV MODE)\nTo: ${email}\nLink: ${verificationLink}\n`);
    
    // In production, integrate with Sendgrid, AWS SES, or other email service
    // For now, just return success
    return true;
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            name, 
            email, 
            passwordHash: hashed,
            verified: false 
        });

        // Generate verification token (32 bytes = 64 hex chars)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await VerificationToken.create({
            userId: user._id,
            token,
            expiresAt,
        });

        // Send verification email
        await sendVerificationEmail(email, token);

        // Return user with verification_required flag
        res.status(201).json({ 
            verification_required: true,
            email: user.email,
            message: 'Account created! Check your email to verify your account.'
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ error: 'Email already exists' });
    }
};

exports.verify = async (req, res) => {
    const { token } = req.body;
    
    try {
        const verificationToken = await VerificationToken.findOne({ token });
        
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

        // Create starter workspace
        await createStarterWorkspace(user._id);

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

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (!user.verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
        res.json({ user: formatUser(user), token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
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