document.addEventListener('DOMContentLoaded', () => {
    const btnNew = document.getElementById('btn-new');
    const contentList = document.getElementById('content-list');
    const template = document.getElementById('card-template');

    // Função para criar um novo card
    function createNewCard() {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.content-card');
        
        // Configurar Elementos Internos
        const btnDelete = card.querySelector('.btn-delete');
        
        // Configurar Upload de Vídeo (Preview)
        const fileInput = card.querySelector('.input-video-file');
        const videoPreview = card.querySelector('.video-preview');
        const placeholder = card.querySelector('.video-preview-placeholder');

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
            }
        });

        // Adicionar Data de Hoje por padrão
        const dateInput = card.querySelector('.input-date');
        dateInput.valueAsDate = new Date();

        // Adicionar ao topo da lista (efeito "Novo")
        contentList.prepend(card);
        
        // Scroll suave para o novo card
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Event Listeners Globais
    btnNew.addEventListener('click', createNewCard);

    // Criar um card inicial para não ficar vazio
    createNewCard();
});