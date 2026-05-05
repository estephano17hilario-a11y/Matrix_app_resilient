import { useEffect, useState } from 'react'; 
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor'; 
import { Capacitor } from '@capacitor/core'; 

// Reemplaza estas con tus Public API Keys de la sección "Apps & providers" de RevenueCat 
const API_KEY_ANDROID = "test_OtemQPGOYBmJYcHcYmeMPxmjMTw"; 
const API_KEY_IOS = "test_OtemQPGOYBmJYcHcYmeMPxmjMTw"; 

export const useRevenueCat = () => { 
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null); 
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null); 
  const [isPremium, setIsPremium] = useState<boolean>(false); 

  useEffect(() => { 
    const initRevenueCat = async () => { 
      // 1. Activar logs: Esto es vital ahora mismo para ver en la consola si conecta bien a la Test Store 
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); 

      // 2. Inicializar según la plataforma 
      const platform = Capacitor.getPlatform(); 
      if (platform === 'android') { 
        await Purchases.configure({ apiKey: API_KEY_ANDROID }); 
      } else if (platform === 'ios') { 
        await Purchases.configure({ apiKey: API_KEY_IOS }); 
      } else { 
        console.warn("RevenueCat no está soportado en la web nativamente en este SDK."); 
        return; 
      } 

      // 3. Ver si el usuario ya es premium (revisa tu entitlement 'Lux Pro' o el nombre que le pusiste) 
      const info = await Purchases.getCustomerInfo(); 
      setCustomerInfo(info.customerInfo); 
      setIsPremium(typeof info.customerInfo.entitlements.active['ent1b5c1fea56a'] !== "undefined"); 

      // 4. Traer tu Offering 'default' y el paquete 'weekly' 
      try { 
        const offerings = await Purchases.getOfferings(); 
        if (offerings.current !== null) { 
          setCurrentOffering(offerings.current); 
        } 
      } catch (e) { 
        console.error("Error trayendo los productos:", e); 
      } 
    }; 

    initRevenueCat(); 
  }, []); 

  // Función para disparar el paywall 
  const purchasePackage = async (rcPackage: PurchasesPackage) => { 
    console.log("1. INICIANDO PROCESO DE COMPRA..."); 
    try { 
      const result = await Purchases.purchasePackage({ aPackage: rcPackage }); 
      console.log("2. RESPUESTA CRUDA DE REVENUECAT:", result); 
      
      const { customerInfo } = result; 
  
      console.log("3. ENTITLEMENTS ACTIVOS:", JSON.stringify(customerInfo.entitlements.active, null, 2)); 
  
      // Usando el ID real que confirmamos 
      if (typeof customerInfo.entitlements.active['ent1b5c1fea56a'] !== "undefined") { 
        console.log("4. ¡ÉXITO! EL USUARIO YA ES LUX PRO."); 
        setIsPremium(true); 
      } else { 
        console.warn("4. ALERTA: La compra pasó, pero no detectó el ID 'ent1b5c1fea56a'."); 
      } 
    } catch (e: any) { 
      // AHORA IMPRIMIMOS TODO, SIN IMPORTAR QUÉ SEA 
      console.error("X. ERROR DURANTE LA COMPRA:", e); 
      console.log("CÓDIGO DE ERROR DE REVENUECAT:", e.code); 
    } 
  }; 

  return { currentOffering, customerInfo, isPremium, purchasePackage }; 
};
