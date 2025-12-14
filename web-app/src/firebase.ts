import { initializeApp } from "firebase/app"; 
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore"; 

// TUS CREDENCIALES DE MATRIX 
const firebaseConfig = { 
  apiKey: "AIzaSyALLIuxXboJCvYa96NM4wzZICu5hLRzSF8", 
  authDomain: "matrix-4012f.firebaseapp.com", 
  projectId: "matrix-4012f", 
  storageBucket: "matrix-4012f.firebasestorage.app", 
  messagingSenderId: "770116190928", 
  appId: "1:770116190928:web:c54645c2d2af5976c6d4d5", 
  measurementId: "G-6Y71JPSLRQ" 
}; 

// 1. Inicializar la App 
const app = initializeApp(firebaseConfig); 

// 2. Inicializar la Base de Datos 
const db: Firestore = getFirestore(app); 

// 3. ACTIVAR MODO OFFLINE (CRÍTICO PARA MATRIX) 
enableIndexedDbPersistence(db) 
  .catch((err: any) => { 
    if (err.code == 'failed-precondition') { 
        console.warn('Hay múltiples pestañas abiertas. La persistencia solo funciona en una.'); 
    } else if (err.code == 'unimplemented') { 
        console.warn('El navegador actual no soporta persistencia offline.'); 
    } 
  }); 

// Exportamos "db" para usarla en toda la app 
export { db };