require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- Database Configuration ---
const dbUri = process.env.MONGODB_URI;
if (!dbUri) {
    console.error("Error: MONGODB_URI not found in .env file.");
    process.exit(1); // Exit if DB connection string is missing
}
const dbName = 'memeVotesDB'; // Or extract from URI if preferred
const votesCollectionName = 'votes';
const memesCollectionName = 'memes'; // Optional: To store meme info

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(dbUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db; // Variable to hold the database connection

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        await db.command({ ping: 1 }); // Verify connection
        console.log("Successfully connected to MongoDB Atlas!");

        // Optional: Create unique index on email to enforce one vote per email at DB level
        const votesCollection = db.collection(votesCollectionName);
        await votesCollection.createIndex({ email: 1 }, { unique: true });

    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1); // Exit the application if DB connection fails
    }
}

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, CSS, JS, images)

// --- API Routes ---

// POST /api/vote - Handle a new vote
app.post('/api/vote', async (req, res) => {
    if (!db) {
        return res.status(503).json({ message: "Database not connected" });
    }
    try {
        const { email, memeId } = req.body;

        // Basic Input Validation
        if (!email || !memeId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid input: Please provide a valid email and meme ID." });
        }

        const votesCollection = db.collection(votesCollectionName);

        // Attempt to insert the vote
        // The unique index on 'email' will prevent duplicates
        await votesCollection.insertOne({
            email: email.toLowerCase().trim(), // Store email in lowercase
            memeId: memeId,
            timestamp: new Date()
        });

        res.status(201).json({ message: `Vote for ${memeId} recorded successfully!` });

    } catch (error) {
        if (error.code === 11000) { // Duplicate key error code
            console.warn(`Duplicate vote attempt by ${req.body.email}`);
            return res.status(409).json({ message: "This email address has already voted." });
        }
        console.error("Error processing vote:", error);
        res.status(500).json({ message: "An error occurred while processing your vote." });
    }
});

// GET /api/results - Get vote counts for the admin panel
app.get('/api/results', async (req, res) => {
    if (!db) {
        return res.status(503).json({ message: "Database not connected" });
    }
    try {
        const votesCollection = db.collection(votesCollectionName);

        // 1. Get total vote count
        const totalVotes = await votesCollection.countDocuments();

        // 2. Get individual vote details (optional, for listing)
        const allVotes = await votesCollection.find({}, { projection: { _id: 0, email: 1, memeId: 1, timestamp: 1 } }).toArray();

        // 3. Aggregate counts per meme
        const voteCounts = await votesCollection.aggregate([
            { $group: { _id: "$memeId", count: { $sum: 1 } } }, // Group by memeId and count
            { $sort: { count: -1 } } // Sort by count descending
        ]).toArray();

        res.status(200).json({
            totalVotes: totalVotes,
            voteCounts: voteCounts, // e.g., [{ _id: "Meme 1", count: 5 }, { _id: "Meme 3", count: 2 }]
            allVotes: allVotes      // e.g., [{ email: "...", memeId: "...", timestamp: "..."}]
        });

    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ message: "An error occurred while fetching results." });
    }
});

// --- Serve HTML files ---
// Optional: If you want specific routes for HTML files instead of just static serving
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- Start Server ---
// Connect to DB first, then start the server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}).catch(err => {
    console.error("Application startup failed:", err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log("Shutting down server...");
    await client.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
});