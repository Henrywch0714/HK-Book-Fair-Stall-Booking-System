# HK-Book-Fair-Stall-Booking-System
Event Booth Booking System
==========================

1. Overview
-----------

This project is a full‑stack **event booth booking system** built with:

- Backend: Node.js + Express + Mongoose (MongoDB)
- Database: MongoDB (Atlas or local)
- Frontend: Vanilla HTML, CSS, and JavaScript

It supports two main user roles:

- **Admin** – manages events, booths, exhibitors, and bookings.
- **Exhibitor** – registers, logs in, views available booths, makes bookings, and manages their reservations.

The system provides:

- Admin dashboard and management pages
- Exhibitor dashboard and booking pages
- Authentication (login / register)
- Booth visualization / layout
- Booking management with status tracking
- Basic user & company profile settings


2. Project Structure
--------------------

Key folders and files:

- `server.js`  
  Main Node.js server entry point (Express app, API routes, static file serving).

- `package.json` / `package-lock.json`  
  Project metadata and dependencies (Express, Mongoose, etc.).

- `/src` – Frontend JavaScript for each page:
  - `admin-bookings.js` – Admin bookings management (list, filter, update statuses).
  - `admin-booth-management.js` – CRUD and status updates for booths.
  - `admin-dashboard.js` – Admin dashboard logic, high-level stats.
  - `admin-event-management.js` – Event creation/editing and status management.
  - `admin-exhibitor-management.js` – Manage exhibitor accounts and statuses.
  - `admin-settings.js` – Admin configuration/settings.
  - `api-service.js` – Reusable API helper (fetch wrappers, base URLs, etc.).
  - `booth-booking-svg.js` – Booth map / SVG-based booth selection.
  - `booth-layout.js` – Layout rendering and booth information on exhibitor side.
  - `exhibitor-dashboard.js` – Exhibitor overview (their bookings, events, etc.).
  - `login.js` – Login form logic and authentication API calls.
  - `my-bookings.js` – Exhibitor bookings list and details.
  - `payment.js` – Payment flow UI (and calling payment-related endpoints if present).
  - `register.js` – Registration form for new exhibitors.
  - `settings.js` – User profile and account settings.

- `/style` – CSS styles for each page:
  - `admin-bookings.css`
  - `admin-dashboard.css`
  - `admin-event-management.css`
  - `admin-exhibitor-management.css`
  - `admin-settings.css`
  - `booth-booking-svg.css`
  - `booth-layout.css`
  - `exhibitor-dashboard.css`
  - `login.css`
  - `my-bookings.css`
  - `payment.css`
  - `register.css`
  - `settings.css`

- `/webContent` – HTML pages and static assets:
  - Admin pages:
    - `admin-bookings.html`
    - `admin-booth-management.html`
    - `admin-dashboard.html`
    - `admin-event-management.html`
    - `admin-exhibitor-management.html`
    - `admin-settings.html`
  - Exhibitor / public pages:
    - `booth-booking-svg.html`
    - `booth-layout.html`
    - `exhibitor-dashboard.html`
    - `login.html`
    - `my-bookings.html`
    - `payment.html`
    - `register.html`
    - `settings.html`
  - Assets:
    - `/webContent/assets/image1.png` … `image8.png`
      (UI illustrations, icons, or demo images)

  These HTML files are typically served as static files by `server.js` and use
  the corresponding JS and CSS from `/src` and `/style`.


3. Data Models (Mongoose Schemas)
---------------------------------

The backend uses Mongoose schemas to define the core domain entities.

3.1. User
---------

