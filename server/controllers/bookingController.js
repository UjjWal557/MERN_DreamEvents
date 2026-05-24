const Booking = require('../models/Booking.js');
const Event = require('../models/Event');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail, sendBookingEmail} = require('../utils/email');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendBookingOTP = async (req, res) => {
    const otp = generateOTP();
    await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
    await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
    await sendOTPEmail(req.user.email, otp, 'event_booking');
    res.json({ message: 'OTP sent to email' });
};

exports.bookEvent = async (req, res) => {
    const { eventId, otp } = req.body;
    const otpRecord = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
    if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.availableSeats <= 0) {
            return res.status(400).json({ message: 'No seats available' });
        }

        const existingBooking = await Booking.findOne({ userId: req.user.id, eventId });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this event' });
        }

        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            status: 'pending',
            paymentStatus: 'unpaid',
            amount: event.ticketPrice
        });

        event.availableSeats -= 1;
        await event.save();
        await sendBookingEmail(req.user.email, req.user.name, event.title);
        await OTP.deleteMany({ email: req.user.email, action: 'event_booking' }); // delete all OTPs for this email and action after successful booking
        res.status(201).json(booking);
    }
    catch (error) {
        res.status(500).json({ message: 'Error booking event', error });
    }
};

exports.confirmBooking = async (req, res) => {
    const paymentStatus = req.body.paymentStatus;
    if (paymentStatus && !['paid', 'unpaid'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
    }

    const booking = await Booking.findById(req.params.id).populate('eventId').populate('userId');
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending bookings can be confirmed' });
    }
    
    const event = booking.eventId;
    if (event.availableSeats <= 0) {
        return res.status(400).json({ message: 'No seats available' });
    }
    booking.status = 'confirmed';
    if (paymentStatus) {
        booking.paymentStatus = paymentStatus;
    }
    await booking.save();
    
    //admin confirm booking, send email to user
    await sendBookingEmail(booking.userId.email, booking.userId.name, event.title);
    res.json({ message: 'Booking confirmed', booking });
}

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id }).populate('eventId');       
        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error });
    }   
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);          
        if (!booking) { 
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only cancel your own bookings' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        
        const previousStatus = booking.status;
        booking.status = 'cancelled';
        await booking.save();

        if (previousStatus === 'confirmed' || previousStatus === 'pending') {
            const event = await Event.findById(booking.eventId);
            if (event) {
                event.availableSeats += 1;
                await event.save();
            }
        }
        res.json({ message: 'Booking cancelled' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};

