
// Elementos do DOM
const btnNew = document.getElementById('btn-new');
const contentList = document.getElementById('content-list');
const template = document.getElementById('card-template');

// Chaves e Configurações
const STORAGE_KEY_TEXT = 'videoContentOrganizer_data_v2'; // Salva texto e IDs
const DB_NAME = 'VideoManagerDB';
const DB_VERSION = 1;
const DB_STORE_NAME = 'videos';

// --- CAMADA DE BANCO DE DADOS (IndexedDB) ---
// O IndexedDB permite salvar arquivos (Blobs) grandes, diferentemente do localStorage

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
            // Cria um "store" (tabela) para os vídeos se não existir
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

// --- LÓGICA DA APLICAÇÃO ---

// Salva apenas os metadados (texto e ID) no LocalStorage
function saveTextData() {
    const cards = contentList.querySelectorAll('.content-card');
    const data = [];

    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const dateInput = card.querySelector('.input-date');
        const captionInput = card.querySelector('.output-caption');
        const hashtagInput = card.querySelector('.input-hashtags');
        const fileNameLabel = card.querySelector('.video-filename-label');

        data.push({
            id: id,
            date: dateInput.value,
            caption: captionInput.value,
            hashtags: hashtagInput.value,
            fileName: fileNameLabel.innerText || "" // Salva o nome do arquivo para referência
        });
    });

    localStorage.setItem(STORAGE_KEY_TEXT, JSON.stringify(data));
    showToast("💾 Alterações salvas");
}

async function createNewCard(initialData = null) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.content-card');
    
    // Gera um novo ID se não existir (caso seja um card novo)
    const cardId = initialData ? initialData.id : generateUUID();
    card.setAttribute('data-id', cardId);

    // Elementos
    const dateInput = card.querySelector('.input-date');
    const captionInput = card.querySelector('.output-caption');
    const hashtagInput = card.querySelector('.input-hashtags');
    const hashtagError = card.querySelector('.hashtag-error');
    const btnDelete = card.querySelector('.btn-delete');
    
    // Elementos de Vídeo
    const fileInput = card.querySelector('.input-video-file');
    const videoPreview = card.querySelector('.video-preview');
    const placeholder = card.querySelector('.video-preview-placeholder');

    // Label para nome do arquivo (criado dinamicamente)
    let fileNameLabel = document.createElement('small');
    fileNameLabel.className = 'video-filename-label';
    fileNameLabel.style.display = 'block';
    fileNameLabel.style.marginTop = '5px';
    fileNameLabel.style.color = '#64748b';
    card.querySelector('.video-uploader').after(fileNameLabel);

    // Preencher dados iniciais
    if (initialData) {
        dateInput.value = initialData.date;
        captionInput.value = initialData.caption;
        hashtagInput.value = initialData.hashtags;
        if(initialData.fileName) {
            fileNameLabel.innerText = initialData.fileName;
        }

        // Tenta carregar o vídeo do banco de dados
        try {
            const videoFile = await getVideoFromDB(cardId);
            if (videoFile) {
                const url = URL.createObjectURL(videoFile);
                videoPreview.src = url;
                videoPreview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        } catch (error) {
            console.error("Erro ao recuperar vídeo:", error);
        }
    } else {
        dateInput.value = getTodayDate();
    }

    // --- EVENTOS ---

    // 1. Salvar Texto
    const inputsToSave = [dateInput, captionInput];
    inputsToSave.forEach(input => {
        input.addEventListener('input', saveTextData);
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
        saveTextData();
    });

    // 3. Upload e Salvamento de Vídeo
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Preview imediato
            const url = URL.createObjectURL(file);
            videoPreview.src = url;
            videoPreview.style.display = 'block';
            placeholder.style.display = 'none';
            fileNameLabel.innerText = "Arquivo: " + file.name;

            // Salvar no Banco de Dados
            try {
                showToast("⏳ Salvando vídeo...");
                await saveVideoToDB(cardId, file);
                saveTextData(); // Atualiza o nome do arquivo no texto
                showToast("✅ Vídeo salvo no navegador!");
            } catch (err) {
                console.error(err);
                showToast("❌ Erro ao salvar vídeo (pode ser muito grande).");
            }
        }
    });

    // 4. Deletar
    btnDelete.addEventListener('click', async () => {
        if(confirm('Tem certeza que deseja remover este conteúdo e o vídeo salvo?')) {
            card.remove();
            saveTextData(); // Remove do localStorage
            await deleteVideoFromDB(cardId); // Remove do IndexedDB para liberar espaço
        }
    });

    // Adiciona ao DOM (Topo da lista)
    contentList.prepend(card);
    
    // Se for novo (clique do botão), scroll e salva inicial
    if (!initialData) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        saveTextData();
    }
}

// Função de Carga Inicial
async function initApp() {
    // 1. Inicia Banco de Dados
    await initDB();

    // 2. Carrega Textos do LocalStorage
    try {
        const saved = localStorage.getItem(STORAGE_KEY_TEXT);
        if (saved) {
            const data = JSON.parse(saved);
            if (Array.isArray(data) && data.length > 0) {
                // Inverte loop para manter a ordem correta com prepend
                for (let i = data.length - 1; i >= 0; i--) {
                    await createNewCard(data[i]);
                }
                return;
            }
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
    
    // Se vazio, cria um card
    createNewCard();
}

// Listeners Globais
btnNew.addEventListener('click', () => createNewCard());

// Iniciar
initApp();
