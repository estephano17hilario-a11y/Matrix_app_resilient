import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';

// Public SDK key (safe to ship). The app is Android-only; the iOS entry is kept for a future port.
const RC_API_KEY_ANDROID = "goog_RyxihFYkPbaoMKdkUyJOVYivfCj";
const RC_API_KEY_IOS = "goog_RyxihFYkPbaoMKdkUyJOVYivfCj";
export const ENTITLEMENT_ID = "lux_pro";

let configurePromise: Promise<void> | null = null;
/** The Supabase user id RevenueCat is currently logged in as (null = anonymous / signed out). */
let currentAppUserId: string | null = null;
/** Last user id handed to us by auth, so id-less callers (hooks) never fall back to an anonymous user. */
let lastKnownUserId: string | null = null;

const configure = (): Promise<void> => {
  if (!configurePromise) {
    configurePromise = (async () => {
      try {
        await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN });
        const apiKey = Capacitor.getPlatform() === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
        await Purchases.configure({ apiKey, appUserID: lastKnownUserId ?? undefined });
        currentAppUserId = lastKnownUserId;
      } catch (error) {
        configurePromise = null; // allow a retry
        throw error;
      }
    })();
  }
  return configurePromise;
};

/**
 * Makes sure the SDK is configured AND logged in as `supabaseUserId`.
 * Purchases made while logged in as another id (or anonymously) would never reach the webhook,
 * so every entry point goes through here.
 */
export const initRevenueCat = async (supabaseUserId?: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  if (supabaseUserId) lastKnownUserId = supabaseUserId;
  await configure();

  const wanted = supabaseUserId ?? lastKnownUserId;
  if (wanted && currentAppUserId !== wanted) {
    await Purchases.logIn({ appUserID: wanted });
    currentAppUserId = wanted;
  }
};

/** Logs the user in with RevenueCat using their Supabase UUID. */
export const loginRevenueCat = async (supabaseUserId: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await initRevenueCat(supabaseUserId);
    return true;
  } catch (error) {
    console.error("RevenueCat login failed:", error);
    return false;
  }
};

/**
 * Detaches the device from the current account. Without this the next person to sign in on the same
 * phone would inherit the previous user's entitlement.
 */
export const logoutRevenueCat = async (): Promise<void> => {
  lastKnownUserId = null;
  if (!Capacitor.isNativePlatform() || !configurePromise) return;
  try {
    await configurePromise;
    if (currentAppUserId) await Purchases.logOut();
  } catch (error) {
    // logOut throws if the SDK is already anonymous; nothing to undo then.
    console.warn("RevenueCat logout:", error);
  } finally {
    currentAppUserId = null;
  }
};

/**
 * True when the customer holds an active `lux_pro` entitlement (or, defensively, any active entitlement:
 * the app sells a single product line, so a differently named one is still "Pro").
 */
export const hasActiveEntitlement = (info: any): boolean => {
  const active = info?.entitlements?.active;
  if (!active) return false;
  if (typeof active[ENTITLEMENT_ID] !== 'undefined') return true;
  return Object.keys(active).length > 0;
};

/** Checks if the current user has an active PRO entitlement in RevenueCat. Throws on SDK/network errors. */
export const checkProEntitlement = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  await initRevenueCat();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return hasActiveEntitlement(customerInfo);
};

/** Presents the RevenueCat Paywall UI. Returns true if the user ends up with the entitlement. */
export const showPaywall = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await initRevenueCat();
    await RevenueCatUI.presentPaywall();
    return await checkProEntitlement();
  } catch (error) {
    console.error("Error presenting RevenueCat Paywall:", error);
    return false;
  }
};

/** Presents the RevenueCat Customer Center for subscription management. */
export const showCustomerCenter = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await initRevenueCat();
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    console.error("Error presenting RevenueCat Customer Center:", error);
  }
};

/** Restores previous purchases (new device / reinstall). */
export const restorePurchases = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.restorePurchases();
    return hasActiveEntitlement(customerInfo);
  } catch (error) {
    console.error("Error restoring purchases:", error);
    return false;
  }
};
