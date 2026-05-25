import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaUser, FaTag, FaEnvelope } from 'react-icons/fa';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        fetchEventDetails();
    }, [id]);

    useEffect(() => {
        let interval = null;
        if (otpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [otpSent, timer]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const fetchEventDetails = async () => {
        try {
            const { data } = await api.get(`/events/${id}`);
            setEvent(data);
        } catch (err) {
            console.error('Error fetching event details:', err);
            setError('Could not load event details.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setBookingLoading(true);
        setError('');
        try {
            await api.post('/bookings/send-otp');
            setOtpSent(true);
            setTimer(120); // 2 minutes countdown
            setCanResend(false);
            setSuccess('Verification OTP has been sent to your registered email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP.');
        } finally {
            setBookingLoading(false);
        }
    };

    const handleConfirmBooking = async (e) => {
        e.preventDefault();
        setBookingLoading(true);
        setError('');
        setSuccess('');
        try {
            const { data } = await api.post('/bookings', { eventId: id, otp });

            if (data.requiresPayment) {
                const options = {
                    key: data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummyKeyId',
                    amount: data.razorpayOrder.amount,
                    currency: data.razorpayOrder.currency,
                    name: "DreamEvents",
                    description: `Booking for ${event.title}`,
                    order_id: data.razorpayOrder.id,
                    handler: async function (response) {
                        setBookingLoading(true);
                        try {
                            const verifyRes = await api.post('/bookings/verify-payment', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                bookingId: data.bookingId
                            });
                            if (verifyRes.data.success) {
                                setSuccess('Payment successful and booking confirmed! Redirecting...');
                                setTimeout(() => {
                                    navigate('/dashboard');
                                }, 2500);
                            } else {
                                setError('Payment verification failed.');
                            }
                        } catch (verErr) {
                            setError(verErr.response?.data?.message || 'Error verifying payment signature.');
                        } finally {
                            setBookingLoading(false);
                        }
                    },
                    prefill: {
                        name: user?.name || '',
                        email: user?.email || '',
                    },
                    theme: {
                        color: "#111827"
                    },
                    modal: {
                        ondismiss: function () {
                            setError('Payment process was cancelled.');
                            setBookingLoading(false);
                        }
                    }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                setSuccess('Booking completed successfully! Redirecting to dashboard...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to confirm booking.');
            setBookingLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-xl font-semibold">Loading event details...</div>;
    }

    if (error && !event) {
        return <div className="text-center py-20 text-red-600 text-xl font-semibold">{error}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
            {/* Header Image */}
            <div className="h-96 bg-gray-900 relative">
                {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover opacity-90" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-bold bg-gray-200">
                        {event.category}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 text-white">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 mb-4 inline-block">
                        {event.category}
                    </span>
                    <h1 className="text-4xl font-extrabold mb-2">{event.title}</h1>
                </div>
            </div>

            {/* Content body */}
            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Main Details */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">About Event</h2>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
                    </div>

                    <div className="border-t border-gray-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                                <FaCalendarAlt />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-semibold uppercase">Date & Time</div>
                                <div className="font-semibold text-sm">
                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-semibold uppercase">Location</div>
                                <div className="font-semibold text-sm">{event.location}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Booking Card */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/50 flex flex-col justify-between h-fit space-y-6">
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ticket Price</div>
                        <div className="text-3xl font-black text-gray-900">
                            {event.ticketPrice === 0 ? <span className="text-green-600">FREE</span> : `₹${event.ticketPrice}`}
                        </div>
                    </div>

                    <div className="border-t border-b border-gray-200/60 py-4 my-2 text-sm text-gray-600 space-y-2">
                        <div className="flex justify-between">
                            <span>Available Seats:</span>
                            <span className="font-bold text-gray-900">{event.availableSeats} / {event.totalSeats}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-gray-700 h-1.5 rounded-full" style={{ width: `${(event.availableSeats / event.totalSeats) * 100}%` }}></div>
                        </div>
                    </div>

                    {error && <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-xs font-semibold text-center border border-red-100">{error}</div>}
                    {success && <div className="bg-green-50 text-green-600 p-2.5 rounded-lg text-xs font-semibold text-center border border-green-100">{success}</div>}

                    {!otpSent ? (
                        <button
                            onClick={handleSendOTP}
                            disabled={bookingLoading || event.availableSeats <= 0}
                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {bookingLoading ? 'Processing...' : (event.availableSeats <= 0 ? 'Sold Out' : 'Book Tickets')}
                        </button>
                    ) : (
                        <form onSubmit={handleConfirmBooking} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Enter Booking OTP</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="6-digit code"
                                    maxLength="6"
                                    className="w-full px-3 py-2 text-center font-bold tracking-widest text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:outline-none"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={bookingLoading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition shadow-md"
                            >
                                {bookingLoading ? 'Confirming...' : 'Verify & Confirm Booking'}
                            </button>
                            <div className="flex flex-col items-center gap-2 pt-2">
                                {!canResend ? (
                                    <p className="text-xs text-gray-500 font-medium">
                                        Resend OTP in <span className="font-bold text-gray-700">{formatTime(timer)}</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSendOTP}
                                        disabled={bookingLoading}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventDetails;
