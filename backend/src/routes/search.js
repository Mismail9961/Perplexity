// ============================================
// search.js — Route definition for /api/search
// ============================================
// This file just defines the URL routes.
// Express will call the right controller function
// when someone hits POST /api/search
// ============================================

import express from "express";
import searchController from "../controllers/searchController.js";

const router = express.Router();

// POST /api/search
// Body: { "query": "your question here" }
router.post("/", searchController.search);

export default router;
