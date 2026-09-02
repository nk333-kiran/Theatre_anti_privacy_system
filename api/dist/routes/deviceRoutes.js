"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deviceController_1 = require("../controllers/deviceController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Heartbeat can be called by authenticated theatre staff / device terminals
router.post("/:id/heartbeat", auth_1.authenticateJwt, deviceController_1.recordDeviceHeartbeat);
// Administrative device management
router.get("/", auth_1.authenticateJwt, deviceController_1.listPlaybackDevices);
router.get("/:id", auth_1.authenticateJwt, deviceController_1.getPlaybackDeviceDetails);
router.post("/register", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN"]), deviceController_1.registerPlaybackDevice);
router.post("/:id/block", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN"]), deviceController_1.blockPlaybackDevice);
router.post("/:id/retire", auth_1.authenticateJwt, (0, auth_1.requireRole)(["ADMIN"]), deviceController_1.retirePlaybackDevice);
exports.default = router;
