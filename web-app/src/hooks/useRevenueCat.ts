import { useEffect, useState } from 'react'; 
import { Purchases, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app';

export const useRevenueCat = () => { 
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null); 
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); 
  const [isPremium, setIsPremium] = useState<boolean>(false); 

  useEffect(() => { 
    const fetchRevenueCatData = async () => { 
      const platform = Capacitor.getPlatform(); 
      if (platform !== 'android' && platform !== 'ios') { 
        console.warn("RevenueCat no está soportado en la web nativamente en este SDK."); 
        return; 
      } 

      try {
        // 1. Ver si el usuario ya es premium (revisa tu entitlement 'Lux Pro' o el nombre que le pusiste) 
        const info = await Purchases.getCustomerInfo(); 
        setCustomerInfo(info.customerInfo); 
        setIsPremium(typeof info.customerInfo.entitlements.active['Lux Pro'] !== "undefined"); 

        // 2. Traer tu Offering 'default' y el paquete 'weekly' 
        const offerings = await Purchases.getOfferings(); 
        if (offerings.current !== null) { 
          setCurrentOffering(offerings.current); 
        } 
      } catch (e) { 
        console.error("Error trayendo los datos de RevenueCat:", e); 
      } 
    }; 

    fetchRevenueCatData(); 

    // ESTA ES LA MAGIA: Cada vez que el usuario vuelve a abrir la app 
    const appStateListener = App.addListener('appStateChange', async ({ isActive }) => { 
      if (isActive) { 
        const platform = Capacitor.getPlatform(); 
        if (platform !== 'android' && platform !== 'ios') return;

        console.log("App en primer plano: Verificando suscripción silenciosamente..."); 
        try { 
          const info = await Purchases.getCustomerInfo(); 
          // Si el mes ya pasó y no renovó, RevenueCat devolverá "undefined" 
          const isStillPro = typeof info.customerInfo.entitlements.active['Lux Pro'] !== "undefined"; 
          
          setIsPremium(isStillPro); 
        } catch (e) { 
          console.error("Error verificando estado en background", e); 
        } 
      } 
    }); 

    return () => { 
      appStateListener.then(listener => listener.remove()); 
    }; 
  }, []); 

  // Función para disparar el paywall 
  const purchasePackage = async (rcPackage: PurchasesPackage): Promise<boolean> => { 
    console.log("1. INICIANDO PROCESO DE COMPRA..."); 
    try { 
      const result = await Purchases.purchasePackage({ aPackage: rcPackage }); 
      console.log("2. RESPUESTA CRUDA DE REVENUECAT:", result); 
      
      const { customerInfo } = result; 
  
      console.log("3. ENTITLEMENTS ACTIVOS:", JSON.stringify(customerInfo.entitlements.active, null, 2)); 
  
      // Usando el ID real que confirmamos 
      if (typeof customerInfo.entitlements.active['Lux Pro'] !== "undefined") { 
        console.log("4. ¡ÉXITO! EL USUARIO YA ES LUX PRO."); 
        setIsPremium(true); 
        return true;
      } else { 
        console.warn("4. ALERTA: La compra pasó, pero no detectó el ID 'Lux Pro'."); 
        return false;
      } 
    } catch (e: any) { 
      // AHORA IMPRIMIMOS TODO, SIN IMPORTAR QUÉ SEA 
      console.error("X. ERROR DURANTE LA COMPRA:", e); 
      console.log("CÓDIGO DE ERROR DE REVENUECAT:", e.code); 
      return false;
    } 
  }; 

  return { currentOffering, customerInfo, isPremium, purchasePackage }; 
};
