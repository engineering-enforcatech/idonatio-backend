import User from "../models/userModel.js";
import { sendVerificationEmail } from "../utils/emailSender.js";
import { generateVerificationCode, verifyCode } from "../utils/verificationCodes.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Step 1: Handle user type selection
export const selectUserType = async (req, res) => {
    try {
        const { doneeType } = req.body;

        if (!doneeType || !["individual", "organization"].includes(doneeType)) {
            return res.status(400).json({
                status: "fail",
                message: "Please select a valid user type (individual or organization)"
            });
        }

        // Create a temporary JWT token containing the user type
        const tempToken = jwt.sign(
            { doneeType, purpose: 'user-type-selection' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } // Token expires in 15 minutes
        );

        res.status(200).json({
            status: "success",
            message: "User type selected successfully",
            tempToken // Send the token to the client
        });
    } catch (err) {
        console.error("Error in selectUserType:", err);
        res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
    }
};


// Step 2: Handle user registration form
export const registerUser = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: "fail",
                message: "No authorization token provided"
            });
        }

        const tempToken = authHeader.split(' ')[1].trim();

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            ignoreExpiration: false
        });


        if (decoded.purpose !== 'user-type-selection') {
            return res.status(401).json({
                status: "fail",
                message: "Invalid token purpose"
            });
        }

        const { doneeType } = decoded;
        const {
            firstName,
            lastName,
            country,
            postalCode,
            nin,
            email,
            password,
            confirmPassword
        } = req.body;

        // Validation checks
        if (password !== confirmPassword) {
            return res.status(400).json({
                status: "fail",
                message: "Passwords do not match"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide a valid email"
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: "fail",
                message: "Email already in use"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userData = {
            firstName,
            lastName,
            country,
            postalCode,
            nin,
            email,
            password: hashedPassword,
            doneeType,
            role: "donee",
            isVerified: false
        };

        // Save user to database
        await User.create(userData);

        const verificationCode = generateVerificationCode(email);
        await sendVerificationEmail(email, verificationCode);

        // Create a temporary JWT token for verification
        const verificationToken = jwt.sign(
            { email, purpose: 'verification' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );


        res.status(200).json({
            status: "success",
            message: "Verification code sent to email",
            tempToken: verificationToken // Send the verification token to the client
        });
    } catch (err) {

        console.error("FULL MONGOOSE ERROR:", {
            name: err.name,
            message: err.message,
            code: err.code,
            keyPattern: err.keyPattern,  // Shows which field caused duplicate key
            stack: err.stack
        });
        throw err;
    }
};

// Step 3: Handle verification code submission
export const verifyUser = async (req, res) => {
    try {
        const { verificationCode, tempToken } = req.body;

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (decoded.purpose !== 'verification') {
            return res.status(401).json({
                status: "fail",
                message: "Invalid token"
            });
        }

        const { email } = decoded;
        const isVerified = verifyCode(email, verificationCode);

        if (!isVerified) {
            return res.status(400).json({
                status: "fail",
                message: "Invalid verification code"
            });
        }

        const user = await User.findOneAndUpdate(
            { email },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "User not found"
            });
        }

        const token = signToken(user._id);
        user.password = undefined;

        res.status(200).json({
            status: "success",
            token,
            data: {
                user
            }
        });
    } catch (err) {
        console.error("Verification Error:", err);

        let errorMessage = "Something went wrong during verification";
        if (err.name === 'JsonWebTokenError') {
            errorMessage = "Invalid or expired token";
        }

        res.status(err.statusCode || 500).json({
            status: "error",
            message: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Login controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide email and password"
            });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                status: "fail",
                message: "Incorrect email or password"
            });
        }

        if (!user.isVerified) {
            return res.status(401).json({
                status: "fail",
                message: "Account not verified. Please verify your email."
            });
        }

        const token = signToken(user._id);
        user.password = undefined;

        res.status(200).json({
            status: "success",
            token,
            data: {
                user
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({
            status: "error",
            message: "Something went wrong during login",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Protect middleware
export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: "fail",
                message: "Please log in to access this resource"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);

        if (!currentUser) {
            return res.status(401).json({
                status: "fail",
                message: "User no longer exists"
            });
        }

        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                status: "fail",
                message: "Password changed recently. Please log in again."
            });
        }

        req.user = currentUser;
        next();
    } catch (err) {
        console.error("Protect Middleware Error:", err);

        let errorMessage = "Authentication failed";
        if (err.name === "JsonWebTokenError") {
            errorMessage = "Invalid token";
        } else if (err.name === "TokenExpiredError") {
            errorMessage = "Session expired. Please log in again.";
        }

        res.status(401).json({
            status: "fail",
            message: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};