import { useRevenueCat } from '../../hooks/useRevenueCat'; // Ajusta la ruta 
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export const PaywallScreen = () => { 
  const { currentOffering, isPremium, purchasePackage } = useRevenueCat(); 
  const { user, updateProfileLocally } = useAuth();

  if (isPremium) { 
    return <div>¡Ya tienes acceso a todas las funciones de Lux!</div>; 
  } 

  if (!currentOffering) { 
    return <div>Cargando planes... (Revisa tu consola si esto no desaparece)</div>; 
  } 

  // Buscamos el paquete 'weekly' que configuraste 
  const weeklyPackage = currentOffering.weekly; 

  const handlePurchase = async () => {
    if (weeklyPackage) {
      const isProNow = await purchasePackage(weeklyPackage);
      if (isProNow && user?.id) {
        await supabase.from('users').update({ plan: 'PRO', es_pro: true }).eq('id', user.id);
        updateProfileLocally({ plan: 'PRO', es_pro: true });
      }
    }
  };

  return ( 
    <div style={{ padding: '20px', textAlign: 'center' }}> 
      <h2>Desbloquea Lux Premium</h2> 
      
      {weeklyPackage ? ( 
        <button 
          onClick={handlePurchase} 
          style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer' }} 
        > 
          Comprar Plan Semanal ({weeklyPackage.product.priceString}) 
        </button> 
      ) : ( 
        <p>No se encontró el plan semanal. Revisa los Offerings en RevenueCat.</p> 
      )} 
    </div> 
  ); 
};