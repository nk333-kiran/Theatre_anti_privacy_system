import { IDrmProvider, DrmProviderName, DrmProviderStatus } from "./types";
import { MockDrmProvider } from "./providers/mockDrmProvider";
import { WidevineDrmProvider } from "./providers/widevineProvider";
import { PlayReadyDrmProvider } from "./providers/playreadyProvider";
import { FairPlayDrmProvider } from "./providers/fairplayProvider";

export class DrmServiceManager {
  private activeProvider: IDrmProvider;

  constructor() {
    const providerName = (process.env.DRM_PROVIDER || "mock").toLowerCase() as DrmProviderName;

    switch (providerName) {
      case "widevine":
        this.activeProvider = new WidevineDrmProvider();
        break;
      case "playready":
        this.activeProvider = new PlayReadyDrmProvider();
        break;
      case "fairplay":
        this.activeProvider = new FairPlayDrmProvider();
        break;
      case "mock":
      default:
        this.activeProvider = new MockDrmProvider();
        break;
    }
  }

  public getProvider(): IDrmProvider {
    return this.activeProvider;
  }

  public async getSafeStatus(): Promise<DrmProviderStatus> {
    return this.activeProvider.getProviderStatus();
  }
}

export const drmServiceManager = new DrmServiceManager();
export const activeDrmProvider = drmServiceManager.getProvider();
