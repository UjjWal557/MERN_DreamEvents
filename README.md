# DreamEvents - Full-Stack Event Booking Platform

DreamEvents is a full-stack MERN application that allows users to discover, register, and book tickets for various events. It features an administrative dashboard for event organizers to manage both free and paid events, track revenue, and manually verify bookings and payments.

This is my first full-stack MERN project!

🔗 **Live Demo:** [mern-dream-events.vercel.app](https://mern-dream-events.vercel.app/) *(Note: Since the backend is hosted on a free Render server, the initial load may take up to a minute to load).*    

> [!IMPORTANT]
> **Email/OTP Limitation on Live Demo:**
> The backend server is hosted on Render's free tier, which blocks outbound SMTP ports (465/587). Because the project is currently configured to use **Nodemailer (Gmail SMTP)**, OTP emails will **not** be delivered on the live website.
>
> To test the email authentication and booking flow:
> 1. Run the project **locally** and configure your own SMTP credentials in the `.env` file, or
> 2. Swap the active provider in `server/utils/email.js` to **Resend** (Option B) for your live deployment.

## Features

- **User Authentication**: Secure sign-up and login using JSON Web Tokens (JWT) and bcrypt password hashing.
- **2FA OTP Verification**:
  - Mandatory Email OTP to activate your account upon registration (or during unverified login attempts).
  - Mandatory Email OTP to authorize and finalize event ticket bookings.
- **Role-Based Access**:
  - **Admin**: Create, edit, and delete events. Confirm or reject booking requests, and mark them as 'Paid' or 'Not Paid'. (Admin access is restricted to database-flagged accounts).
  - **User**: Browse events, submit booking requests using OTP, track statuses on a personal dashboard, and cancel bookings.
- **Event Management**: Create free or paid events with descriptions, external image URLs, categories, dates, and seating capacity.
- **Smart Booking Flow**:
  - Mandatory 2FA OTP to authorize a booking request.
  - All booking requests enter a **Pending** queue for Admin verification.
  - Seating capacity updates and validates automatically to prevent overbooking.
- **Payment Integration**: Built-in payment gateway using **Razorpay** (test mode keys) for secure paid event ticketing.
- **Admin Analytics Panel**: Track live statistics directly on the dashboard, including:
  - Pending Requests count
  - Total Revenue generated
  - Total Confirmed & Paid Clients
- **Email Notifications**: Automated email delivery of booking confirmations and OTPs.
- **Modern UI**: Polished interface built with React, Tailwind CSS, and interactive UI states.

---

## Folder Structure

```text
EventManager/
├── client/          # React Frontend (Vite)
└── server/          # Node.js + Express Backend
```

---

## Setup & Installation

### Prerequisites
Make sure you have **Node.js** installed on your system. You will also need a **MongoDB database** (like MongoDB Atlas).

### 1. Environment Variables Configuration
Go to the `server/` directory, create a `.env` file, and fill in these keys:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=supersecretjwtkey_eventora

# Razorpay Credentials (test mode)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Gmail Credentials (for Nodemailer Option A)
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

# Resend API Key (for Resend Option B)
RESEND_API_KEY=your_resend_api_key
```

> **Note:** For `EMAIL_PASS`, you need to generate an **App Password** from your Google Account settings (regular passwords won't work if you have 2FA enabled on Gmail).

---

### 2. Run from Root Folder (Single Terminal)
You can manage and run both the backend and frontend together from the project root directory:

```bash
# Install root tools
npm install

# Install all client and server dependencies
npm run install:all

# Run both backend & frontend together in development mode
npm run dev
```

* `npm run dev`: Starts both server and client together using `concurrently`.
* `npm run dev:all`: Installs all dependencies for both directories and starts the development servers.
* `npm run start`: Runs the backend server and builds/previews the frontend client.

---

### 3. Run in Separate Terminals (Manual Setup)

If you prefer to run client and server in separate terminal windows:

#### **Backend Setup:**
```bash
cd server
npm install
npm run dev
```
*(Server will start on `http://localhost:5000`)*

#### **Frontend Setup:**
```bash
cd client
npm install
npm run dev
```
*(Client will start on `http://localhost:5173`)*

---

## Swapping the Email/OTP Provider

The project supports two email delivery methods configured in `server/utils/email.js`. You can comment/uncomment the sections inside that file to switch between them:

1. **Option A: Nodemailer (Active by default)**
   - Uses your Gmail account and App Password.
   - Recommended for running locally or hosting on platforms that do not block SMTP ports (like Vercel).
2. **Option B: Resend (Commented out)**
   - Uses the Resend HTTP API.
   - Recommended for free hosting platforms (like Render or Railway) because they block outgoing SMTP ports (465/587).
   - *Note:* In Resend's free sandbox mode, you can only send emails to the email address registered with your Resend account, unless you verify a custom domain.
