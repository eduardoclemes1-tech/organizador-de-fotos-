
// Importa as funções do Firebase Modular (v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * --- CONFIGURAÇÃO DO FIREBASE (REAL) ---
 * Substitua os valores abaixo pelas configurações do seu projeto no Firebase Console.
 */
const firebaseConfig = {
    apiKey: "AIzaSyB4msfKj3E6QEZL8p88zvmvDB46E5kcGVo",
    authDomain: "gerenciador-de-video.firebaseapp.com",
    projectId: "gerenciador-de-video",
    storageBucket: "gerenciador-de-video.appspot.com",
    messagingSenderId: "533748190214",
    appId: "gerenciador-de-video"
};

// Verifica configuração
const isConfigured = !firebaseConfig.apiKey.includes("AIzaSyB4msfKj3E6QEZL8p88zvmvDB46E5kcGVo");

let app;
let authInstance;
let dbInstance;
let provider;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        provider = new GoogleAuthProvider();
        console.log("🔥 Firebase inicializado (Modo Real).");
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
    }
} else {
    console.warn("⚠️ ATENÇÃO: Firebase não configurado no arquivo firebase-service.js.");
    console.warn("O login e o salvamento na nuvem NÃO funcionarão até você preencher as chaves.");
}

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    async signInWithGoogle() {
        if (!isConfigured) {
            alert("Erro de Configuração: Adicione suas chaves do Firebase no arquivo 'firebase-service.js' para fazer login.");
            return;
        }
        try {
            const result = await signInWithPopup(authInstance, provider);
            return result.user;
        } catch (error) {
            console.error("Erro no login Google:", error);
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
            // Salva na coleção "users", documento com ID do usuário
            // O conteúdo fica dentro do campo "contentArray"
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
