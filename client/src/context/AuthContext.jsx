import React from "react";
import api from "../utils/axios";

export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => { 
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("token", data.token);
            return data;
        } catch (error) {
            console.error("Login failed:", error);
            if (error.response && error.response.status === 403) {
                const customError = new Error(error.response.data.message || 'Account not verified');
                customError.needsVerification = true;
                throw customError;
            }
            throw new Error(error.response?.data?.message || error.message || 'Login failed');
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            return data;
        } catch (error) {
            console.error("Registration failed:", error);
            throw new Error(error.response?.data?.message || error.message || 'Registration failed');
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });  
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("token", data.token);
            return data;
        }
        catch (error) {
            console.error("OTP verification failed:", error);
            throw new Error(error.response?.data?.message || error.message || 'Verification failed');
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, verifyOTP, register }}>
            {children}
        </AuthContext.Provider>
    );
};


