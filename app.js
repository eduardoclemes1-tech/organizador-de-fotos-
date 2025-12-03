
// Elementos do DOM
const btnNew = document.getElementById('btn-new');
const contentList = document.getElementById('content-list');
const template = document.getElementById('card-template');

// Elementos de Login e Perfil
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const btnLoginGoogle = document.getElementById('btn-login-google');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const btnLogout = document.getElementById('btn-logout');

// Importar serviços
import { auth, db as firestore } from './firebase-service.js';
import { generateContent } from './ai-service.js';

// Configurações do IndexedDB (para arquivos de mídia pesados que não vão pro Firestore)
const DB_NAME = 'VideoManagerDB';
const DB_VERSION = 2;
const DB_STORE_NAME = 'media_content';

let currentUser = null; 

// --- CAMADA DE BANCO DE DADOS LOCAL (Mídia) ---
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject(event);
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
                db.createObjectStore(DB_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Salva arquivos binários (Blob) localmente
async function saveMediaToDB(id, type, file) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        
        const getRequest = store.get(id);

        getRequest.onsuccess = (event) => {
            let data = event.target.result || { id: id, timestamp: new Date().getTime() };
            if (type === 'video') data.video = file;
            if (type === 'thumbnail') data.thumbnail = file;
            store.put(data).onsuccess = () => resolve();
        };
        getRequest.onerror = (e) => reject(e);
    });
}

async function getMediaFromDB(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DB_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = (e) => resolve(e.target.result || null);
        request.onerror = (e) => reject(e);
    });
}

async function deleteMediaFromDB(id) {
    if (!db) await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        store.delete(id).onsuccess = () => resolve();
    });
}

// --- UTILITÁRIOS ---

function generateUUID() {
    return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// --- PERSISTÊNCIA DE DADOS (Firestore) ---

async function saveContentToCloud() {
    if (!currentUser) return;

    const cards = contentList.querySelectorAll('.content-card');
    const dataArray = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const dateInput = card.querySelector('.input-date');
        const contextInput = card.querySelector('.input-context');
        const captionInput = card.querySelector('.output-caption');
        const hashtagInput = card.querySelector('.input-hashtags');
        const videoLabel = card.querySelector('.video-filename-label');
        const thumbLabel = card.querySelector('.thumb-filename-label');

        const contentBlock = {
            id: id,
            date: dateInput.value,
            context: contextInput.value,
            legend: captionInput.value,
            hashtags: hashtagInput.value,
            videoReference: videoLabel ? videoLabel.innerText : "",
            thumbnailReference: thumbLabel ? thumbLabel.innerText : ""
        };

        dataArray.push(contentBlock);
    });

    try {
        await firestore.saveUserContent(currentUser.uid, dataArray);
        console.log("Sincronizado com Firestore");
    } catch (error) {
        console.error("Erro ao sincronizar:", error);
        showToast("⚠️ Erro ao salvar na nuvem");
    }
}

async function loadContentFromCloud() {
    if (!currentUser) return;
    
    contentList.innerHTML = '';
    
    // Adiciona loading
    const loadingMsg = document.createElement('div');
    loadingMsg.textContent = "Carregando seus vídeos...";
    loadingMsg.style.textAlign = "center";
    loadingMsg.style.padding = "20px";
    contentList.appendChild(loadingMsg);

    try {
        const dataArray = await firestore.loadUserContent(currentUser.uid);
        contentList.innerHTML = ''; // Limpa loading

        if (Array.isArray(dataArray) && dataArray.length > 0) {
            // Renderiza cards (invertido para mais recente no topo se quiser, ou mantém ordem)
            for (const item of dataArray) {
                await createNewCard(item);
            }
        } else {
            // Se não tiver nada, cria um vazio
            createNewCard(); 
        }
    } catch (error) {
        console.error("Erro no load:", error);
        contentList.innerHTML = '';
        createNewCard();
    }
}

// --- LÓGICA DE INTERFACE (Cards) ---

