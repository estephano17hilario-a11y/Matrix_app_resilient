import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// SEGURIDAD: El token no debe estar expuesto. Se usa env variable.
const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN || '';
export const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || '';

export const createCheckoutPreference = async (
  planType: 'monthly' | 'yearly'
): Promise<{ init_point: string, id: string } | null> => {
  const isMonthly = planType === 'monthly';
  const price = isMonthly ? 4.99 : 49.90;
  const title = isMonthly ? 'Delux - Plan Mensual' : 'Delux - Plan Anual';
  
  let baseUrl = 'https://lux-app-landing.web.app'; 
  
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (
      window.location.origin !== 'null' && 
      !window.location.origin.includes('file://') && 
      !window.location.origin.includes('localhost') &&
      window.location.origin.startsWith('https://')
    ) {
      baseUrl = window.location.origin;
    }
  }

  const payerEmail = `customer_${Date.now()}@test.com`; 

  const preapprovalData = {
    reason: title,
    auto_recurring: {
      frequency: isMonthly ? 1 : 12,
      frequency_type: "months",
      transaction_amount: price,
      currency_id: "USD"
    },
    back_url: `${baseUrl}?payment_status=success&plan=${planType}`,
    payer_email: payerEmail
  };

  try {
    const isNative = Capacitor.isNativePlatform();
    const apiUrl = (import.meta.env.DEV && !isNative) ? '/mp-api' : 'https://api.mercadopago.com';

    let data;
    let ok = false;

    if (isNative) {
      // Use CapacitorHttp to bypass CORS in native mobile app completely
      const response = await CapacitorHttp.post({
        url: `${apiUrl}/preapproval`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        },
        data: preapprovalData
      });
      ok = response.status >= 200 && response.status < 300;
      data = response.data;
      if (!ok) console.error('Mercado Pago Error Status:', response.status);
    } else {
      // Standard fetch for web/dev
      const response = await fetch(`${apiUrl}/preapproval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        },
        body: JSON.stringify(preapprovalData)
      });
      ok = response.ok;
      if (!ok) console.error('Mercado Pago Error Status:', response.status);
      else data = await response.json();
    }

    if (!ok) return null;

    return { init_point: data.init_point, id: data.id };
  } catch (error: any) {
    console.error('Fetch exception:', error);
    return null;
  }
};

export const verifySubscriptionStatus = async (preapprovalId: string): Promise<boolean> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    const apiUrl = (import.meta.env.DEV && !isNative) ? '/mp-api' : 'https://api.mercadopago.com';

    let data;
    let ok = false;

    if (isNative) {
      const response = await CapacitorHttp.get({
        url: `${apiUrl}/preapproval/${preapprovalId}`,
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      });
      ok = response.status >= 200 && response.status < 300;
      data = response.data;
    } else {
      const response = await fetch(`${apiUrl}/preapproval/${preapprovalId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      });
      ok = response.ok;
      if (ok) data = await response.json();
    }

    if (!ok) return false;

    // Check if the subscription is actually authorized and active
    return data.status === 'authorized';
  } catch (error) {
    console.error("Verification failed", error);
    return false;
  }
};
