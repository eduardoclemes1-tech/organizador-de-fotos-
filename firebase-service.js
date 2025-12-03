
// Importações corretas para Firebase Modular (v10+)
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut as firebaseSignOut, 
    onAuthStateChanged as firebaseOnAuthStateChanged,
    setPersistence,
    browserLocalPersistence
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
 * ATENÇÃO: Verifique se o projectId e authDomain correspondem exatamente ao seu console.
 */
const firebaseConfig = {
    apiKey: "AIzaSyB4msfKj3E6QEZL8p88zvmvDB46E5kcGVo", 
    authDomain: "gerenciador-de-foto.firebaseapp.com", 
    projectId: "gerenciador-de-foto",
    storageBucket: "gerenciador-de-foto.appspot.com",
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
    
    // Configura provedor Google com parâmetros para forçar seleção de conta se necessário
    provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    authInstance.languageCode = 'pt'; // Localização para Português

    console.log("🔥 Firebase: Serviços inicializados.");
} catch (error) {
    console.error("❌ ERRO CRÍTICO FIREBASE:", error);
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    async signInWithGoogle() {
        if (!authInstance) {
            alert("Firebase não inicializado. Verifique a chave e a configuração no arquivo firebase-service.js.");
            return;
        }

        try {
            // 1. Força a persistência LOCAL
            await setPersistence(authInstance, browserLocalPersistence);

            // 2. Tenta fazer o login com Popup
            const result = await signInWithPopup(authInstance, provider);
            return result.user;

        } catch (error) {
            console.error("Erro detalhado no login Google:", error);
            console.log("Código de erro:", error.code);
            console.log("Mensagem:", error.message);
            
            let title = "❌ Erro de Login";
            let msg = error.message;

            // --- DIAGNÓSTICO DE ERROS ---
            
            // Caso 1: Domínio não autorizado (O MAIS COMUM)
            if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized domain')) {
                title = "⛔ DOMÍNIO NÃO AUTORIZADO";
                msg = `O Firebase bloqueou o login vindo deste site (${window.location.hostname}).\n\nCOMO RESOLVER:\n1. Vá no Firebase Console (console.firebase.google.com)\n2. Entre em Authentication > Settings > Authorized Domains\n3. Adicione este domínio: ${window.location.hostname}`;
            } 
            // Caso 2: Provedor Google desativado
            else if (error.code === 'auth/operation-not-allowed') {
                title = "⛔ LOGIN GOOGLE DESATIVADO";
                msg = `O provedor Google não está ativo no seu projeto Firebase.\n\nCOMO RESOLVER:\n1. Vá no Firebase Console > Authentication > Sign-in method\n2. Habilite o "Google".`;
            }
            // Caso 3: Erro de Configuração (API Key ou Project ID errados)
            else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/internal-error') {
                title = "🔧 ERRO DE CONFIGURAÇÃO";
                msg = "As chaves no arquivo 'firebase-service.js' parecem incorretas. Verifique se o 'projectId' e 'apiKey' são exatamente os mesmos do seu console.";
            }
            // Caso 4: Popup fechado pelo usuário
            else if (error.code === 'auth/popup-closed-by-user') {
                return; // Não mostra alerta, foi ação intencional
            }

            // Exibe alerta amigável
            alert(`${title}\n\n${msg}`);
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
            if (e.code === 'permission-denied') {
                console.warn("⚠️ Permissão negada. Verifique as 'Firestore Rules' no console para permitir leitura/escrita.");
            }
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