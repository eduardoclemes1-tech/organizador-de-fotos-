
// Importa as funções do Firebase diretamente do CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * --- CONFIGURAÇÃO DO FIREBASE ---
 * 1. Para login REAL: Crie um projeto em console.firebase.google.com, ative Authentication > Google.
 * 2. Copie as configurações do seu projeto e cole abaixo.
 * 3. Se deixar como está ("SUA_API_KEY..."), o sistema usará um MODO DE SIMULAÇÃO para você testar.
 */
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_MESSAGING_ID",
    appId: "SEU_APP_ID"
};

// Verifica se o usuário configurou as chaves reais ou se ainda estão com os placeholders
const isConfigured = !firebaseConfig.apiKey.includes("SUA_API_KEY");

let app;
let authInstance;
let dbInstance;
let provider;

// Inicializa Firebase apenas se estiver configurado
if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        provider = new GoogleAuthProvider();
        console.log("🔥 Firebase conectado em modo REAL.");
    } catch (error) {
        console.error("Erro ao inicializar Firebase Real:", error);
    }
} else {
    console.warn("⚠️ Firebase não configurado. Rodando em MODO DE SIMULAÇÃO (Mock).");
}

const STORAGE_DB_PREFIX = 'firebase_db_user_';

// --- SERVIÇO DE AUTENTICAÇÃO (HÍBRIDO) ---

export const auth = {
    currentUser: null,
    mockUser: null, // Armazena estado do usuário simulado

    // Monitora o estado da autenticação (Real ou Simulado)
    onAuthStateChanged(callback) {
        if (isConfigured && authInstance) {
            // MODO REAL
            firebaseOnAuthStateChanged(authInstance, (user) => {
                this.currentUser = user;
                callback(user);
            });
        } else {
            // MODO SIMULADO
            // Verifica se já "logamos" anteriormente na simulação
            const storedMockUser = localStorage.getItem('mock_auth_user');
            if (storedMockUser) {
                this.currentUser = JSON.parse(storedMockUser);
                callback(this.currentUser);
            } else {
                callback(null);
            }
        }
    },

    // Login com Google
    async signInWithGoogle() {
        if (isConfigured && authInstance) {
            // MODO REAL: Abre popup do Google
            try {
                const result = await signInWithPopup(authInstance, provider);
                return result;
            } catch (error) {
                console.error("Erro no login Google:", error);
                throw error;
            }
        } else {
            // MODO SIMULADO: Cria um usuário falso instantaneamente
            console.log("Simulando login...");
            const fakeUser = {
                uid: 'user_simulado_123',
                displayName: 'Usuário Demo (Modo Teste)',
                email: 'demo@exemplo.com',
                photoURL: 'https://ui-avatars.com/api/?name=User+Demo&background=random'
            };
            
            this.currentUser = fakeUser;
            localStorage.setItem('mock_auth_user', JSON.stringify(fakeUser));
            
            // Força um reload simples para atualizar a UI através do onAuthStateChanged
            window.location.reload();
            return { user: fakeUser };
        }
    },

    // Sair da conta
    async signOut() {
        if (isConfigured && authInstance) {
            // MODO REAL
            try {
                await firebaseSignOut(authInstance);
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        } else {
            // MODO SIMULADO
            localStorage.removeItem('mock_auth_user');
            this.currentUser = null;
            window.location.reload();
        }
    }
};

// --- SERVIÇO DE BANCO DE DADOS (HÍBRIDO) ---

export const db = {
    async saveUserContent(userId, data) {
        // Se estiver configurado o Firestore REAL, tenta salvar lá
        /*
        if (isConfigured && dbInstance) {
            try {
                await setDoc(doc(dbInstance, "users", userId), { content: data }, { merge: true });
                return;
            } catch (e) {
                console.error("Erro Firestore:", e);
                // Fallback para localStorage se der erro
            }
        }
        */

        // Padrão: LOCALSTORAGE (Por usuário)
        // Funciona tanto no modo Real quanto Simulado para garantir persistência imediata
        return new Promise((resolve) => {
            const key = `${STORAGE_DB_PREFIX}${userId}`;
            localStorage.setItem(key, JSON.stringify(data));
            resolve(true);
        });
    },

    async loadUserContent(userId) {
        // Se estiver configurado o Firestore REAL, tenta ler de lá
        /*
        if (isConfigured && dbInstance) {
            try {
                const docRef = doc(dbInstance, "users", userId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return docSnap.data().content || [];
                }
            } catch (e) {
                console.error("Erro Firestore Load:", e);
            }
        }
        */

        // Padrão: LOCALSTORAGE
        return new Promise((resolve) => {
            const key = `${STORAGE_DB_PREFIX}${userId}`;
            const data = localStorage.getItem(key);
            resolve(data ? JSON.parse(data) : []);
        });
    }
};
