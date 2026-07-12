import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";

// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
};

// ============================================================
// VALIDAR CONFIGURACIÓN
// ============================================================

const isConfigValid = !!firebaseConfig.apiKey && 
                       !!firebaseConfig.projectId && 
                       firebaseConfig.apiKey !== "dummy";

// ============================================================
// INICIALIZAR APP
// ============================================================

let app: FirebaseApp;

// Si la configuración es válida, inicializar Firebase real
if (isConfigValid) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado correctamente");
  } catch (e) {
    console.error("❌ Error inicializando Firebase:", e);
    // Fallback: app dummy
    app = initializeApp({
      apiKey: "dummy",
      authDomain: "dummy",
      projectId: "dummy",
    });
  }
} else {
  // Modo dummy para build o entorno sin variables
  console.warn("⚠️ Firebase en modo dummy (variables de entorno no configuradas)");
  console.warn("   apiKey:", firebaseConfig.apiKey ? "✅" : "❌");
  console.warn("   projectId:", firebaseConfig.projectId ? "✅" : "❌");
  
  app = initializeApp({
    apiKey: "dummy",
    authDomain: "dummy",
    projectId: "dummy",
  });
}

// ============================================================
// EXPORTAR SERVICIOS
// ============================================================

// ✅ auth: Siempre disponible (nunca null)
export const auth: Auth = getAuth(app);

// ✅ db: Firestore con persistencia solo en cliente
export const db: Firestore = typeof window !== "undefined" && isConfigValid
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  : getFirestore(app);

// ✅ rtdb: Realtime Database
export const rtdb: Database = getDatabase(app);

export default app;

// ============================================================
// UTILIDAD: Verificar si Firebase está configurado correctamente
// ============================================================

export const isFirebaseConfigured = isConfigValid;

// ============================================================
// UTILIDAD: Verificar si estamos en modo cliente
// ============================================================

export const isClient = typeof window !== "undefined";