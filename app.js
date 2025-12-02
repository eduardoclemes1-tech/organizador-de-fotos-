
// Elementos do DOM
const btnNew = document.getElementById('btn-new');
const contentList = document.getElementById('content-list');
const template = document.getElementById('card-template');

// Chaves e Configurações
const STORAGE_KEY_DATA = 'contentOrganizerData'; 
const DB_NAME = 'VideoManagerDB';
const DB_VERSION = 2; // Incrementado versão para garantir atualização se necessário
const DB_STORE_NAME = 'media_content'; // Renomeado para refletir que guarda video e imagem

// --- CAMADA DE BANCO DE DADOS (IndexedDB) ---

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
// Tipo pode ser 'video' ou 'thumbnail'
async function saveMediaToDB(id, type, file) {
    if (!db) await initDB();
    
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        
        // Primeiro, tentamos obter o registro existente para não sobrescrever o outro arquivo
        const getRequest = store.get(id);

        getRequest.onsuccess = (event) => {
            let data = event.target.result || { id: id, timestamp: new Date().getTime() };
            
            // Atualiza apenas o campo específico
            if (type === 'video') data.video = file;
            if (type === 'thumbnail') data.thumbnail = file;
            
            data.timestamp = new Date().getTime(); // Atualiza timestamp

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
            resolve(result || null); // Retorna objeto {id, video, thumbnail} ou null
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
        // Fallback caso html não tenha o elemento
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// --- PERSISTÊNCIA DE DADOS (LocalStorage) ---

function saveContentToLocalStorage() {
    const cards = contentList.querySelectorAll('.content-card');
    const dataArray = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const dateInput = card.querySelector('.input-date');
        const captionInput = card.querySelector('.output-caption');
        const hashtagInput = card.querySelector('.input-hashtags');
        
        // Labels de referência (nomes dos arquivos)
        const videoLabel = card.querySelector('.video-filename-label');
        const thumbLabel = card.querySelector('.thumb-filename-label');

        const contentBlock = {
            id: id,
            date: dateInput.value,
            legend: captionInput.value,
            hashtags: hashtagInput.value,
            videoReference: videoLabel ? videoLabel.innerText : "",
            thumbnailReference: thumbLabel ? thumbLabel.innerText : ""
        };

        dataArray.push(contentBlock);
    });

    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataArray));
    showToast("💾 Alterações salvas");
}

async function loadContentFromLocalStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY_DATA);
        
        if (savedData) {
            const dataArray = JSON.parse(savedData);
            
            if (Array.isArray(dataArray) && dataArray.length > 0) {
                // Inverte loop para manter a ordem visual correta (append vs prepend)
                // Como createNewCard usa prepend, iteramos do ultimo para o primeiro para manter a ordem salva
                for (let i = dataArray.length - 1; i >= 0; i--) {
                    await createNewCard(dataArray[i]);
                }
            } else {
                createNewCard(); 
            }
        } else {
            createNewCard();
        }
    } catch (error) {
        console.error("Erro ao carregar do LocalStorage:", error);
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
    const captionInput = card.querySelector('.output-caption');
    const hashtagInput = card.querySelector('.input-hashtags');
    const hashtagError = card.querySelector('.hashtag-error');
    const btnDelete = card.querySelector('.btn-delete');
    
    // Elementos de Mídia
    const videoInput = card.querySelector('.input-video-file');
    const videoPreview = card.querySelector('.video-preview');
    const videoPlaceholder = card.querySelector('.video-uploader .preview-placeholder');

    const thumbInput = card.querySelector('.input-thumb-file');
    const thumbPreview = card.querySelector('.thumb-preview');
    const thumbPlaceholder = card.querySelector('.thumb-uploader .preview-placeholder');

    // Labels para nome dos arquivos
    let videoNameLabel = document.createElement('small');
    videoNameLabel.className = 'filename-label video-filename-label';
    card.querySelector('.video-uploader').after(videoNameLabel);

    let thumbNameLabel = document.createElement('small');
    thumbNameLabel.className = 'filename-label thumb-filename-label';
    card.querySelector('.thumb-uploader').after(thumbNameLabel);

    // Preencher dados iniciais
    if (initialData) {
        dateInput.value = initialData.date || getTodayDate();
        captionInput.value = initialData.legend || "";
        hashtagInput.value = initialData.hashtags || "";
        
        if(initialData.videoReference) videoNameLabel.innerText = initialData.videoReference;
        if(initialData.thumbnailReference) thumbNameLabel.innerText = initialData.thumbnailReference;

        // Recuperar arquivos reais do IndexedDB
        try {
            const mediaRecord = await getMediaFromDB(cardId);
            if (mediaRecord) {
                // Configurar preview de Vídeo
                if (mediaRecord.video || mediaRecord.file) { // .file é suporte legado
                    const vidBlob = mediaRecord.video || mediaRecord.file;
                    videoPreview.src = URL.createObjectURL(vidBlob);
                    videoPreview.style.display = 'block';
                    videoPlaceholder.style.display = 'none';
                }
                // Configurar preview de Thumbnail
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

    // 1. Salvar Texto
    [dateInput, captionInput].forEach(input => {
        input.addEventListener('input', saveContentToLocalStorage);
    });

    // 2. Hashtags
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
        saveContentToLocalStorage();
    });

    // 3. Upload de Vídeo
    videoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            videoPreview.src = url;
            videoPreview.style.display = 'block';
            videoPlaceholder.style.display = 'none';
            videoNameLabel.innerText = "Video: " + file.name;

            try {
                showToast("⏳ Salvando vídeo...");
                await saveMediaToDB(cardId, 'video', file);
                saveContentToLocalStorage(); 
                showToast("✅ Vídeo salvo!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar vídeo.");
            }
        }
    });

    // 4. Upload de Thumbnail
    thumbInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            thumbPreview.src = url;
            thumbPreview.style.display = 'block';
            thumbPlaceholder.style.display = 'none';
            thumbNameLabel.innerText = "Capa: " + file.name;

            try {
                showToast("⏳ Salvando capa...");
                await saveMediaToDB(cardId, 'thumbnail', file);
                saveContentToLocalStorage();
                showToast("✅ Capa salva!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar capa.");
            }
        }
    });

    // 5. Exclusão
    btnDelete.addEventListener('click', async () => {
        if(confirm('Tem certeza que deseja remover este conteúdo?')) {
            card.remove();
            await deleteMediaFromDB(cardId);
            saveContentToLocalStorage();
        }
    });

    contentList.prepend(card);
    
    if (!initialData) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        saveContentToLocalStorage();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadContentFromLocalStorage();
});

btnNew.addEventListener('click', () => createNewCard());
