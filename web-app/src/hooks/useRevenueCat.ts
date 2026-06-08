import { useEffect, useState, useCallback } from 'react'; 
import { Purchases, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app';

const ENTITLEMENT_ID = 'lux_pro_access';

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
      if (offerings.current) {
        setCurrentOffering(offerings.current);
        setWeeklyPackage(offerings.current.weekly || null);
        setMonthlyPackage(offerings.current.monthly || null);
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

  const comprarPaquete = async (rcPackage: PurchasesPackage): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await Purchases.purchasePackage({ aPackage: rcPackage });
      const active = checkPremiumStatus(result.customerInfo);
      setIsPremium(active);
      setCustomerInfo(result.customerInfo);
      return active;
    } catch (e: any) {
      // Check for cancel code: e.userCancelled is standard in Capacitor, e.code === 'USER_CANCELLED' or 1 represents cancel
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
