
/**
 * MOCK FIREBASE SERVICE
 * 
 * Este arquivo simula a funcionalidade do Firebase Auth e Firestore.
 * Em um ambiente de produção real, você substituiria este código 
 * pela inicialização real do SDK do Firebase.
 */

const STORAGE_KEY_SESSION = 'firebase_mock_session';
const STORAGE_DB_PREFIX = 'firebase_db_user_';

// Simula o objeto de usuário do Google
const MOCK_USER = {
    uid: 'user-google-12345',
    displayName: 'Usuário Demo',
    email: 'usuario@exemplo.com',
    photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c' // Avatar genérico
};

export const auth = {
    currentUser: null,
    
    // Listener de estado (Login/Logout)
    onAuthStateChanged(callback) {
        // Verifica se há sessão salva ao recarregar a página
        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
        }
        callback(this.currentUser);
    },

    // Simula Login com Google (Popup)
    signInWithGoogle() {
        return new Promise((resolve) => {
            // Simula delay de rede
            setTimeout(() => {
                this.currentUser = MOCK_USER;
                localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(this.currentUser));
                resolve({ user: this.currentUser });
            }, 800); // 0.8s delay
        });
    },

    // Logout
    signOut() {
        return new Promise((resolve) => {
            this.currentUser = null;
            localStorage.removeItem(STORAGE_KEY_SESSION);
            resolve();
        });
    }
};

export const db = {
    // Salva dados específicos do usuário (Simula Firestore)
    async saveUserContent(userId, data) {
        return new Promise((resolve) => {
            // Simula delay de rede
            setTimeout(() => {
                const key = `${STORAGE_DB_PREFIX}${userId}`;
                localStorage.setItem(key, JSON.stringify(data));
                resolve(true);
            }, 300);
        });
    },

    // Carrega dados específicos do usuário
    async loadUserContent(userId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const key = `${STORAGE_DB_PREFIX}${userId}`;
                const data = localStorage.getItem(key);
                resolve(data ? JSON.parse(data) : []);
            }, 300);
        });
    }
};
