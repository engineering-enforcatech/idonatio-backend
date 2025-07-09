import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;


try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected Successfully");
} catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
}

app.use(cors());
app.use(express.json());


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
