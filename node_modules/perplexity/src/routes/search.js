// ============================================
// search.js — Route definition for /api/search
// ============================================
// This file just defines the URL routes.
// Express will call the right controller function
// when someone hits POST /api/search
// ============================================

import express from "express";
import searchController from "../controllers/searchController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", searchController.search);
router.get("/history", searchController.getHistory);
router.get("/history/:threadId", searchController.getThreadHistory);
router.get("/tokens", searchController.getTokenStatus);
router.post("/llm-keys", searchController.addUserLlmKey);
router.get("/llm-keys", searchController.listUserLlmKeys);
router.delete("/llm-keys/:keyId", searchController.removeUserLlmKey);
router.delete("/history", searchController.clearHistory);

export default router;
