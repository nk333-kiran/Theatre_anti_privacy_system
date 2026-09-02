import { Router } from "express";
import {
  listPlaybackDevices,
  getPlaybackDeviceDetails,
  registerPlaybackDevice,
  recordDeviceHeartbeat,
  blockPlaybackDevice,
  retirePlaybackDevice,
} from "../controllers/deviceController";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Heartbeat can be called by authenticated theatre staff / device terminals
router.post("/:id/heartbeat", authenticateJwt, recordDeviceHeartbeat);

// Administrative device management
router.get("/", authenticateJwt, listPlaybackDevices);
router.get("/:id", authenticateJwt, getPlaybackDeviceDetails);
router.post("/register", authenticateJwt, requireRole(["ADMIN"]), registerPlaybackDevice);
router.post("/:id/block", authenticateJwt, requireRole(["ADMIN"]), blockPlaybackDevice);
router.post("/:id/retire", authenticateJwt, requireRole(["ADMIN"]), retirePlaybackDevice);

export default router;
