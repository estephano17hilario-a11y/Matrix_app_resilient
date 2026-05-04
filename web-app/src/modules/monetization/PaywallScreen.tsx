import { useRevenueCat } from '../../hooks/useRevenueCat'; // Ajusta la ruta 

export const PaywallScreen = () => { 
  const { currentOffering, isPremium, purchasePackage } = useRevenueCat(); 

  if (isPremium) { 
    return <div>¡Ya tienes acceso a todas las funciones de Lux!</div>; 
  } 

  if (!currentOffering) { 
    return <div>Cargando planes... (Revisa tu consola si esto no desaparece)</div>; 
  } 

  // Buscamos el paquete 'weekly' que configuraste 
  const weeklyPackage = currentOffering.weekly; 

  return ( 
    <div style={{ padding: '20px', textAlign: 'center' }}> 
      <h2>Desbloquea Lux Premium</h2> 
      
      {weeklyPackage ? ( 
        <button 
          onClick={() => purchasePackage(weeklyPackage)} 
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