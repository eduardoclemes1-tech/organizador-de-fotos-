document.addEventListener('DOMContentLoaded', () => {
    const btnNew = document.getElementById('btn-new');
    const contentList = document.getElementById('content-list');
    const template = document.getElementById('card-template');

    // Chave para salvar no navegador
    const STORAGE_KEY = 'videoContentOrganizer_v1';

    // Carregar dados salvos ao iniciar
    loadData();

    // Função para salvar dados no LocalStorage
    function saveData() {
        const cards = contentList.querySelectorAll('.content-card');
        const data = [];

        cards.forEach(card => {
            const dateInput = card.querySelector('.input-date');
            const captionInput = card.querySelector('.output-caption');
            const hashtagInput = card.querySelector('.input-hashtags');

            data.push({
                date: dateInput.value,
                caption: captionInput.value,
                hashtags: hashtagInput.value
            });
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // Função para carregar dados
    function loadData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // Se houver dados, cria cards para cada item
            if (data.length > 0) {
                // Inverter ordem para manter a lógica de prepend (novo no topo) correta durante o load
                // ou simplesmente adicionar e limpar se necessário.
                // Como createNewCard usa prepend, vamos iterar do último para o primeiro para manter ordem visual
                for (let i = data.length - 1; i >= 0; i--) {
                    createNewCard(data[i]);
                }
                return;
            }
        }
        // Se não tiver dados, cria um card vazio inicial
        createNewCard();
    }

    // Função para criar um novo card
    function createNewCard(initialData = null) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.content-card');
        
        // Elementos
        const dateInput = card.querySelector('.input-date');
        const captionInput = card.querySelector('.output-caption');
        const hashtagInput = card.querySelector('.input-hashtags');
        const hashtagError = card.querySelector('.hashtag-error');
        const btnDelete = card.querySelector('.btn-delete');
        
        // Configurar Upload de Vídeo (Preview - Não salva no localStorage)
        const fileInput = card.querySelector('.input-video-file');
        const videoPreview = card.querySelector('.video-preview');
        const placeholder = card.querySelector('.video-preview-placeholder');

        // Preencher dados iniciais se existirem (do Load)
        if (initialData) {
            dateInput.value = initialData.date;
            captionInput.value = initialData.caption;
            hashtagInput.value = initialData.hashtags;
        } else {
            // Data de Hoje por padrão para novos cards
            dateInput.valueAsDate = new Date();
        }

        // --- Eventos para Salvar Automaticamente ---
        
        // Evento Inputs Gerais
        const inputsToSave = [dateInput, captionInput];
        inputsToSave.forEach(input => {
            input.addEventListener('input', saveData);
        });

        // Evento e Validação de Hashtags
        hashtagInput.addEventListener('input', (e) => {
            const text = e.target.value;
            // Separa por espaço e filtra strings vazias
            const tags = text.trim().split(/\s+/).filter(t => t.length > 0);
            
            if (tags.length > 5) {
                hashtagInput.classList.add('error');
                hashtagError.style.display = 'block';
            } else {
                hashtagInput.classList.remove('error');
                hashtagError.style.display = 'none';
            }
            saveData();
        });

        // Evento Vídeo
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                videoPreview.src = url;
                videoPreview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        });

        // Configurar Deleção
        btnDelete.addEventListener('click', () => {
            if(confirm('Tem certeza que deseja remover este item?')) {
                card.remove();
                saveData(); // Atualiza o storage após deletar
            }
        });

        // Adicionar ao topo da lista
        contentList.prepend(card);
        
        // Se for um card criado pelo botão "Novo" (não carregamento inicial), foca e scrolla
        if (!initialData) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saveData(); // Salva o novo card vazio
        }
    }

    // Event Listeners Globais
    btnNew.addEventListener('click', () => createNewCard());
});