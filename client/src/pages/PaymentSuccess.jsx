import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

const PaymentSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl border border-gray-100 shadow-lg text-center">
            <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-8">Your ticket booking is verified and confirmed. A confirmation receipt has been sent to your email.</p>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-md"
                >
                    View My Bookings
                </button>
                <Link to="/" className="text-gray-600 hover:text-gray-900 font-semibold text-sm mt-2">
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default PaymentSuccess;