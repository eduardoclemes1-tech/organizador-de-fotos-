
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
    provider = new GoogleAuthProvider();
    console.log("🔥 Firebase: Serviços inicializados.");
} catch (error) {
    console.error("❌ ERRO CRÍTICO FIREBASE:", error);
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    async signInWithGoogle() {
        if (!authInstance) {
            alert("Firebase não inicializado. Verifique sua conexão ou configuração.");
            return;
        }

        try {
            // 1. Força a persistência LOCAL (Login mantém mesmo fechando o navegador)
            await setPersistence(authInstance, browserLocalPersistence);

            // 2. Tenta fazer o login com Popup
            const result = await signInWithPopup(authInstance, provider);
            return result.user;

        } catch (error) {
            console.error("Erro detalhado no login Google:", error);
            
            let title = "❌ Erro de Login";
            let msg = error.message;

            // --- TRATAMENTO DE ERROS COMUNS DE CONFIGURAÇÃO ---
            
            // Caso 1: O domínio (localhost ou github.io) não está na lista permitida
            if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized domain')) {
                title = "⛔ DOMÍNIO BLOQUEADO PELO FIREBASE";
                msg = `Para segurança, o Firebase bloqueou este login.\n\nSOLUÇÃO:\n1. Vá no Firebase Console -> Authentication -> Settings -> Authorized Domains.\n2. Adicione este domínio: ${window.location.hostname}\n3. Tente novamente.`;
            } 
            // Caso 2: O provedor "Google" não foi ativado
            else if (error.code === 'auth/operation-not-allowed') {
                title = "⛔ LOGIN GOOGLE DESATIVADO";
                msg = `Você não ativou o login com Google no painel.\n\nSOLUÇÃO:\n1. Vá no Firebase Console -> Authentication -> Sign-in method.\n2. Habilite o provedor "Google".`;
            }
            // Caso 3: Popup bloqueado pelo navegador
            else if (error.code === 'auth/popup-blocked') {
                title = "⚠️ POPUP BLOQUEADO";
                msg = "O navegador bloqueou a janela de login. Por favor, permita popups para este site.";
            }
            // Caso 4: Chave de API inválida
            else if (error.code === 'auth/invalid-api-key') {
                title = "🔑 CHAVE DE API INVÁLIDA";
                msg = "A 'apiKey' no arquivo firebase-service.js está incorreta ou foi deletada no console.";
            }

            // Exibe alerta amigável e detalhado
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
            // Se falhar permissão, avisa mas não trava
            if (e.code === 'permission-denied') {
                console.warn("⚠️ Permissão negada no Firestore. Verifique as Regras de Segurança (Rules).");
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
