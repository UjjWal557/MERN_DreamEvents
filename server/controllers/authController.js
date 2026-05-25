const User = require('../models/User');
const OTP = require('../models/OTP');   
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const generateToken = (id,role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7h' });
};

// Register User
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    let existingUser;
    try {
        existingUser = await User.findOne({ email });   
    } catch (error) {
        return res.status(500).json({ message: 'Error checking user', error });
    }

    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const user = await User.create({ name, email, password: hashedPassword, role: 'user', isVerified: false});
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`OTP for ${email}: ${otp}`);
        await OTP.create({ email, otp, action: 'account_verification' }); // create OTP entry in DB
        sendOTPEmail(email, otp, 'account_verification'); // send OTP email for account verification
        res.status(201).json({ 
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            email: user.email
         });
        
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }   
};

// Login User
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }
    try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if(!user.isVerified && user.role === 'user') {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await OTP.deleteMany({ email, action: 'account_verification' }); // delete any existing OTPs for this email and action
            await OTP.create({ email, otp, action: 'account_verification' });
            sendOTPEmail(email, otp, 'account_verification'); // resend OTP email for account verification
            return res.status(403).json({ message: 'Account not verified. A new OTP has been sent to your email.' });
        }

        res.json({ 
            message: 'Login successful', 
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
         });
       
    } 
    catch (error) {
        return res.status(500).json({ message: 'Error checking user', error });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;    
    try {
        const otpEntry = await OTP.findOne({ email, otp, action: 'account_verification' });
        if (!otpEntry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email }, { isVerified: true });
        await OTP.deleteMany({ email, action: 'account_verification' }); // delete all OTPs for this email and action after successful verification
        res.json({ 
            message: 'Account verified successfully. You can now log in.',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
    } 
    catch (error) {
        res.status(500).json({ message: 'Error verifying OTP', error });
    }
};
