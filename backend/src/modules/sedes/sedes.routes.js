const express = require("express");
const {
  requireAuth,
  requireRole,
} = require("../../middlewares/auth.middleware");
const { getStats } = require("./sedes.controller");

const router = express.Router();

router.get("/stats", requireAuth, requireRole("superadmin"), getStats);

module.exports = router;
