const User = require('../models/User');

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
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`OTP for ${email}: ${otp}`);

        await sendOTPEmail(email, otp, 'account_verification');
        const newOTP = new OTP({ email, otp, action: 'account_verification' });
        await newOTP.save();
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }   
};