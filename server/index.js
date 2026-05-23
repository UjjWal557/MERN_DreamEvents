const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); 


//Routes
app.use('/api/auth', authRoutes);

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('Error connecting to MongoDB:', err));    


const port = process.env.PORT || 5000;;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});