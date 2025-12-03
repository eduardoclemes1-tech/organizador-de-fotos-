
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
 * 
 * ATENÇÃO:
 * 1. apiKey: Começa com "AIza..." (NÃO é o número 1:533...)
 * 2. authDomain: seu-projeto.firebaseapp.com
 * 3. projectId: seu-projeto
 */
const firebaseConfig = {
    // ⬇️ COLOQUE SUA API KEY CORRETA AQUI (Começa com AIza...)
    apiKey: "AIzaSy...SUA_CHAVE_AQUI", 
    
    // ⬇️ MANTENHA O RESTO DAS CONFIGURAÇÕES
    authDomain: "gerenciador-de-video.firebaseapp.com", 
    projectId: "gerenciador-de-video",
    storageBucket: "gerenciador-de-video.appspot.com",
    messagingSenderId: "533748190214",
    appId: "1:533748190214:web:342697273af7994da98787"
};

// --- Validação de Configuração ---
let app;
let authInstance;
let dbInstance;
let provider;
let isConfigured = false;

// Verifica se a API Key foi preenchida e se NÃO parece um App ID (que começa com número e dois pontos)
const apiKey = firebaseConfig.apiKey || "";
const seemsLikeAppId = apiKey.includes(":"); // App IDs tem ':' (ex: 1:1234:web:...)
const isPlaceholder = apiKey.includes("AIzaSy...SUA_CHAVE_AQUI");

if (apiKey && !seemsLikeAppId && !isPlaceholder) {
    try {
        app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        provider = new GoogleAuthProvider();
        isConfigured = true;
        console.log("🔥 Firebase inicializado com sucesso!");
    } catch (error) {
        console.error("❌ Erro fatal ao inicializar Firebase:", error);
    }
} else {
    console.error("⚠️ ERRO DE CONFIGURAÇÃO DO FIREBASE ⚠️");
    if (seemsLikeAppId) {
        console.error("👉 Você colocou o 'App ID' no lugar da 'apiKey'.");
        console.error("   A apiKey correta começa com 'AIza...' e pode ser encontrada no Firebase Console > Configurações do Projeto.");
    } else if (isPlaceholder) {
        console.error("👉 Você precisa substituir 'AIzaSy...SUA_CHAVE_AQUI' pela sua chave real.");
    }
    
    // Tenta avisar na interface se possível
    setTimeout(() => {
        const errorMsg = document.getElementById('config-error-msg');
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerText = seemsLikeAppId 
                ? "Erro: Você usou o ID do App em vez da API Key." 
                : "Erro: Configure a API Key no arquivo firebase-service.js";
        }
    }, 1000);
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    async signInWithGoogle() {
        if (!isConfigured) {
            alert("CONFIGURAÇÃO INCOMPLETA: Verifique o console do navegador (F12) para ver qual chave está errada.");
            return;
        }
        try {
            const result = await signInWithPopup(authInstance, provider);
            return result.user;
        } catch (error) {
            console.error("Erro no login Google:", error);
            // Tratamento de erro comum: Domínio não autorizado
            if (error.code === 'auth/unauthorized-domain') {
                alert("Domínio não autorizado! Vá no Firebase Console > Authentication > Settings > Authorized Domains e adicione este site.");
            } else {
                alert(`Erro de Login: ${error.message}`);
            }
            throw error;
        }
    },

    async signOut() {
        if (!isConfigured) return;
        try {
            await firebaseSignOut(authInstance);
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    },

    onAuthStateChanged(callback) {
        if (!isConfigured) {
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
        if (!isConfigured || !userId) return;

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
        if (!isConfigured || !userId) return [];

        try {
            const docRef = doc(dbInstance, "users", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log("☁️ Dados carregados do Firestore.");
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
