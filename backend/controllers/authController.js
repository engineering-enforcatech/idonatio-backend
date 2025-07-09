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

const hashedPassword = async (password) => {
    return await bcrypt.hash(password, 12);
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

        // Store user type in session to use in next step
        req.session.signupData = { doneeType };

        res.status(200).json({
            status: "success",
            message: "User type selected successfully"
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
    }
};

// Step 2: Handle user registration form
export const registerUser = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            country,
            postalCode,
            nin,
            email,
            password,
            confirmPassword,
            organizationName
        } = req.body;

        // Validation checks
        if (!doneeType || !["individual", "organization"].includes(doneeType)) {
            return res.status(400).json({
                status: "fail",
                message: "Please select a valid user type (individual or organization)"
            });
        }

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

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: "fail",
                message: "Email already in use"
            });
        }

        // Create user data object
        const userData = {
            firstName,
            lastName,
            country,
            postalCode,
            nin,
            email,
            password: hashedPassword,
            doneeType: req.session.signupData.doneeType,
            role: "donee",
            isVerified: false,
        };

        // Generate and send verification code
        const verificationCode = generateVerificationCode(email);
        await sendVerificationEmail(email, verificationCode);

        // Create temporary token for verification step
        const tempToken = jwt.sign(
            { email, purpose: 'verification' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } // Same as verification code expiration
        );


        res.status(200).json({
            status: "success",
            message: "Verification code sent to email"
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Something went wrong during registration"
        });
    }
};

// Step 3: Handle verification code submission
export const verifyUser = async (req, res) => {
    try {
        const { verificationCode, tempToken } = req.body;

        // Verify the temporary token
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (decoded.purpose !== 'verification') {
            return res.status(401).json({
                status: "fail",
                message: "Invalid token"
            });
        }


        const { userData } = req.session.signupData || {};

        if (!userData) {
            return res.status(400).json({
                status: "fail",
                message: "Registration session expired. Please start again."
            });
        }

        const { email } = decoded;

        // Verify the code
        const isVerified = verifyCode(email, verificationCode);

        if (!isVerified) {
            return res.status(400).json({
                status: "fail",
                message: "Invalid verification code"
            });
        }

        // Update user to verified
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

        // Create proper JWT token for authentication
        const token = signToken(user._id);

        // Remove password from output
        user.password = undefined;

        res.status(201).json({
            status: "success",
            token,
            data: {
                user
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: "fail",
                message: "Invalid or expired token. Please register again."
            });
        }
        res.status(500).json({
            status: "error",
            message: "Something went wrong during verification"
        });
    }
};


// Login controller (additional)
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Please provide email and password"
            });
        }

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                status: "fail",
                message: "Incorrect email or password"
            });
        }

        // 3) Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                status: "fail",
                message: "Account not verified. Please verify your email."
            });
        }

        // 4) If everything ok, send token to client
        const token = signToken(user._id);

        // Remove password from output
        user.password = undefined;

        res.status(200).json({
            status: "success",
            token,
            data: {
                user
            }
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Something went wrong during login"
        });
    }
};


// Protect middleware (for protected routes)
export const protect = async (req, res, next) => {
    try {
        // 1) Getting token and check if it's there
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: "fail",
                message: "You are not logged in! Please log in to get access."
            });
        }

        // 2) Verification token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: "fail",
                message: "The user belonging to this token no longer exists."
            });
        }

        // 4) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                status: "fail",
                message: "User recently changed password! Please log in again."
            });
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        next();
    } catch (err) {
        res.status(401).json({
            status: "fail",
            message: "Invalid token. Please log in again."
        });
    }
};