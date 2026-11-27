import { useEffect, useState, useCallback } from 'react'; 
import { Purchases, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app';
import { initRevenueCat, hasActiveEntitlement } from '../services/revenueCatService';

const OFFERING_ID = 'default';

type PlanKind = 'weekly' | 'monthly' | 'annual';

/** Finds the weekly / monthly / annual packages of an offering (standard slots first, then by id). */
const pickPackages = (offering: PurchasesOffering) => {
  const find = (type: string, rcId: string, words: string[]) =>
    offering.availablePackages?.find(p =>
      p.packageType === type || p.identifier === rcId || words.some(w => p.identifier.toLowerCase().includes(w))) || null;
  return {
    w: offering.weekly || find('WEEKLY', '$rc_weekly', ['weekly', 'semanal']),
    m: offering.monthly || find('MONTHLY', '$rc_monthly', ['monthly', 'mensual']),
    a: offering.annual || find('ANNUAL', '$rc_annual', ['annual', 'anual', 'yearly']),
  };
};

export const useRevenueCat = () => { 
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null); 
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); 
  const [isPremium, setIsPremium] = useState<boolean>(false); 
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkPremiumStatus = useCallback((info: CustomerInfo) => hasActiveEntitlement(info), []);

  const fetchRevenueCatData = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.warn("RevenueCat: No soportado en la plataforma web.");
      return;
    }

    try {
      await initRevenueCat();
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info.customerInfo);
      setIsPremium(checkPremiumStatus(info.customerInfo));

      const offerings = await Purchases.getOfferings();
            
      // Buscar el offering activo (current) o por sus IDs comunes
      const offering = offerings.current || offerings.all[OFFERING_ID] || offerings.all['default'] || offerings.all['defaultt'] || null;
      if (offering) {
        setCurrentOffering(offering);
        const { w, m, a } = pickPackages(offering);
        setWeeklyPackage(w);
        setMonthlyPackage(m);
        setAnnualPackage(a);
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
          await initRevenueCat();
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

  const comprarPaquete = async (rcPackageOrType: PurchasesPackage | PlanKind): Promise<boolean> => {
    setIsLoading(true);
    try {
      let pkg: PurchasesPackage | null = null;
      if (typeof rcPackageOrType === 'string') {
        pkg = rcPackageOrType === 'weekly' ? weeklyPackage : rcPackageOrType === 'annual' ? annualPackage : monthlyPackage;

        if (!pkg) {
          const offerings = await Purchases.getOfferings();
                    const offering = offerings.current || offerings.all[OFFERING_ID] || offerings.all['default'] || offerings.all['defaultt'] || null;
          if (offering) {
            setCurrentOffering(offering);
            const { w, m, a } = pickPackages(offering);
            setWeeklyPackage(w);
            setMonthlyPackage(m);
            setAnnualPackage(a);
            pkg = rcPackageOrType === 'weekly' ? w : rcPackageOrType === 'annual' ? a : m;
          }
        }
      } else {
        pkg = rcPackageOrType;
      }

      if (!pkg) {
        throw new Error("Suscripción no disponible en este momento. Inténtalo de nuevo.");
      }

      // The purchase must be attributed to the signed-in Supabase user, otherwise the webhook
      // receives an anonymous id and the server can never grant the membership.
      await initRevenueCat();
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
      await initRevenueCat();
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
    annualPackage,
    customerInfo,
    isPremium,
    isLoading,
    comprarPaquete,
    restaurarCompras
  };
};
