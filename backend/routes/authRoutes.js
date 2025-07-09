import express from "express";
import {
    selectUserType,
    registerUser,
    verifyUser
} from "../controllers/authController.js";

const router = express.Router();


router.post("/select-type", selectUserType); // Step 1: Select user type (individual or organization)

router.post("/register", registerUser); // Step 2: Register user with form data

router.post("/verify", verifyUser); // Step 3: Verify user with code


export default router;