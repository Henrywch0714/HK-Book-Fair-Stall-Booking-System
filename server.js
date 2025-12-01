import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
  })
);

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
const requireAdmin = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
const staticDirs = [
  { route: '/', path: path.join(__dirname) },
  { route: '/webContent', path: path.join(__dirname, 'webContent') },
  { route: '/style', path: path.join(__dirname, 'style') },
  { route: '/src', path: path.join(__dirname, 'src') }
];

staticDirs.forEach(dir => {
  console.log(`Static dir: ${dir.route} -> ${dir.path}`);
  app.use(dir.route, express.static(dir.path));
});
app.get('/webContent/admin-settings.html', authenticateToken, requireAdmin, (req, res) => {
  const filePath = path.join(__dirname, 'webContent', 'admin-settings.html');

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('admin-settings.html not found');
  }

  res.sendFile(filePath);
});
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://binzhu_db_user:COVlB2pS9JrW10RE@event-booth-cluster.wzfg4ns.mongodb.net/?appName=event-booth-cluster';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  companyName: String,
  industry: String,
  companySize: String,
  companyAddress: String,
  password: String,
  role: { type: String, enum: ['exhibitor', 'admin'], default: 'exhibitor' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  registrationDate: { type: Date, default: Date.now }
});

const BoothSchema = new mongoose.Schema({
  id: String,
  event: String,
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  date: String,
  location: String,
  size: String,
  sizeLabel: String,
  price: Number,
  note: String,
  status: {
    type: String,
    enum: ['available', 'booked', 'maintenance'],
    default: 'available'
  },
  statusLabel: String,
  statusClass: String,
  features: [String],
  description: String,
  exhibitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const BookingSchema = new mongoose.Schema(
  {
    boothId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyName: String,
    contactPerson: String,
    contactEmail: String,
    contactPhone: String,
    specialRequests: String,
    totalPrice: Number,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled','booked'],
      default: 'pending'
    },
    bookingDate: { type: Date, default: Date.now },
    eventName: String,
    boothNumber: String,
    eventDate: String,
    venue: String,
    location: String
  },
  {
    timestamps: true
  }
);

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: String,
  venue: String,
  description: String,
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled', 'draft'],
    default: 'upcoming'
  },
  maxBooths: { type: Number, default: 100 },
  boothPrice: Number,
  boothSizes: [String],
  priceTiers: String,
  registrationOpen: Boolean,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Booth = mongoose.model('Booth', BoothSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Event = mongoose.model('Event', EventSchema);

async function findBoothByIdentifier(identifier) {
  let booth;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    booth = await Booth.findById(identifier);
  }
  if (!booth) {
    booth = await Booth.findOne({ id: identifier });
  }
  return booth;
}


app.get(
  '/webContent/admin-settings.html',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const filePath = path.join(__dirname, 'webContent', 'admin-settings.html');
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('admin-settings.html not found');
    }
    res.sendFile(filePath);
  }
);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API server is working!', timestamp: new Date() });
});

app.get('/api/events', async (req, res) => {
  try {
    const {
      q,         
      status,      
      from,       
      to,          
      sort        
    } = req.query;

    const filters = {};

    if (status && status !== 'all') {
      filters.status = status;
    }

    if (from) {
      filters.startDate = { ...(filters.startDate || {}), $gte: new Date(from) };
    }
    if (to) {
      filters.endDate = { ...(filters.endDate || {}), $lte: new Date(to) };
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filters.$or = [{ name: regex }, { description: regex }, { venue: regex }];
    }

    let query = Event.find(filters);

    let sortOptions = { startDate: 1 };
    if (sort) {
      const [field, dir] = sort.split(':');
      sortOptions = { [field]: dir === 'desc' ? -1 : 1 };
    }

    const events = await query.sort(sortOptions).lean();
    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
});

app.post('/api/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 前端传过来的字段
    const {
      title,
      category,
      date,
      time,
      description,
      venue,
      address,
      city,
      capacity,
      totalBooths,
      boothPrice,
      boothSizes,
      priceTiers,
      status,
      registrationOpen,
      imageUrl
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title and date are required'
      });
    }

    const startDate = new Date(`${date}T${time || '00:00'}:00`);
    const endDate = startDate; 

    const event = new Event({
      name: title,
      startDate,
      endDate,
      description,
      venue,
      location: city || address || '',
      maxBooths: typeof totalBooths === 'number' ? totalBooths : Number(totalBooths) || 0,
      boothPrice,
      boothSizes,
      priceTiers,
      registrationOpen,
      status: status || 'draft',
      imageUrl
    });
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

