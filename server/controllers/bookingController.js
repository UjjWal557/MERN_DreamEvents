const Booking = require('../models/Booking.js');
const Event = require('../models/Event');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail, sendBookingEmail } = require('../utils/email');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKeyId',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummyKeySecret',
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendBookingOTP = async (req, res) => {
    const otp = generateOTP();
    await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
    await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
    sendOTPEmail(req.user.email, otp, 'event_booking');
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

        const existingBooking = await Booking.findOne({ userId: req.user.id, eventId, status: { $ne: 'cancelled' } });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this event' });
        }

        // If the event is free, directly confirm it
        if (event.ticketPrice === 0) {
            const booking = await Booking.create({
                userId: req.user.id,
                eventId,
                status: 'confirmed',
                paymentStatus: 'paid',
                amount: 0
            });

            event.availableSeats -= 1;
            await event.save();
            sendBookingEmail(req.user.email, req.user.name, event.title);
            await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
            return res.status(201).json({ requiresPayment: false, booking });
        }

        // Otherwise, create a pending booking and generate a Razorpay Order
        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            status: 'pending',
            paymentStatus: 'unpaid',
            amount: event.ticketPrice
        });

        // No seat decrement for pending bookings

        const options = {
            amount: event.ticketPrice * 100, // in paise
            currency: 'INR',
            receipt: `receipt_${booking._id}`,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);
        booking.razorpayOrderId = razorpayOrder.id;
        await booking.save();

        await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });

        res.status(201).json({
            requiresPayment: true,
            bookingId: booking._id,
            razorpayOrder,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error booking event', error });
    }
};

exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    try {
        const booking = await Booking.findById(bookingId).populate('eventId').populate('userId');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummyKeySecret")
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            booking.status = 'confirmed';
            booking.paymentStatus = 'paid';
            booking.razorpayPaymentId = razorpay_payment_id;
            booking.razorpaySignature = razorpay_signature;
            await booking.save();

            const event = booking.eventId;
            if (event) {
                event.availableSeats = Math.max(0, event.availableSeats - 1);
                await event.save();
            }

            sendBookingEmail(booking.userId.email, booking.userId.name, event.title);
            res.status(200).json({ success: true, message: 'Payment verified and booking confirmed', booking });
        } else {
            res.status(400).json({ message: 'Payment signature verification failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error verifying payment', error });
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

    event.availableSeats = Math.max(0, event.availableSeats - 1);
    await event.save();

    //admin confirm booking, send email to user
    sendBookingEmail(booking.userId.email, booking.userId.name, event.title);
    res.json({ message: 'Booking confirmed', booking });
}

exports.getMyBookings = async (req, res) => {
    try {
        let bookings;
        if (req.user.role === 'admin') {
            bookings = await Booking.find().populate('eventId').populate('userId');
        } else {
            bookings = await Booking.find({ userId: req.user._id }).populate('eventId');
        }
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

        if (previousStatus === 'confirmed') {
            const event = await Event.findById(booking.eventId);
            if (event) {
                if (event.availableSeats < event.totalSeats) {
                    event.availableSeats += 1;
                    await event.save();
                }
            }
        }
        res.json({ message: 'Booking cancelled' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};

