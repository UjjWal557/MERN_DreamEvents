const jwt = require('jsonwebtoken');
const User = require('../models/User');

// User Authentication Middleware 
const protect = async (req, res, next) => {
    let token = req.headers.authorization && req.headers.authorization.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null;
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    else {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET); // returns id and role as set in the token generation in authController
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found, authorization denied' });
            }   
            next();
        }
        catch (error) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};

module.exports = { protect, admin };