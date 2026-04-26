import express from "express";
import authController from "../controllers/authController.js";


const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/oauth/:provider", authController.oauthSignIn);
router.post("/oauth/callback", authController.oauthCallback);


export default router;