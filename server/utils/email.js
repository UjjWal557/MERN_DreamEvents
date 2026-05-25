const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const FROM_ADDRESS = `DreamEvents <${process.env.EMAIL_USER}>`;

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        await transporter.sendMail({
            from: FROM_ADDRESS,
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111;">Hi ${userName}! 🎉</h2>
                    <p style="color: #555; font-size: 16px;">Your booking for the event <strong>${eventTitle}</strong> is successfully confirmed.</p>
                    <p style="color: #555; font-size: 16px;">Thank you for choosing DreamEvents.</p>
                </div>
            `
        });
        console.log('Booking confirmation email sent to', userEmail);
    } catch (error) {
        console.error('Error sending booking email:', error);
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification'
            ? 'Verify your DreamEvents Account'
            : 'DreamEvents Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new DreamEvents account.'
            : 'Please use the following OTP to verify and confirm your event booking.';

        console.log(`Booking OTP for ${userEmail}: ${otp}`);

        await transporter.sendMail({
            from: FROM_ADDRESS,
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #111;">${title}</h2>
                    <p style="color: #555; font-size: 16px;">${msg}</p>
                    <div style="margin: 24px auto; padding: 18px 32px; font-size: 32px; font-weight: bold; background: #f4f4f4; border-radius: 8px; width: max-content; letter-spacing: 8px; color: #111;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
                </div>
            `
        });
        console.log(`OTP sent to ${userEmail} for ${type}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};

module.exports = { sendBookingEmail, sendOTPEmail };