const MP_ACCESS_TOKEN = 'TEST-5051178527853528-032103-dfd26315ff798cc8ae1d3691beaf4ace-2692981562';
export const MP_PUBLIC_KEY = 'TEST-659db30b-bfe5-4cbc-b6e7-8b9fd5d7b308';

export const createCheckoutPreference = async (
  planType: 'monthly' | 'yearly',
  user: any
): Promise<string | null> => {
  const isMonthly = planType === 'monthly';
  const price = isMonthly ? 4.99 : 49.90; // Matching the UI
  const title = isMonthly ? 'Delux - Plan Mensual' : 'Delux - Plan Anual';
  
  // Determine Base URL explicitly avoiding "null" or "undefined" protocols
  let baseUrl = 'https://localhost:5174';
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (window.location.origin !== 'null' && window.location.origin !== 'file://') {
      baseUrl = window.location.origin;
    }
  }

  // Capacitor fallback for mobile where origin is often file:// or null
  if (baseUrl === 'https://localhost:5174' || baseUrl.includes('file://')) {
    baseUrl = 'https://lux-app-landing.web.app'; // Replace with your actual production landing URL if available
  }
  
  const preferenceData = {
    items: [
      {
        id: isMonthly ? 'plan_mensual' : 'plan_anual',
        title: title,
        description: 'Desbloquea capacidad ilimitada, velocidad cuántica y más.',
        quantity: 1,
        currency_id: 'USD', // Adjust to user's currency if needed, USD is universal
        unit_price: price,
      }
    ],
    payer: {
      email: user?.email || 'test_user@test.com',
    },
    back_urls: {
      success: 'https://www.google.com',
      failure: 'https://www.google.com',
      pending: 'https://www.google.com'
    },
    auto_return: 'approved',
    // statement_descriptor: 'DELUX APP'
  };

  try {
    // Use the Vite proxy in development to avoid CORS errors
    const apiUrl = import.meta.env.DEV ? '/mp-api' : 'https://api.mercadopago.com';
    
    const response = await fetch(`${apiUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago Preference Error:', JSON.stringify(errorData, null, 2));
      throw new Error('Failed to create preference');
    }

    const data = await response.json();
    // Use sandbox_init_point because we are using TEST credentials
    return data.sandbox_init_point || data.init_point;
  } catch (error) {
    console.error('Error in createCheckoutPreference:', error);
    return null;
  }
};
