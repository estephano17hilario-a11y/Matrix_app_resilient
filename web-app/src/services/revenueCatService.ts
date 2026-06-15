import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';

const RC_API_KEY_ANDROID = "goog_RyxihFYkPbaoMKdkUyJOVYivfCj";
const RC_API_KEY_IOS = "goog_RyxihFYkPbaoMKdkUyJOVYivfCj";
const ENTITLEMENT_ID = "lux_pro";

/**
 * Initializes the RevenueCat SDK and links it to the Supabase user.
 * Should be called after the user successfully authenticates in Supabase.
 */
export const initRevenueCat = async (supabaseUserId?: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("RevenueCat: Not running on native platform. Web is not supported by Purchases Capacitor plugin.");
    return;
  }

  try {
    // Enable debug logs for development
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    const platform = Capacitor.getPlatform();
    
    // In a real production app, you typically have separate keys for iOS and Android.
    if (platform === 'ios' || platform === 'android') {
      const apiKey = platform === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
      // Pass the appUserID during configuration if available, otherwise configure first
      await Purchases.configure({ 
        apiKey: apiKey,
        appUserID: supabaseUserId // This ensures RC knows exactly who this is from the start if provided
      });
      
      console.log("RevenueCat configured successfully.");
      
      // If we provided a supabaseUserId, ensure we log in with it
      if (supabaseUserId) {
        const { created } = await Purchases.logIn({ appUserID: supabaseUserId });
        console.log(`RevenueCat: User ${created ? 'created' : 'logged in'} with ID: ${supabaseUserId}`);
      }
    }
  } catch (error) {
    console.error("Error configuring RevenueCat:", error);
  }
};

/**
 * Logs in the user with RevenueCat using their Supabase UUID.
 */
export const loginRevenueCat = async (supabaseUserId: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { created } = await Purchases.logIn({ appUserID: supabaseUserId });
    console.log(`RevenueCat: User logged in. Created new user: ${created}`);
    return true;
  } catch (error) {
    console.error("Error logging into RevenueCat:", error);
    return false;
  }
};

/**
 * Helper to robustly check if the customer has any active entitlement or subscription.
 */
const checkEntitlementRobust = (info: any): boolean => {
  if (!info || !info.entitlements) return false;
  
  // 1. Direct entitlement ID check ('lux_pro')
  const hasEntitlement = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  if (hasEntitlement) return true;

  // 2. Case-insensitive / substring match on active entitlements
  const activeKeys = Object.keys(info.entitlements.active || {});
  const hasProKey = activeKeys.some((key: string) => 
    key.toLowerCase().includes('pro') || 
    key.toLowerCase().includes('lux') ||
    key.toLowerCase().includes('default')
  );
  if (hasProKey) return true;

  // 3. Fallback: If there are ANY active entitlements
  if (activeKeys.length > 0) return true;

  // 4. Fallback: If there are any active subscription product IDs
  if (info.activeSubscriptions && info.activeSubscriptions.length > 0) return true;

  return false;
};

/**
 * Checks if the current user has the active 'Lux Pro' entitlement.
 */
export const checkProEntitlement = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return checkEntitlementRobust(customerInfo);
  } catch (error) {
    console.error("Error fetching customer info from RevenueCat:", error);
    throw error;
  }
};

/**
 * Presents the RevenueCat Paywall UI.
 * Returns true if the user successfully purchased or already has the entitlement.
 */
export const showPaywall = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    alert("RevenueCat Paywall is only available on native mobile devices.");
    return false;
  }

  try {
    // Present the native paywall UI configured in the RevenueCat Dashboard
    await RevenueCatUI.presentPaywall();
    
    // After the paywall closes (whether purchased, cancelled, or error),
    // we fetch the latest customer info to see if they now have the entitlement.
    return await checkProEntitlement();
  } catch (error) {
    console.error("Error presenting RevenueCat Paywall:", error);
    return false;
  }
};

/**
 * Presents the RevenueCat Customer Center UI for subscription management.
 */
export const showCustomerCenter = async () => {
  if (!Capacitor.isNativePlatform()) {
    alert("Customer Center is only available on native mobile devices.");
    return;
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    console.error("Error presenting RevenueCat Customer Center:", error);
  }
};

/**
 * Restores previous purchases (e.g., if user changed devices).
 */
export const restorePurchases = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return checkEntitlementRobust(customerInfo);
  } catch (error) {
    console.error("Error restoring purchases:", error);
    return false;
  }
};
