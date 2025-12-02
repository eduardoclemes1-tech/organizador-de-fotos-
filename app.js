
// Elementos do DOM
const btnNew = document.getElementById('btn-new');
const contentList = document.getElementById('content-list');
const template = document.getElementById('card-template');

// Chaves e Configurações
const STORAGE_KEY_DATA = 'contentOrganizerData'; // Conforme solicitado no prompt
const DB_NAME = 'VideoManagerDB';
const DB_VERSION = 1;
const DB_STORE_NAME = 'videos';

// --- CAMADA DE BANCO DE DADOS (IndexedDB) ---
// Mantido para garantir que o vídeo seja salvo de verdade, superando a limitação do LocalStorage.

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

async function saveVideoToDB(id, file) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DB_STORE_NAME);
        
        const item = {
            id: id,
            file: file,
            timestamp: new Date().getTime()
        };

        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

async function getVideoFromDB(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(DB_STORE_NAME);
        const request = store.get(id);

        request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.file : null);
        };
        request.onerror = (e) => reject(e);
    });
}

async function deleteVideoFromDB(id) {
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

// --- PERSISTÊNCIA DE DADOS (LocalStorage) ---

/**
 * Salva o estado atual da aplicação no LocalStorage.
 * Captura os dados diretamente do DOM para garantir sincronia.
 */
function saveContentToLocalStorage() {
    const cards = contentList.querySelectorAll('.content-card');
    const dataArray = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const dateInput = card.querySelector('.input-date');
        const captionInput = card.querySelector('.output-caption');
        const hashtagInput = card.querySelector('.input-hashtags');
        const fileNameLabel = card.querySelector('.video-filename-label');

        // Estrutura do objeto conforme solicitado
        const contentBlock = {
            id: id,
            date: dateInput.value,
            legend: captionInput.value, // Renomeado para 'legend' conforme prompt
            hashtags: hashtagInput.value,
            videoReference: fileNameLabel.innerText || "" // Armazena o nome do arquivo
        };

        dataArray.push(contentBlock);
    });

    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataArray));
    showToast("💾 Alterações salvas");
}

/**
 * Carrega os dados do LocalStorage e renderiza a interface.
 */
async function loadContentFromLocalStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY_DATA);
        
        if (savedData) {
            const dataArray = JSON.parse(savedData);
            
            if (Array.isArray(dataArray) && dataArray.length > 0) {
                // Inverte loop para manter a ordem visual correta ao usar prepend
                for (let i = dataArray.length - 1; i >= 0; i--) {
                    await createNewCard(dataArray[i]);
                }
            } else {
                // Se array vazio, cria um card novo
                createNewCard(); 
            }
        } else {
            // Se nenhum dado salvo, inicia com um card vazio
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
    
    // Gera ID ou usa o existente
    const cardId = initialData ? initialData.id : generateUUID();
    card.setAttribute('data-id', cardId);

    // Seleção de Elementos
    const dateInput = card.querySelector('.input-date');
    const captionInput = card.querySelector('.output-caption');
    const hashtagInput = card.querySelector('.input-hashtags');
    const hashtagError = card.querySelector('.hashtag-error');
    const btnDelete = card.querySelector('.btn-delete');
    
    // Elementos de Vídeo
    const fileInput = card.querySelector('.input-video-file');
    const videoPreview = card.querySelector('.video-preview');
    const placeholder = card.querySelector('.video-preview-placeholder');

    // Label para nome do arquivo (Video Reference)
    let fileNameLabel = document.createElement('small');
    fileNameLabel.className = 'video-filename-label';
    fileNameLabel.style.display = 'block';
    fileNameLabel.style.marginTop = '5px';
    fileNameLabel.style.color = '#64748b';
    card.querySelector('.video-uploader').after(fileNameLabel);

    // Preencher dados iniciais se existirem (Load)
    if (initialData) {
        dateInput.value = initialData.date || getTodayDate();
        captionInput.value = initialData.legend || ""; // Mapeando 'legend'
        hashtagInput.value = initialData.hashtags || "";
        
        if(initialData.videoReference) {
            fileNameLabel.innerText = initialData.videoReference;
        }

        // Tenta recuperar o arquivo real do IndexedDB (Feature Extra)
        try {
            const videoFile = await getVideoFromDB(cardId);
            if (videoFile) {
                const url = URL.createObjectURL(videoFile);
                videoPreview.src = url;
                videoPreview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        } catch (error) {
            console.error("Erro ao recuperar vídeo do DB:", error);
        }
    } else {
        // Padrão para novos cards
        dateInput.value = getTodayDate();
    }

    // --- EVENTOS E GATILHOS DE SALVAMENTO ---

    // 1. Salvar Texto ao digitar
    const inputsToSave = [dateInput, captionInput];
    inputsToSave.forEach(input => {
        input.addEventListener('input', saveContentToLocalStorage);
    });

    // 2. Validação e Salvamento de Hashtags
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
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Preview
            const url = URL.createObjectURL(file);
            videoPreview.src = url;
            videoPreview.style.display = 'block';
            placeholder.style.display = 'none';
            fileNameLabel.innerText = "Arquivo: " + file.name;

            // Salvar Vídeo Real (IndexedDB) e Metadados (LocalStorage)
            try {
                showToast("⏳ Salvando vídeo...");
                await saveVideoToDB(cardId, file);
                saveContentToLocalStorage(); 
                showToast("✅ Vídeo salvo!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar vídeo.");
            }
        }
    });

    // 4. Exclusão
    btnDelete.addEventListener('click', async () => {
        if(confirm('Tem certeza que deseja remover este conteúdo?')) {
            card.remove();
            await deleteVideoFromDB(cardId); // Limpa DB
            saveContentToLocalStorage(); // Atualiza LocalStorage
        }
    });

    // Adiciona ao DOM
    contentList.prepend(card);
    
    // Se for um card criado manualmente pelo botão, foca e salva
    if (!initialData) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        saveContentToLocalStorage();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); // Prepara o banco de vídeos
    await loadContentFromLocalStorage(); // Carrega a interface
});

// Listener do Botão Novo
btnNew.addEventListener('click', () => createNewCard());
