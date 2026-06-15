import { useEffect, useState, useCallback } from 'react'; 
import { Purchases, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app';

const ENTITLEMENT_ID = 'lux_pro';
const OFFERING_ID = 'default';

export const useRevenueCat = () => { 
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null); 
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); 
  const [isPremium, setIsPremium] = useState<boolean>(false); 
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkPremiumStatus = useCallback((info: CustomerInfo) => {
    if (!info || !info.entitlements) return false;
    
    // 1. Direct check for hardcoded entitlement ID ('lux_pro')
    const hasEntitlement = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    if (hasEntitlement) return true;

    // 2. Case-insensitive / substring match on active entitlements
    const activeKeys = Object.keys(info.entitlements.active || {});
    const hasProKey = activeKeys.some(key => 
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
  }, []);

  const fetchRevenueCatData = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.warn("RevenueCat: No soportado en la plataforma web.");
      return;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info.customerInfo);
      setIsPremium(checkPremiumStatus(info.customerInfo));

      const offerings = await Purchases.getOfferings();
      console.log("RevenueCat offerings on mount:", offerings);
      
      // Buscar el offering activo (current) o por sus IDs comunes
      const offering = offerings.current || offerings.all[OFFERING_ID] || offerings.all['default'] || offerings.all['defaultt'] || null;
      if (offering) {
        setCurrentOffering(offering);
        
        let w = offering.weekly || null;
        if (!w && offering.availablePackages) {
          w = offering.availablePackages.find(p => 
            p.packageType === 'WEEKLY' || 
            p.identifier === '$rc_weekly' || 
            p.identifier.toLowerCase().includes('weekly') ||
            p.identifier.toLowerCase().includes('semanal')
          ) || null;
        }
        setWeeklyPackage(w);

        let m = offering.monthly || null;
        if (!m && offering.availablePackages) {
          m = offering.availablePackages.find(p => 
            p.packageType === 'MONTHLY' || 
            p.identifier === '$rc_monthly' || 
            p.identifier.toLowerCase().includes('monthly') ||
            p.identifier.toLowerCase().includes('mensual')
          ) || null;
        }
        setMonthlyPackage(m);
      }
    } catch (e) {
      console.error("Error al obtener datos de RevenueCat:", e);
    }
  }, [checkPremiumStatus]);

  useEffect(() => {
    fetchRevenueCatData();

    const appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && Capacitor.isNativePlatform()) {
        try {
          const info = await Purchases.getCustomerInfo();
          setIsPremium(checkPremiumStatus(info.customerInfo));
        } catch (e) {
          console.error("Error verificando suscripción en background:", e);
        }
      }
    });

    return () => {
      appStateListener.then(listener => listener.remove());
    };
  }, [fetchRevenueCatData, checkPremiumStatus]);

  const comprarPaquete = async (rcPackageOrType: PurchasesPackage | 'weekly' | 'monthly'): Promise<boolean> => {
    setIsLoading(true);
    try {
      let pkg: PurchasesPackage | null = null;
      if (typeof rcPackageOrType === 'string') {
        if (rcPackageOrType === 'weekly') pkg = weeklyPackage;
        else pkg = monthlyPackage;

        if (!pkg) {
          const offerings = await Purchases.getOfferings();
          console.log("RevenueCat offerings on demand:", offerings);
          const offering = offerings.current || offerings.all[OFFERING_ID] || offerings.all['default'] || offerings.all['defaultt'] || null;
          if (offering) {
            setCurrentOffering(offering);
            
            let w = offering.weekly || null;
            if (!w && offering.availablePackages) {
              w = offering.availablePackages.find(p => 
                p.packageType === 'WEEKLY' || 
                p.identifier === '$rc_weekly' || 
                p.identifier.toLowerCase().includes('weekly')
              ) || null;
            }
            
            let m = offering.monthly || null;
            if (!m && offering.availablePackages) {
              m = offering.availablePackages.find(p => 
                p.packageType === 'MONTHLY' || 
                p.identifier === '$rc_monthly' || 
                p.identifier.toLowerCase().includes('monthly')
              ) || null;
            }
            
            setWeeklyPackage(w);
            setMonthlyPackage(m);
            pkg = rcPackageOrType === 'weekly' ? w : m;
          }
        }
      } else {
        pkg = rcPackageOrType;
      }

      if (!pkg) {
        throw new Error("Suscripción no disponible en este momento. Inténtalo de nuevo.");
      }

      console.log("Starting purchase process for package:", pkg);
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      let active = checkPremiumStatus(result.customerInfo);
      let info = result.customerInfo;

      if (!active) {
        console.log("Purchase succeeded but entitlement not active yet. Retrying CustomerInfo check...");
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            console.log(`Checking CustomerInfo (attempt ${i + 1}/3)...`);
            const refreshed = await Purchases.getCustomerInfo();
            active = checkPremiumStatus(refreshed.customerInfo);
            info = refreshed.customerInfo;
            if (active) {
              console.log("Entitlement activated successfully during retry check.");
              break;
            }
          } catch (err) {
            console.warn("Error refreshing customer info during retry:", err);
          }
        }
      }

      setIsPremium(active);
      setCustomerInfo(info);
      return active;
    } catch (e: any) {
      if (e.userCancelled || e.code === 'USER_CANCELLED' || e.code === 1 || e.code === '1') {
        console.log("Compra cancelada por el usuario.");
      } else {
        console.error("Error al procesar la compra en RevenueCat:", e);
        throw e;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restaurarCompras = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await Purchases.restorePurchases();
      let active = checkPremiumStatus(result.customerInfo);
      let info = result.customerInfo;

      if (!active) {
        console.log("Restore succeeded but entitlement not active yet. Retrying CustomerInfo check...");
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            console.log(`Checking CustomerInfo (attempt ${i + 1}/3)...`);
            const refreshed = await Purchases.getCustomerInfo();
            active = checkPremiumStatus(refreshed.customerInfo);
            info = refreshed.customerInfo;
            if (active) {
              console.log("Entitlement activated successfully during retry check.");
              break;
            }
          } catch (err) {
            console.warn("Error refreshing customer info during retry:", err);
          }
        }
      }

      setIsPremium(active);
      setCustomerInfo(info);
      return active;
    } catch (e: any) {
      console.error("Error al restaurar compras:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentOffering,
    weeklyPackage,
    monthlyPackage,
    customerInfo,
    isPremium,
    isLoading,
    comprarPaquete,
    restaurarCompras
  };
};
