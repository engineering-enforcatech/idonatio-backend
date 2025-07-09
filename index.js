import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRouter from './backend/routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;


app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());


try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected Successfully");
} catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
}


// Routes
app.use('/api/auth', authRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: "error",
        message: "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
