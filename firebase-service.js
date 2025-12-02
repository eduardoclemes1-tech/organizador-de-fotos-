
// Importa as funções do Firebase diretamente do CDN (não precisa instalar nada)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * --- CONFIGURAÇÃO DO FIREBASE ---
 * 1. Crie um projeto em console.firebase.google.com
 * 2. Adicione um App Web
 * 3. Copie as configurações e substitua o objeto abaixo:
 */
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_MESSAGING_ID",
    appId: "SEU_APP_ID"
};

// Inicializa o Firebase
let app;
let authInstance;
let dbInstance;
let provider;

try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    provider = new GoogleAuthProvider();
} catch (error) {
    console.error("Erro ao inicializar Firebase. Verifique se você preencheu a firebaseConfig no arquivo firebase-service.js", error);
}

const STORAGE_DB_PREFIX = 'firebase_db_user_';

// --- SERVIÇO DE AUTENTICAÇÃO ---

export const auth = {
    currentUser: null,

    // Monitora o estado real da autenticação
    onAuthStateChanged(callback) {
        if (!authInstance) return;
        
        firebaseOnAuthStateChanged(authInstance, (user) => {
            this.currentUser = user;
            callback(user);
        });
    },

    // Abre o Popup oficial do Google para Login
    async signInWithGoogle() {
        if (!authInstance) {
            alert("Firebase não configurado. Edite o arquivo firebase-service.js com suas chaves.");
            return;
        }
        try {
            const result = await signInWithPopup(authInstance, provider);
            return result;
        } catch (error) {
            console.error("Erro no login Google:", error);
            throw error;
        }
    },

    // Sair da conta
    async signOut() {
        if (!authInstance) return;
        try {
            await firebaseSignOut(authInstance);
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    }
};

// --- SERVIÇO DE BANCO DE DADOS (HÍBRIDO) ---
// Nota: Aqui mantemos a lógica de salvar no LocalStorage baseada no ID REAL do usuário.
// Se você quiser salvar na nuvem real (Firestore), descomente as linhas indicadas.

export const db = {
    async saveUserContent(userId, data) {
        // --- OPÇÃO 1: LOCALSTORAGE (Por usuário) ---
        // Mantém os dados no navegador, mas separados por conta Google
        return new Promise((resolve) => {
            const key = `${STORAGE_DB_PREFIX}${userId}`;
            localStorage.setItem(key, JSON.stringify(data));
            resolve(true);
        });

        // --- OPÇÃO 2: NUVEM REAL (Firestore) ---
        // Para usar isso, ative o Firestore Database no console do Firebase
        /*
        try {
            await setDoc(doc(dbInstance, "users", userId), { content: data }, { merge: true });
        } catch (e) {
            console.error("Erro ao salvar no Firestore", e);
        }
        */
    },

    async loadUserContent(userId) {
        // --- OPÇÃO 1: LOCALSTORAGE ---
        return new Promise((resolve) => {
            const key = `${STORAGE_DB_PREFIX}${userId}`;
            const data = localStorage.getItem(key);
            resolve(data ? JSON.parse(data) : []);
        });

        // --- OPÇÃO 2: NUVEM REAL (Firestore) ---
        /*
        try {
            const docRef = doc(dbInstance, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().content || [];
            }
            return [];
        } catch (e) {
            console.error("Erro ao ler do Firestore", e);
            return [];
        }
        */
    }
};