app.put('/api/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      category,
      date,
      time,
      description,
      venue,
      address,
      city,
      capacity,
      totalBooths,
      boothPrice,
      boothSizes,
      priceTiers,
      status,
      registrationOpen,
      imageUrl
    } = req.body;

    const update = {};

    if (title !== undefined) update.name = title;
    if (date) {
      const startDate = new Date(`${date}T${time || '00:00'}:00`);
      update.startDate = startDate;
      update.endDate = startDate; // 同理，简化处理
    }
    if (description !== undefined) update.description = description;
    if (venue !== undefined) update.venue = venue;
    if (city || address) update.location = city || address;
    if (totalBooths !== undefined) {
      update.maxBooths = typeof totalBooths === 'number'
        ? totalBooths
        : Number(totalBooths) || 0;
    }
    if (boothPrice !== undefined) update.boothPrice = boothPrice;
    if (boothSizes !== undefined) update.boothSizes = boothSizes;
    if (priceTiers !== undefined) update.priceTiers = priceTiers;
    if (registrationOpen !== undefined) update.registrationOpen = registrationOpen;
    if (status !== undefined) update.status = status;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;

    const event = await Event.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
});

app.delete('/api/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'companyName',
      'industry',
      'companySize',
      'companyAddress'
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (key in req.body) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      industry,
      companySize,
      companyAddress,
      password,
      role
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'User already exists with this email' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      companyName,
      industry,
      companySize,
      companyAddress,
      password,
      role: role || 'exhibitor'
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyName: user.companyName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    const user = await User.findOne({ email });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (password !== user.password) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'inactive') {
      return res.status(400).json({ error: 'Account is suspended' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful');

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyName: user.companyName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/booths', async (req, res) => {
  try {
    const { status, event,eventId, location, size, maxPrice } = req.query;

    const filters = {};

    if (status && status !== 'all') {
      filters.status = status;
    }
    if (eventId) {
      filters.eventId = eventId;
    } else if (event && event !== 'all') {
      filters.event = event;
    }
    if (location && location !== 'all') {
      filters.location = location;
    }
    if (size && size !== 'all') {
      filters.size = size;
    }
    if (maxPrice && !isNaN(maxPrice)) {
      filters.price = { $lte: parseFloat(maxPrice) };
    }

    const booths = await Booth.find(filters).populate(
      'exhibitor',
      'firstName lastName companyName email'
    );
    res.json({ booths });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/booths/stats', async (req, res) => {
  try {
    const totalBooths = await Booth.countDocuments();
    const bookedBooths = await Booth.countDocuments({ status: 'booked' });
    const availableBooths = await Booth.countDocuments({ status: 'available' });
    const maintenanceBooths = await Booth.countDocuments({
      status: 'maintenance'
    });

    res.json({
      totalBooths,
      bookedBooths,
      availableBooths,
      maintenanceBooths
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/booths/:id', async (req, res) => {
  try {
    const booth = await findBoothByIdentifier(req.params.id);

    if (!booth) return res.status(404).json({ error: 'Booth not found' });

    await booth.populate(
      'exhibitor',
      'firstName lastName companyName email phone'
    );
    res.json(booth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/booths', authenticateToken, async (req, res) => {
  try {
    const booth = new Booth(req.body);
    await booth.save();
    res.status(201).json({ message: 'Booth created successfully', booth });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/booths/:id', authenticateToken, async (req, res) => {
  try {
    let booth = await findBoothByIdentifier(req.params.id);

    if (!booth) return res.status(404).json({ error: 'Booth not found' });

    Object.assign(booth, req.body);
    await booth.save();

    res.json({ message: 'Booth updated successfully', booth });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/booths/:id', authenticateToken, async (req, res) => {
  try {
    const booth = await findBoothByIdentifier(req.params.id);

    if (!booth) return res.status(404).json({ error: 'Booth not found' });

    await Booth.findByIdAndDelete(booth._id);
    res.json({ message: 'Booth deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { status, eventName, sort } = req.query;

    console.log('Fetching bookings for user:', req.user.userId);

    const filters = { userId: req.user.userId };

    if (status && status !== 'all') {
      filters.status = status;
    }
    if (eventName && eventName !== 'all') {
      filters.eventName = eventName;
    }

    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { bookingDate: 1 };
        break;
      case 'highestPrice':
        sortOptions = { totalPrice: -1 };
        break;
      case 'lowestPrice':
        sortOptions = { totalPrice: 1 };
        break;
      default:
        sortOptions = { bookingDate: -1 };
    }

    const bookings = await Booking.find(filters)
      .populate('boothId', 'id event location size sizeLabel price features')
      .populate('userId', 'firstName lastName email companyName phone')
      .sort(sortOptions)
      .lean();

    console.log(`Found ${bookings.length} bookings for user ${req.user.userId}`);

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      boothNumber: booking.boothNumber || booking.boothId?.id || 'N/A',
      boothId: booking.boothId?._id || booking.boothId,
      eventName: booking.eventName || 'N/A',
      eventDate: booking.eventDate || 'Date TBD',
      venue: booking.venue || booking.boothId?.location || 'Venue TBD',
      location: booking.location || booking.boothId?.location || 'Location TBD',
      totalPrice: booking.totalPrice || 0,
      status: booking.status || 'pending',
      companyName: booking.companyName || booking.userId?.companyName || 'N/A',
      contactPerson:
        booking.contactPerson ||
        `${booking.userId?.firstName} ${booking.userId?.lastName}` ||
        'N/A',
      contactEmail: booking.contactEmail || booking.userId?.email || 'N/A',
      contactPhone: booking.contactPhone || booking.userId?.phone || 'N/A',
      specialRequests: booking.specialRequests || '',
      createdAt: booking.bookingDate || booking.createdAt,
      confirmedAt: booking.status === 'confirmed' ? booking.updatedAt : null
    }));

    res.json({
      success: true,
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'firstName lastName companyName email phone')
      .populate('boothId', 'id event location size sizeLabel price features');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    console.log('Creating new booking...');
    console.log('User:', req.user);
    console.log('Request body:', req.body);

    const {
      boothId,
      companyName,
      contactPerson,
      contactEmail,
      contactPhone,
      specialRequests,
      totalPrice,
      eventName,
      boothNumber,
      eventDate,
      venue,
      location
    } = req.body;

    if (!boothId) {
      return res.status(400).json({
        success: false,
        error: 'Booth ID is required'
      });
    }

    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid total price is required'
      });
    }

    const booth = await Booth.findById(boothId);
    if (!booth) {
      return res.status(404).json({
        success: false,
        error: 'Booth not found'
      });
    }

    if (booth.status === 'booked') {
      return res.status(400).json({
        success: false,
        error: 'This booth is already booked'
      });
    }

    const booking = new Booking({
      boothId,
      userId: req.user.userId,
      companyName: companyName || req.user.companyName || 'N/A',
      contactPerson:
        contactPerson || `${req.user.firstName} ${req.user.lastName}`,
      contactEmail: contactEmail || req.user.email,
      contactPhone: contactPhone || req.user.phone || 'N/A',
      specialRequests: specialRequests || '',
      totalPrice,
      status: 'confirmed',
      eventName: eventName || booth.event || 'N/A',
      boothNumber: boothNumber || booth.id || 'N/A',
      eventDate: eventDate || 'Date TBD',
      venue: venue || booth.location || 'Venue TBD',
      location: location || booth.location || 'Location TBD',
      bookingDate: new Date()
    });

    await booking.save();
    console.log('Booking created:', booking._id);

    booth.status = 'booked';
    booth.exhibitor = req.user.userId;
    await booth.save();
    console.log('Booth status updated to booked');

    res.status(201).json({
      success: true,
      booking: {
        _id: booking._id,
        boothNumber: booking.boothNumber,
        eventName: booking.eventName,
        eventDate: booking.eventDate,
        venue: booking.venue,
        totalPrice: booking.totalPrice,
        status: booking.status,
        companyName: booking.companyName,
        contactPerson: booking.contactPerson,
        contactEmail: booking.contactEmail,
        contactPhone: booking.contactPhone,
        createdAt: booking.bookingDate
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create booking'
    });
  }
});

app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: 'Can only cancel your own bookings' });
    }

    booking.status = 'cancelled';
    await booking.save();

    if (booking.boothId) {
      await Booth.findByIdAndUpdate(booking.boothId, {
        status: 'available',
        statusLabel: 'Available',
        statusClass: 'available',
        exhibitor: null
      });
    }

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete('/api/admin/booths/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booth = await Booth.findByIdAndDelete(req.params.id).lean();
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }
    res.json({ success: true, message: 'Booth deleted' });
  } catch (err) {
    console.error('Error deleting booth:', err);
    res.status(500).json({ success: false, message: 'Failed to delete booth' });
  }
});
app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('userId', 'firstName lastName companyName email phone')
      .populate('boothId', 'id event location size sizeLabel price');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const booth = await Booth.findById(booking.boothId);
    if (booth) {
      booth.status = 'available';
      booth.statusLabel = 'Available';
      booth.statusClass = 'available';
      booth.exhibitor = null;
      await booth.save();
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/admin/booths', authenticateToken, requireAdmin, async (req, res) => {
  const { event, hall, status } = req.query;
  const query = {};
  if (event && event !== 'all') query.event = event;
  if (hall && hall !== 'all') query.location = hall;
  if (status && status !== 'all') query.statusLabel = status;
  const booths = await Booth.find(query).populate('exhibitor').lean();
  res.json({ success: true, booths });
});

