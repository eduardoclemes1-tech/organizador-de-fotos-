
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

// Chaves e Configurações Globais
const DB_NAME = 'VideoManagerDB';
const DB_VERSION = 2;
const DB_STORE_NAME = 'media_content';

let currentUser = null; // Armazena o usuário logado atualmente

// --- CAMADA DE BANCO DE DADOS (IndexedDB para Arquivos Grandes) ---
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Erro ao abrir banco de dados:", event);
            reject(event);
        };

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

// Salva arquivos de mídia (Video ou Thumbnail)
async function saveMediaToDB(id, type, file) {
    if (!db) await initDB();
    
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        
        const getRequest = store.get(id);

        getRequest.onsuccess = (event) => {
            let data = event.target.result || { id: id, timestamp: new Date().getTime() };
            
            if (type === 'video') data.video = file;
            if (type === 'thumbnail') data.thumbnail = file;
            
            data.timestamp = new Date().getTime();

            const putRequest = store.put(data);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = (e) => reject(e);
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

        request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result || null);
        };
        request.onerror = (e) => reject(e);
    });
}

async function deleteMediaFromDB(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

// --- UTILITÁRIOS ---

function generateUUID() {
    return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// --- PERSISTÊNCIA DE DADOS (Firebase Mock) ---

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

    // Usa o ID do usuário para segregar dados
    await firestore.saveUserContent(currentUser.uid, dataArray);
    showToast("☁️ Salvo na nuvem");
}

async function loadContentFromCloud() {
    if (!currentUser) return;
    
    // Limpa lista atual
    contentList.innerHTML = '';

    try {
        const dataArray = await firestore.loadUserContent(currentUser.uid);
        
        if (Array.isArray(dataArray) && dataArray.length > 0) {
            for (let i = dataArray.length - 1; i >= 0; i--) {
                await createNewCard(dataArray[i]);
            }
        } else {
            createNewCard(); 
        }
    } catch (error) {
        console.error("Erro ao carregar do Firebase:", error);
        createNewCard();
    }
}

// --- LÓGICA DE INTERFACE ---

async function createNewCard(initialData = null) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.content-card');
    
    const cardId = initialData ? initialData.id : generateUUID();
    card.setAttribute('data-id', cardId);

    // Seleção de Elementos
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

    if (initialData) {
        dateInput.value = initialData.date || getTodayDate();
        contextInput.value = initialData.context || "";
        captionInput.value = initialData.legend || "";
        hashtagInput.value = initialData.hashtags || "";
        
        if(initialData.videoReference) videoNameLabel.innerText = initialData.videoReference;
        if(initialData.thumbnailReference) thumbNameLabel.innerText = initialData.thumbnailReference;

        try {
            const mediaRecord = await getMediaFromDB(cardId);
            if (mediaRecord) {
                if (mediaRecord.video || mediaRecord.file) {
                    const vidBlob = mediaRecord.video || mediaRecord.file;
                    videoPreview.src = URL.createObjectURL(vidBlob);
                    videoPreview.style.display = 'block';
                    videoPlaceholder.style.display = 'none';
                }
                if (mediaRecord.thumbnail) {
                    thumbPreview.src = URL.createObjectURL(mediaRecord.thumbnail);
                    thumbPreview.style.display = 'block';
                    thumbPlaceholder.style.display = 'none';
                }
            }
        } catch (error) {
            console.error("Erro ao recuperar mídia do DB:", error);
        }
    } else {
        dateInput.value = getTodayDate();
    }

    // --- EVENTOS ---

    // 1. Inputs de Texto
    [dateInput, contextInput, captionInput].forEach(input => {
        input.addEventListener('input', () => saveContentToCloud());
    });

    // 2. Botão IA
    btnAiGenerate.addEventListener('click', async () => {
        const context = contextInput.value.trim();
        if (!context) {
            // Feedback visual melhorado em vez de alert
            showToast("⚠️ O que devo escrever? Digite um tema no campo acima.");
            contextInput.focus();
            contextInput.classList.add('input-error');
            setTimeout(() => contextInput.classList.remove('input-error'), 500);
            return;
        }

        // Estado de Carregamento
        const originalText = btnAiGenerate.innerHTML;
        btnAiGenerate.disabled = true;
        btnAiGenerate.innerHTML = `⏳ Criando...`;
        captionInput.placeholder = "A IA está pensando...";

        try {
            const result = await generateContent(context);
            
            // Preenche os campos
            captionInput.value = result.caption;
            // Verifica se hashtags é array ou string
            const tags = Array.isArray(result.hashtags) ? result.hashtags.join(' ') : result.hashtags;
            hashtagInput.value = tags;
            
            showToast("✨ Conteúdo gerado com sucesso!");
            saveContentToCloud(); // Salva automático

        } catch (error) {
            console.error("Erro IA:", error);
            showToast("❌ Erro ao gerar conteúdo.");
            captionInput.value = "Erro ao conectar com a IA. Verifique sua chave API.";
        } finally {
            btnAiGenerate.disabled = false;
            btnAiGenerate.innerHTML = originalText;
        }
    });

    // 3. Hashtags
    hashtagInput.addEventListener('input', (e) => {
        const text = e.target.value;
        const tags = text.trim().split(/\s+/).filter(t => t.length > 0);
        
        if (tags.length > 5) {
            hashtagInput.classList.add('error');
            hashtagError.style.display = 'block';
        } else {
            hashtagInput.classList.remove('error');
            hashtagError.style.display = 'none';
        }
        saveContentToCloud();
    });

    // 4. Mídia (Video)
    videoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            videoPreview.src = url;
            videoPreview.style.display = 'block';
            videoPlaceholder.style.display = 'none';
            videoNameLabel.innerText = "Video: " + file.name;
            
            // Sugere o nome do arquivo como contexto se estiver vazio
            if (!contextInput.value) {
                contextInput.value = file.name.split('.')[0].replace(/-/g, ' ');
            }

            try {
                showToast("⏳ Salvando vídeo localmente...");
                await saveMediaToDB(cardId, 'video', file);
                saveContentToCloud(); 
                showToast("✅ Vídeo salvo!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar vídeo.");
            }
        }
    });

    // 5. Mídia (Thumb)
    thumbInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            thumbPreview.src = url;
            thumbPreview.style.display = 'block';
            thumbPlaceholder.style.display = 'none';
            thumbNameLabel.innerText = "Capa: " + file.name;

            try {
                showToast("⏳ Salvando capa localmente...");
                await saveMediaToDB(cardId, 'thumbnail', file);
                saveContentToCloud();
                showToast("✅ Capa salva!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar capa.");
            }
        }
    });

    // 6. Deletar
    btnDelete.addEventListener('click', async () => {
        if(confirm('Tem certeza que deseja remover este conteúdo?')) {
            card.remove();
            await deleteMediaFromDB(cardId);
            saveContentToCloud();
        }
    });

    contentList.prepend(card);
    
    if (!initialData) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        contextInput.focus(); // Foca no contexto para incentivar uso
        saveContentToCloud();
    }
}

