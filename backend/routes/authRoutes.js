import express from "express";
import {
    selectUserType,
    registerUser,
    verifyUser,
    login,
    protect
} from "../controllers/authController.js";

const authRouter = express.Router();


authRouter.post("/select-type", selectUserType); // Step 1: Select user type (individual or organization)

authRouter.post("/register", registerUser); // Step 2: Register user with form data

authRouter.post("/verify", verifyUser); // Step 3: Verify user with code

authRouter.post("/login", login); // Login route


// Example protected route. for logoutUser and checkAuth
authRouter.get("/me", protect, (req, res) => {
    res.status(200).json({
        status: "success",
        data: {
            user: req.user
        }
    });
});

export default authRouter;