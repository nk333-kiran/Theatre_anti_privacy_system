"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeDrmProvider = exports.drmServiceManager = exports.DrmServiceManager = void 0;
const mockDrmProvider_1 = require("./providers/mockDrmProvider");
const widevineProvider_1 = require("./providers/widevineProvider");
const playreadyProvider_1 = require("./providers/playreadyProvider");
const fairplayProvider_1 = require("./providers/fairplayProvider");
class DrmServiceManager {
    activeProvider;
    constructor() {
        const providerName = (process.env.DRM_PROVIDER || "mock").toLowerCase();
        switch (providerName) {
            case "widevine":
                this.activeProvider = new widevineProvider_1.WidevineDrmProvider();
                break;
            case "playready":
                this.activeProvider = new playreadyProvider_1.PlayReadyDrmProvider();
                break;
            case "fairplay":
                this.activeProvider = new fairplayProvider_1.FairPlayDrmProvider();
                break;
            case "mock":
            default:
                this.activeProvider = new mockDrmProvider_1.MockDrmProvider();
                break;
        }
    }
    getProvider() {
        return this.activeProvider;
    }
    async getSafeStatus() {
        return this.activeProvider.getProviderStatus();
    }
}
exports.DrmServiceManager = DrmServiceManager;
exports.drmServiceManager = new DrmServiceManager();
exports.activeDrmProvider = exports.drmServiceManager.getProvider();
