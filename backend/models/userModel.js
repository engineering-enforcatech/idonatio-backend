import mongoose from "mongoose";
import validator from "validator";
import bcrypt from 'bcrypt';


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


// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Pre-save hook to update passwordChangedAt
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000; // Ensure token is created after
    next();
});

const User = mongoose.model("User", userSchema);

export default User;
