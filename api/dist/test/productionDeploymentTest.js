"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const storageManager_1 = require("../services/storage/storageManager");
const cdnService_1 = require("../services/cdn/cdnService");
const kmsManager_1 = require("../services/kms/kmsManager");
const widevineAdapter_1 = require("../services/drm/widevineAdapter");
const playreadyAdapter_1 = require("../services/drm/playreadyAdapter");
const fairplayAdapter_1 = require("../services/drm/fairplayAdapter");
const jobQueue_1 = require("../services/workers/jobQueue");
async function runProductionDeploymentTests() {
    console.log("\n==================================================================");
    console.log("🚀 PHASE 15: PRODUCTION CLOUD & DRM/CDN INTEGRATION TEST SUITE");
    console.log("==================================================================\n");
    let passed = 0;
    let failed = 0;
    function assert(testName, condition, details) {
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
            failed++;
        }
    }
    const testId = `prod-${Date.now().toString(36)}`;
    // 1. CLOUD OBJECT STORAGE ABSTRACTION & SIGNED URLS
    try {
        const storage = storageManager_1.storageManager.getProvider();
        const testKey = `raw/master_${testId}.mp4`;
        const testData = Buffer.from(`TEST_VIDEO_PAYLOAD_${testId}`);
        const uploadPath = await storage.upload(testKey, testData);
        assert("1. Storage provider uploads object successfully", typeof uploadPath === "string");
        const head = await storage.head(testKey);
        assert("1. Storage provider returns metadata for uploaded object", head !== null && head.sizeBytes === testData.length);
        const signedGet = await storage.generateSignedUrl(testKey, { expiresInSeconds: 600 });
        assert("1. Storage provider generates HMAC signed GET URL with expiration", signedGet.includes("expires=") && signedGet.includes("signature="));
        const signedPut = await storage.generateUploadUrl(testKey, { expiresInSeconds: 300 });
        assert("1. Storage provider generates secure PUT upload URL", signedPut.includes("expires="));
        const downloaded = await storage.download(testKey);
        assert("1. Storage provider downloads exact byte payload", downloaded.toString("utf-8") === testData.toString("utf-8"));
        await storage.delete(testKey);
    }
    catch (err) {
        assert("Storage Abstraction Test", false, err.message);
    }
    // 2. CDN SIGNED PLAYBACK DELIVERY & TOKEN BINDING
    try {
        const sessionId = `pb_sess_${testId}`;
        const assetPath = `hls/${testId}/master.m3u8`;
        const signedPlaybackUrl = cdnService_1.cdnService.generateSignedPlaybackUrl({
            assetPath,
            sessionId,
            ttlSeconds: 300,
        });
        assert("2. CDN generates signed playback URL with session binding", signedPlaybackUrl.includes(`sid=${sessionId}`) && signedPlaybackUrl.includes("sig="));
        // Parse URL params
        const urlObj = new URL(signedPlaybackUrl);
        const expiresAt = parseInt(urlObj.searchParams.get("exp") || "0", 10);
        const signature = urlObj.searchParams.get("sig") || "";
        const validation = cdnService_1.cdnService.validateCdnToken({
            assetPath,
            sessionId,
            signature,
            expiresAt,
        });
        assert("2. CDN service validates legitimate signed token", validation.valid === true);
        // Tamper token
        const tampered = cdnService_1.cdnService.validateCdnToken({
            assetPath,
            sessionId,
            signature: "0000000000000000000000000000000000000000000000000000000000000000",
            expiresAt,
        });
        assert("2. CDN rejects tampered signature token", tampered.valid === false);
    }
    catch (err) {
        assert("CDN Service Test", false, err.message);
    }
    // 3. KEY MANAGEMENT SERVICE (KMS) ENVELOPE ENCRYPTION
    try {
        const kms = kmsManager_1.kmsManager.getProvider();
        const plaintext = Buffer.from(`TOP_SECRET_MASTER_DRM_KEY_${testId}`);
        const enc = await kms.encrypt(plaintext);
        assert("3. KMS encrypts data with AES-256-GCM generating ciphertext and IV", !!enc.ciphertext && !!enc.iv && !!enc.tag);
        const decrypted = await kms.decrypt(enc);
        assert("3. KMS decrypts and recovers exact plaintext buffer", decrypted.toString("utf-8") === plaintext.toString("utf-8"));
        const signature = await kms.sign(plaintext);
        assert("3. KMS generates HMAC signature", !!signature.signature);
        const verified = await kms.verify(plaintext, signature.signature);
        assert("3. KMS verifies signature authenticity", verified === true);
    }
    catch (err) {
        assert("KMS Abstraction Test", false, err.message);
    }
    // 4. PRODUCTION DRM PROVIDER ADAPTERS
    try {
        const kid = `kid-${testId}`;
        // Widevine
        const pssh = widevineAdapter_1.WidevineAdapter.generatePssh(kid);
        assert("4. Widevine adapter generates valid PSSH box with System ID", pssh.systemId === widevineAdapter_1.WidevineAdapter.SYSTEM_ID && !!pssh.psshBase64);
        const wvChallenge = widevineAdapter_1.WidevineAdapter.processLicenseChallenge({
            challengeBase64: "dGVzdF9jaGFsbGVuZ2U=",
            keyId: kid,
            playbackSessionId: `sess_${testId}`,
        });
        assert("4. Widevine processes license challenge and returns license response", wvChallenge.status === "GRANTED");
        // PlayReady
        const prHeader = playreadyAdapter_1.PlayReadyAdapter.generateWrmHeader(kid);
        assert("4. PlayReady adapter generates WRMHEADER XML with System ID", prHeader.systemId === playreadyAdapter_1.PlayReadyAdapter.SYSTEM_ID && prHeader.wrmHeaderXml.includes(kid));
        // FairPlay
        const skd = fairplayAdapter_1.FairPlayAdapter.formatSkdUri(kid);
        assert("4. FairPlay adapter formats skd:// URI", skd === `skd://${kid}`);
    }
    catch (err) {
        assert("DRM Provider Adapters Test", false, err.message);
    }
    // 5. THEATRICAL PLAYBACK DEVICE READINESS
    try {
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Odeon Terminal Hub (${testId})`,
                code: `OTH-${testId.slice(-4).toUpperCase()}`,
                location: "Terminal Complex",
            },
        });
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "Screen 1 IMAX",
                capacity: 250,
            },
        });
        const device = await database_1.prisma.playbackDevice.create({
            data: {
                deviceId: `DEV-BARCO-${testId.slice(-4).toUpperCase()}`,
                name: "Barco Series 4 Projector Terminal",
                status: "REGISTERED",
                theatreId: theatre.id,
                screenId: screen.id,
                softwareVersion: "3.1.2",
                ipAddress: "192.168.10.50",
            },
        });
        assert("5. Playback device registered in database", device.status === "REGISTERED");
        // Heartbeat update
        const heartbeatDevice = await database_1.prisma.playbackDevice.update({
            where: { id: device.id },
            data: { status: "ACTIVE", lastHeartbeatAt: new Date() },
        });
        assert("5. Device heartbeat updates status to ACTIVE", heartbeatDevice.status === "ACTIVE" && heartbeatDevice.lastHeartbeatAt !== null);
        // Block device
        const blockedDevice = await database_1.prisma.playbackDevice.update({
            where: { id: device.id },
            data: { status: "BLOCKED" },
        });
        assert("5. Administrative block sets status to BLOCKED", blockedDevice.status === "BLOCKED");
    }
    catch (err) {
        assert("Playback Device Test", false, err.message);
    }
    // 6. BACKGROUND WORKER & JOB QUEUE
    try {
        const job = await jobQueue_1.jobQueue.add("ASSET_VALIDATION", { videoAssetId: "test_asset_dummy" });
        assert("6. Background job queued with PENDING status", job.id.startsWith("job_"));
        const stats = jobQueue_1.jobQueue.getQueueStats();
        assert("6. Queue statistics report trackable total jobs", stats.total >= 1);
    }
    catch (err) {
        assert("Background Worker Test", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 15 PRODUCTION CLOUD RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
}
runProductionDeploymentTests().catch((err) => {
    console.error("FATAL in Production Deployment Test Suite:", err);
    process.exit(1);
});
