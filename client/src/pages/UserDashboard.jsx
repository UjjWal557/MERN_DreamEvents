import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';

const UserDashboard = () => {
    const { user, logout, loading: authLoading } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/login');
            return;
        }
        fetchMyBookings();
    }, [user, authLoading]);

    const fetchMyBookings = async () => {
        try {
            const { data } = await api.get('/bookings/my');
            const sortedBookings = [...data].sort((a, b) => {
                const statusOrder = { pending: 0, confirmed: 1, cancelled: 2 };
                const valA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
                const valB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;

                if (valA !== valB) {
                    return valA - valB;
                }

                if (a.status === 'confirmed') {
                    const dateA = a.eventId?.date ? new Date(a.eventId.date).getTime() : 0;
                    const dateB = b.eventId?.date ? new Date(b.eventId.date).getTime() : 0;
                    return dateA - dateB;
                }

                return 0;
            });
            setBookings(sortedBookings);
        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError('Failed to fetch your bookings.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;
        try {
            await api.delete(`/bookings/${bookingId}`);
            fetchMyBookings();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel booking.');
        }
    };

    if (authLoading) return <div className="text-center py-20 text-xl font-semibold">Checking credentials...</div>;
    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto py-6">
            {/* Header info */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-2xl font-bold">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{user.name}</h1>
                        <p className="text-gray-500 flex items-center gap-1.5 mt-0.5"><FaUser className="text-gray-400 text-xs" /> {user.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl font-bold transition"
                >
                    <FaSignOutAlt /> Sign Out
                </button>
            </div>

            {/* Bookings List */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Registered Bookings</h2>

            {loading ? (
                <div className="text-center py-12 text-lg font-semibold text-gray-500">Loading your bookings...</div>
            ) : error ? (
                <div className="text-center py-12 text-red-600 font-semibold">{error}</div>
            ) : bookings.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-sm">
                    <FaTicketAlt className="text-gray-300 text-5xl mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Bookings Yet</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">You haven't booked any events yet. Explore upcoming events and reserve your spot!</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold transition"
                    >
                        Browse Events
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {bookings.map(booking => {
                        const event = booking.eventId;
                        if (!event) return null;
                        return (
                            <div key={booking._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{event.category}</span>
                                            <h3 className="text-xl font-black text-gray-950 mt-1">{event.title}</h3>
                                        </div>
                                        {/* Status badges */}
                                        <div className="flex flex-col gap-1 items-end">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                    booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                                        'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                {booking.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.paymentStatus === 'paid' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                                                }`}>
                                                {booking.paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 text-sm text-gray-600 border-t border-gray-50 pt-4">
                                        <div className="flex items-center gap-2">
                                            <FaCalendarAlt className="text-gray-400" />
                                            <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaMapMarkerAlt className="text-gray-400" />
                                            <span>{event.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Amount Paid</div>
                                        <div className="text-lg font-extrabold text-gray-900">
                                            {booking.amount === 0 ? 'FREE' : `₹${booking.amount}`}
                                        </div>
                                    </div>

                                    {booking.status !== 'cancelled' && (
                                        <button
                                            onClick={() => handleCancelBooking(booking._id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50/50 px-4 py-2 rounded-xl text-sm font-bold border border-transparent hover:border-red-100 transition"
                                        >
                                            Cancel Booking
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
