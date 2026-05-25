const Event = require('../models/Event');
const Booking = require('../models/Booking');

exports.getAllEvents = async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) {
            filters.category = req.query.category;
        }
        if (req.query.location) {
            filters.location = req.query.location;
        }
        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            filters.$or = [
                { title: searchRegex },
                { category: searchRegex },
                { location: searchRegex },
                { description: searchRegex }
            ];
        }

        const events = await Event.find(filters);
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching events', error });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching event', error });
    }
};

exports.createEvent = async (req, res) => {
    const { title, description, date, location, category, totalSeats, ticketPrice, imageUrl } = req.body;
    try {
        const event = await Event.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice,
            imageUrl,
            createdBy: req.user.id
        });
        res.status(201).json(event);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating event', error });
    }
};

exports.updateEvent = async (req, res) => {
    const { title, description, date, location, category, totalSeats, ticketPrice, imageUrl } = req.body;
    try {
        const occupiedSeats = await Booking.countDocuments({ eventId: req.params.id, status: 'confirmed' });
        const availableSeats = Math.max(0, totalSeats - occupiedSeats);

        const event = await Event.findByIdAndUpdate(req.params.id, {
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats,
            ticketPrice,
            imageUrl
        }, { new: true });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating event', error });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id); 
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting event', error });
    }
};

