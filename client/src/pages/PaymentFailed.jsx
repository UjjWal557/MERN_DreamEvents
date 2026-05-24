import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa';

const PaymentFailed = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl border border-gray-100 shadow-lg text-center">
            <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-500 mb-8">We could not process your payment. Please try again or use another payment method.</p>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-md"
                >
                    Browse Events
                </button>
                <Link to="/" className="text-gray-600 hover:text-gray-900 font-semibold text-sm mt-2">
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default PaymentFailed;