// --- GERENCIAMENTO DE ESTADO E INICIALIZAÇÃO ---

// Atualiza UI baseada no estado de login
function updateUIForUser(user) {
    if (user) {
        // Usuário logado
        currentUser = user;
        loginScreen.style.display = 'none';
        appContent.style.display = 'block';
        
        userAvatar.src = user.photoURL;
        userName.textContent = user.displayName;
        
        // Inicializa DB e Carrega dados
        initDB().then(() => loadContentFromCloud());
    } else {
        // Usuário deslogado
        currentUser = null;
        loginScreen.style.display = 'flex';
        appContent.style.display = 'none';
        contentList.innerHTML = ''; // Limpa dados da tela
    }
}

// Listeners Globais
document.addEventListener('DOMContentLoaded', () => {
    // Verifica estado de autenticação ao carregar
    auth.onAuthStateChanged((user) => {
        updateUIForUser(user);
    });
});

btnLoginGoogle.addEventListener('click', async () => {
    try {
        await auth.signInWithGoogle();
        // onAuthStateChanged cuidará da atualização da UI
    } catch (error) {
        console.error("Erro no login:", error);
        showToast("❌ Erro ao fazer login");
    }
});

btnLogout.addEventListener('click', async () => {
    await auth.signOut();
    // onAuthStateChanged cuidará da atualização da UI
});

btnNew.addEventListener('click', () => createNewCard());
