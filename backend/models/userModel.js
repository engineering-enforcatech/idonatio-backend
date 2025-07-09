import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: 'Please provide a valid email'
        }
    },
    organizationName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    nin: {
        type: Number,
        unique: true,
        minlength: 11,
        maxlength: 11
    },
    postalCode: {
        type: Number,
        unique: true,
        minlength: 5,
        maxlength: 5
    },
    role: {
        type: String,
        enum: ["donee", "admin"],
        default: []
    },
    doneeType: {
        type: String,
        enum: ["individual", "organization"],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

const User = mongoose.model("User", userSchema);

export default User;