async function createNewCard(initialData = null) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.content-card');
    const cardId = initialData ? initialData.id : generateUUID();
    card.setAttribute('data-id', cardId);

    // Elementos
    const dateInput = card.querySelector('.input-date');
    const contextInput = card.querySelector('.input-context');
    const btnAiGenerate = card.querySelector('.btn-ai-generate');
    const captionInput = card.querySelector('.output-caption');
    const hashtagInput = card.querySelector('.input-hashtags');
    const hashtagError = card.querySelector('.hashtag-error');
    const btnDelete = card.querySelector('.btn-delete');
    
    // Mídia
    const videoInput = card.querySelector('.input-video-file');
    const videoPreview = card.querySelector('.video-preview');
    const videoPlaceholder = card.querySelector('.video-uploader .preview-placeholder');
    const thumbInput = card.querySelector('.input-thumb-file');
    const thumbPreview = card.querySelector('.thumb-preview');
    const thumbPlaceholder = card.querySelector('.thumb-uploader .preview-placeholder');

    let videoNameLabel = document.createElement('small');
    videoNameLabel.className = 'filename-label video-filename-label';
    card.querySelector('.video-uploader').after(videoNameLabel);

    let thumbNameLabel = document.createElement('small');
    thumbNameLabel.className = 'filename-label thumb-filename-label';
    card.querySelector('.thumb-uploader').after(thumbNameLabel);

    // Preenchimento de Dados Iniciais
    if (initialData) {
        dateInput.value = initialData.date || getTodayDate();
        contextInput.value = initialData.context || "";
        captionInput.value = initialData.legend || "";
        hashtagInput.value = initialData.hashtags || "";
        
        if(initialData.videoReference) videoNameLabel.innerText = initialData.videoReference;
        if(initialData.thumbnailReference) thumbNameLabel.innerText = initialData.thumbnailReference;

        // Recupera blobs do IndexedDB
        try {
            const mediaRecord = await getMediaFromDB(cardId);
            if (mediaRecord) {
                if (mediaRecord.video) {
                    videoPreview.src = URL.createObjectURL(mediaRecord.video);
                    videoPreview.style.display = 'block';
                    videoPlaceholder.style.display = 'none';
                }
                if (mediaRecord.thumbnail) {
                    thumbPreview.src = URL.createObjectURL(mediaRecord.thumbnail);
                    thumbPreview.style.display = 'block';
                    thumbPlaceholder.style.display = 'none';
                }
            }
        } catch (e) { console.error(e); }
    } else {
        dateInput.value = getTodayDate();
    }

    // --- EVENTOS DE INTERFACE ---

    // Salvamento automático ao digitar
    let debounceTimer;
    const autoSave = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => saveContentToCloud(), 1000);
    };

    [dateInput, contextInput, captionInput, hashtagInput].forEach(input => {
        input.addEventListener('input', autoSave);
    });

    // IA Generativa
    btnAiGenerate.addEventListener('click', async () => {
        const context = contextInput.value.trim();
        if (!context) {
            showToast("⚠️ Digite um tema primeiro!");
            contextInput.focus();
            contextInput.classList.add('input-error');
            setTimeout(() => contextInput.classList.remove('input-error'), 500);
            return;
        }

        const originalText = btnAiGenerate.innerHTML;
        btnAiGenerate.disabled = true;
        btnAiGenerate.innerHTML = `⏳ Criando...`;

        try {
            const result = await generateContent(context);
            captionInput.value = result.caption;
            const tags = Array.isArray(result.hashtags) ? result.hashtags.join(' ') : result.hashtags;
            hashtagInput.value = tags;
            showToast("✨ Conteúdo gerado!");
            saveContentToCloud();
        } catch (error) {
            console.error(error);
            showToast("❌ Erro na IA");
            captionInput.value = "Não foi possível conectar ao serviço de IA.";
        } finally {
            btnAiGenerate.disabled = false;
            btnAiGenerate.innerHTML = originalText;
        }
    });

    // Upload Vídeo
    videoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            videoPreview.src = URL.createObjectURL(file);
            videoPreview.style.display = 'block';
            videoPlaceholder.style.display = 'none';
            videoNameLabel.innerText = "Video: " + file.name;
            
            if(!contextInput.value) contextInput.value = file.name.split('.')[0];

            await saveMediaToDB(cardId, 'video', file);
            saveContentToCloud();
        }
    });

    // Upload Thumbnail
    thumbInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            thumbPreview.src = URL.createObjectURL(file);
            thumbPreview.style.display = 'block';
            thumbPlaceholder.style.display = 'none';
            thumbNameLabel.innerText = "Capa: " + file.name;

            await saveMediaToDB(cardId, 'thumbnail', file);
            saveContentToCloud();
        }
    });

    // Deletar
    btnDelete.addEventListener('click', async () => {
        if(confirm('Remover este item?')) {
            card.remove();
            await deleteMediaFromDB(cardId);
            saveContentToCloud();
        }
    });

    contentList.prepend(card);
}

// --- FLUXO DE AUTENTICAÇÃO ---

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loginScreen.style.display = 'none';
        appContent.style.display = 'block';
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/36';
        userName.textContent = user.displayName;
        
        initDB().then(() => loadContentFromCloud());
    } else {
        currentUser = null;
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
        contentList.innerHTML = '';
    }
});

btnLoginGoogle.addEventListener('click', async () => {
    try {
        await auth.signInWithGoogle();
    } catch (error) {
        showToast("❌ Erro ao logar. Verifique console.");
    }
});

btnLogout.addEventListener('click', async () => {
    await auth.signOut();
});

btnNew.addEventListener('click', () => createNewCard());
