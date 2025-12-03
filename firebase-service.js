
// Importações corretas para Firebase Modular (v10+)
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut as firebaseSignOut, 
    onAuthStateChanged as firebaseOnAuthStateChanged 
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "firebase/firestore";

/**
 * --- CONFIGURAÇÃO DO FIREBASE ---
 * Substitua os valores abaixo pelos do seu projeto Firebase.
 */
const firebaseConfig = {
    apiKey: "AIzaSyB4msfKj3E6QEZL8p88zvmvDB46E5kcGVo", 
    authDomain: "gerenciador-de-video.firebaseapp.com", 
    projectId: "gerenciador-de-video",
    storageBucket: "gerenciador-de-video.appspot.com",
    messagingSenderId: "533748190214",
    appId: "1:533748190214:web:342697273af7994da98787"
};

// Variáveis de instância
let app;
let authInstance;
let dbInstance;
let provider;

// --- Inicialização Robusta ---
try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    provider = new GoogleAuthProvider();
    console.log("🔥 Firebase: Serviços inicializados.");
} catch (error) {
    console.error("❌ ERRO CRÍTICO FIREBASE:", error);
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    async signInWithGoogle() {
        if (!authInstance) {
            alert("Firebase não inicializado. Use o Modo Visitante.");
            return;
        }
        try {
            const result = await signInWithPopup(authInstance, provider);
            return result.user;
        } catch (error) {
            console.error("Erro no login Google:", error);
            
            let msg = `Erro de Login (${error.code}): ${error.message}`;
            
            // Tratamento específico para Domínio Não Autorizado (comum no GitHub Pages)
            if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized domain') || error.code === 412) {
                msg = `⛔ DOMÍNIO NÃO AUTORIZADO!\n\nVocê precisa ir no Firebase Console -> Authentication -> Settings -> Authorized Domains e adicionar este domínio:\n\n${window.location.hostname}\n\nEnquanto isso, use o botão "Modo Visitante" para testar o app.`;
            } else if (error.code === 'auth/api-key-not-valid') {
                msg = "A API Key informada é inválida. Use o Modo Visitante.";
            }
            
            alert(msg);
            throw error;
        }
    },

    async signOut() {
        if (!authInstance) return;
        try {
            await firebaseSignOut(authInstance);
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    },

    onAuthStateChanged(callback) {
        if (!authInstance) {
            callback(null);
            return;
        }
        firebaseOnAuthStateChanged(authInstance, (user) => {
            callback(user);
        });
    }
};

// --- SERVIÇO DE BANCO DE DADOS (FIRESTORE) ---

export const db = {
    async saveUserContent(userId, data) {
        if (!dbInstance || !userId) return;

        try {
            await setDoc(doc(dbInstance, "users", userId), { 
                contentArray: data,
                lastUpdated: new Date()
            }, { merge: true });
            
            console.log("☁️ Dados salvos no Firestore.");
        } catch (e) {
            console.error("Erro ao salvar no Firestore:", e);
            throw e;
        }
    },

    async loadUserContent(userId) {
        if (!dbInstance || !userId) return [];

        try {
            const docRef = doc(dbInstance, "users", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log("☁️ Dados recuperados.");
                return docSnap.data().contentArray || [];
            } else {
                return [];
            }
        } catch (e) {
            console.error("Erro ao carregar do Firestore:", e);
            return [];
        }
    }
};