app.post('/api/admin/booths', authenticateToken, requireAdmin, async (req, res) => {
  const booth = new Booth(req.body);
  await booth.save();
  res.status(201).json({ success: true, booth });
});

app.put('/api/admin/booths/:id', authenticateToken, requireAdmin, async (req, res) => {
  const booth = await Booth.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!booth) return res.status(404).json({ success: false, message: 'Booth not found' });
  res.json({ success: true, booth });
});
app.get('/api/admin/bookings', authenticateToken, async (req, res) => {
  try {
    console.log('Admin bookings request, user:', req.user);

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, eventName, sort } = req.query;

    const filters = {};

    if (status && status !== 'all') {
      filters.status = status;
    }
    if (eventName && eventName !== 'all') {
      filters.eventName = eventName;
    }

    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { bookingDate: 1 };
        break;
      case 'highestPrice':
        sortOptions = { totalPrice: -1 };
        break;
      case 'lowestPrice':
        sortOptions = { totalPrice: 1 };
        break;
      default:
        sortOptions = { bookingDate: -1 };
    }

    console.log('Admin booking filters:', filters);

    const bookings = await Booking.find(filters)
      .populate('boothId', 'id event location size price')
      .populate('userId', 'firstName lastName email companyName')
      .sort(sortOptions);

    console.log('Admin bookings count:', bookings.length);
    res.json({ bookings });
  } catch (error) {
    console.error('Failed to get admin bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch(
  '/api/admin/bookings/:id/status',
  authenticateToken,
  async (req, res) => {
    try {
      console.log('Admin update booking status:', req.params.id, req.body);

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status } = req.body;

      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      )
        .populate('boothId', 'id event location size price')
        .populate('userId', 'firstName lastName email companyName');

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (status === 'cancelled' && booking.boothId) {
        await Booth.findByIdAndUpdate(booking.boothId._id, {
          status: 'available',
          statusLabel: 'available',
          statusClass: 'available',
          exhibitor: null
        });
      }

      if (status === 'confirmed' && booking.boothId) {
        await Booth.findByIdAndUpdate(booking.boothId._id, {
          status: 'booked',
          statusLabel: 'booked',
          statusClass: 'booked'
        });
      }

      res.json({ message: 'Booking status updated successfully', booking });
    } catch (error) {
      console.error('Failed to update booking status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete('/api/admin/bookings/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Admin delete booking:', req.params.id);

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.boothId) {
      await Booth.findByIdAndUpdate(booking.boothId, {
        status: 'available',
        statusLabel: 'available',
        statusClass: 'available',
        exhibitor: null
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Failed to delete booking:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/exhibitors', authenticateToken, async (req, res) => {
  try {
    const { industry, status, sort } = req.query;

    const filters = { role: 'exhibitor' };

    if (industry && industry !== 'all') {
      filters.industry = industry;
    }
    if (status && status !== 'all') {
      filters.status = status;
    }

    let sortOptions = {};
    switch (sort) {
      case 'nameDesc':
        sortOptions = { firstName: -1 };
        break;
      case 'mostBookings':
        sortOptions = { totalBookings: -1 };
        break;
      case 'highestRevenue':
        sortOptions = { totalSpent: -1 };
        break;
      default:
        sortOptions = { firstName: 1 };
    }

    const exhibitors = await User.find(filters)
      .select('-password')
      .sort(sortOptions);

    const exhibitorsWithStats = await Promise.all(
      exhibitors.map(async exhibitor => {
        const bookings = await Booking.find({ userId: exhibitor._id });
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(
          b => b.status === 'confirmed'
        ).length;
        const totalSpent = bookings.reduce(
          (sum, booking) => sum + (booking.totalPrice || 0),
          0
        );
        const recentBookings = await Booking.find({ userId: exhibitor._id })
          .sort({ bookingDate: -1 })
          .limit(2)
          .populate('boothId');

        return {
          ...exhibitor.toObject(),
          totalBookings,
          activeBookings,
          totalSpent,
          recentBookings: recentBookings.map(booking => ({
            eventName: booking.eventName,
            boothId: booking.boothNumber,
            dateRange: 'Custom Date Range',
            amount: booking.totalPrice
          }))
        };
      })
    );

    res.json({ exhibitors: exhibitorsWithStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/exhibitors/stats', authenticateToken, async (req, res) => {
  try {
    const totalExhibitors = await User.countDocuments({ role: 'exhibitor' });
    const activeExhibitors = await User.countDocuments({
      role: 'exhibitor',
      status: 'active'
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await User.countDocuments({
      role: 'exhibitor',
      registrationDate: { $gte: startOfMonth }
    });

    const revenueResult = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
    ]);

    const totalRevenue =
      revenueResult.length > 0
        ? Math.round(revenueResult[0].totalRevenue / 1000)
        : 0;

    res.json({
      totalExhibitors,
      activeExhibitors,
      newThisMonth,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/exhibitors/:id', authenticateToken, async (req, res) => {
  try {
    const exhibitor = await User.findById(req.params.id).select('-password');
    if (!exhibitor) {
      return res.status(404).json({ error: 'Exhibitor not found' });
    }

    const bookings = await Booking.find({ userId: exhibitor._id })
      .populate('boothId')
      .sort({ bookingDate: -1 });

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(
      b => b.status === 'confirmed'
    ).length;
    const totalSpent = bookings.reduce(
      (sum, booking) => sum + (booking.totalPrice || 0),
      0
    );

    const recentBookings = bookings.slice(0, 2).map(booking => ({
      eventName: booking.eventName,
      boothId: booking.boothNumber,
      dateRange: 'Custom Date Range',
      amount: booking.totalPrice
    }));

    const timeline = [
      {
        text: 'Registered as exhibitor',
        date: exhibitor.registrationDate.toLocaleDateString(),
        meta: 'via sign-up form'
      }
    ];

    if (bookings.length > 0) {
      timeline.push({
        text: 'First booking confirmed',
        date: bookings[bookings.length - 1].bookingDate.toLocaleDateString(),
        meta: bookings[bookings.length - 1].eventName
      });
    }

    if (totalSpent > 50000) {
      timeline.push({
        text: 'Total spent exceeded $50k',
        date: new Date().toLocaleDateString(),
        meta: 'Loyal customer milestone'
      });
    }

    res.json({
      ...exhibitor.toObject(),
      totalBookings,
      activeBookings,
      totalSpent,
      recentBookings,
      timeline
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/exhibitors/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    const exhibitor = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!exhibitor) {
      return res.status(404).json({ error: 'Exhibitor not found' });
    }

    res.json({
      message: 'Exhibitor status updated successfully',
      exhibitor
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/exhibitors/export', authenticateToken, async (req, res) => {
  try {
    const exhibitors = await User.find({ role: 'exhibitor' })
      .select('-password')
      .lean();

    const exportData = await Promise.all(
      exhibitors.map(async exhibitor => {
        const bookings = await Booking.find({ userId: exhibitor._id });
        const totalSpent = bookings.reduce(
          (sum, booking) => sum + (booking.totalPrice || 0),
          0
        );

        return {
          ...exhibitor,
          totalBookings: bookings.length,
          totalSpent
        };
      })
    );

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      totalBooths: await Booth.countDocuments(),
      availableBooths: await Booth.countDocuments({ status: 'available' }),
      bookedBooths: await Booth.countDocuments({ status: 'booked' }),
      maintenanceBooths: await Booth.countDocuments({
        status: 'Maintenance'
      }),
      totalBookings: await Booking.countDocuments(),
      pendingBookings: await Booking.countDocuments({ status: 'pending' }),
      confirmedBookings: await Booking.countDocuments({ status: 'confirmed' }),
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ status: 'active' }),
      totalRevenue: await Booking.aggregate([
        { $match: { status: { $in: ['pending', 'confirmed'] } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]).then(result => result[0]?.total || 0)
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments/process', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod, cardDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const transactionId =
      'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();

    res.json({
      success: true,
      transactionId,
      status: 'completed',
      message: 'Payment processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const paymentData = req.body;

    console.log('Payment record:', paymentData);

    res.status(201).json({
      message: 'Payment record created successfully',
      payment: paymentData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('============================================================');
  console.log('SERVER STARTED');
  console.log('============================================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`Static files root: ${__dirname}`);
  console.log('============================================================');
});