```js
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
Purpose

Stores both exhibitor and admin accounts.
Authentication is typically based on email + password.
Exhibitor company details: companyName, industry, companySize, companyAddress.
role controls access to admin or exhibitor areas.
status lets admins disable or activate accounts.
3.2. Booth
javascript
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

Purpose

Represents an individual booth within an event.
Linked to:
eventId → Event
exhibitor → User who has booked the booth.
status shows if a booth is:
available
booked
maintenance
features can store perks like electricity, WiFi, corner booth, etc.
statusLabel / statusClass are often used for front-end display (e.g., colored badges).
3.3. Booking
javascript
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

Purpose

Represents a booking made by an exhibitor for a booth.
References:
boothId → Booth being booked.
userId → User / exhibitor who made the booking.
Contact details and companyName are duplicated for snapshot consistency.
status lifecycle: pending, confirmed, cancelled, booked.
timestamps: true automatically adds createdAt and updatedAt.
3.4. Event
javascript
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

Purpose

Represents an event or exhibition where booths are sold.
status tracks the event lifecycle: upcoming, ongoing, completed, cancelled, draft.
maxBooths, boothPrice, boothSizes, priceTiers help control booth configuration.
registrationOpen controls whether exhibitors can still make bookings.
imageUrl is available for event banner / thumbnail display.
Key Features
Admin Features

Login as admin.
View a dashboard with event / booth / booking statistics.
Manage events:
Create, edit, cancel, or complete events.
Configure booth prices, sizes, and capacities.
Manage booths:
Create and update booths per event.
Set booth status (available, booked, maintenance).
Manage exhibitors:
View exhibitor profiles and companies.
Activate / deactivate accounts.
Manage bookings:
View all bookings.
Change booking status (pending, confirmed, cancelled, booked).
System settings (via admin settings page).
Exhibitor Features

Register a new exhibitor account.
Login and access exhibitor dashboard.
View events and booth layout (including SVG-based visual map).
Book available booths for specific events.
Provide company and contact information and special requests.
View and manage their own bookings (my bookings).
Make or simulate payments (depending on implementation in payment.js).
Manage profile and settings.
Requirements
Node.js: v16+ recommended
npm: v8+ recommended
MongoDB:
MongoDB Atlas cluster or a local MongoDB instance
Network access from your machine to the MongoDB instance
Environment variables (recommended):

MONGODB_URI – MongoDB connection string
PORT – Port for the server (optional, default often 3000 or 8080)
Installation
Clone or download the project

Place the project folder on your machine.
Open a terminal in the project root (where package.json and server.js are located).
Install dependencies

bash
npm install

Configure environment

Create a .env file (if used) or set environment variables directly.
Example .env content (do not commit real credentials):

env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority
PORT=3000

Run the server

Depending on your package.json scripts:

If there is a "start" script:

bash
npm start

Otherwise, run server.js directly:

bash
node server.js

Open the application

Open a browser and navigate to:

http://localhost:3000/ or http://localhost:<PORT>/
Use the different HTML entry points under /webContent, for example:
/webContent/login.html
/webContent/admin-dashboard.html
/webContent/exhibitor-dashboard.html
etc.
In production, server.js will usually serve these HTML files via routes
(e.g., /login, /admin/dashboard) instead of direct file paths.

Development Notes

Authentication & passwords

The password field is currently a plain string in the schema.
In a real deployment, you must hash passwords (e.g., with bcrypt)
and never store them in plain text.
Authorization

Use the role field of User (admin / exhibitor) to protect admin
routes and pages.
Consistency

Some booking fields (eventName, venue, boothNumber, etc.) are denormalized
from the Event and Booth models for convenience and historical accuracy.
Status workflows

Keep the status transitions consistent:
Event: draft → upcoming → ongoing → completed (or cancelled)
Booth: available → booked / maintenance
Booking: pending → confirmed / cancelled / booked
Front-end

Each HTML in /webContent has:
A matching JS file in /src
A matching CSS file in /style
Make sure paths in the HTML files correctly reference these resources.
Troubleshooting
Cannot connect to MongoDB

Check MONGODB_URI (username, password, host, database name).
For MongoDB Atlas, ensure your IP is added to the Atlas IP Access List.
404 or 500 errors on pages

Verify that server.js correctly serves the static /webContent, /src,
and /style folders.
Check console logs on the server for stack traces.
Front-end not loading JS/CSS

Confirm that script and link tags in HTML point to the right paths
(e.g., /src/login.js, /style/login.css).
Admin access

Make sure at least one user account has role: 'admin'.
You may need a seed script or manual creation via MongoDB shell/Compass.
