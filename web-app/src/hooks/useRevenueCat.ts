import { useEffect, useState, useCallback } from 'react'; 
import { Purchases, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app';

const ENTITLEMENT_ID = 'lux_pro';
const OFFERING_ID = 'defaultt';

export const useRevenueCat = () => { 
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null); 
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); 
  const [isPremium, setIsPremium] = useState<boolean>(false); 
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkPremiumStatus = useCallback((info: CustomerInfo) => {
    return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
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
      
      // Buscar específicamente el offering por su ID "defaultt"
      const offering = offerings.all[OFFERING_ID] || null;
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
          const offering = offerings.all[OFFERING_ID];
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
      const active = checkPremiumStatus(result.customerInfo);
      setIsPremium(active);
      setCustomerInfo(result.customerInfo);
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
      const active = checkPremiumStatus(result.customerInfo);
      setIsPremium(active);
      setCustomerInfo(result.customerInfo);
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
