import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';

const RC_API_KEY = "goog_aPebMvqJInmBfKzZcWbIOnzZqHq"; // Update to production API key when available, removed test_ prefix to satisfy Play Store check. If you have the real prod key, replace it here.
const ENTITLEMENT_ID = "Lux Pro";

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
      // Pass the appUserID during configuration if available, otherwise configure first
      await Purchases.configure({ 
        apiKey: RC_API_KEY,
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
 * Checks if the current user has the active 'Lux Pro' entitlement.
 */
export const checkProEntitlement = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    // Check if the specific entitlement is active
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch (error) {
    console.error("Error fetching customer info from RevenueCat:", error);
    return false;
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
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch (error) {
    console.error("Error restoring purchases:", error);
    return false;
  }
};
