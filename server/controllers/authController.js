const User = require('../models/User');
const OTP = require('../models/OTP');   
const bcrypt = require('bcrypt');
const { sendOTPEmail } = require('../utils/email');

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
        await sendOTPEmail(email, otp, 'account_verification'); // send OTP email for account verification
        res.status(201).json({ 
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            email: user.email
         });
        
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }   
};