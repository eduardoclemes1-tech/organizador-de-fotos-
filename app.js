import { generateContent } from './ai-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnNew = document.getElementById('btn-new');
    const contentList = document.getElementById('content-list');
    const template = document.getElementById('card-template');

    // Função para criar um novo card
    function createNewCard() {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.content-card');
        
        // Configurar Elementos Internos
        const btnGenerate = card.querySelector('.btn-generate');
        const inputContext = card.querySelector('.input-context');
        const outputCaption = card.querySelector('.output-caption');
        const outputHashtags = card.querySelector('.output-hashtags');
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
                
                // Sugestão automática se o campo contexto estiver vazio
                if(!inputContext.value) {
                    inputContext.value = `Vídeo sobre: ${file.name.replace(/\.[^/.]+$/, "")}`;
                }
            }
        });

        // Configurar Ação de Gerar (IA)
        btnGenerate.addEventListener('click', async () => {
            const context = inputContext.value;

            if (!context) {
                alert("Por favor, digite um breve contexto sobre o vídeo para ajudar a IA.");
                inputContext.focus();
                return;
            }

            // Estado de Loading
            const originalText = btnGenerate.innerText;
            btnGenerate.innerText = "Gerando...";
            btnGenerate.disabled = true;
            outputCaption.value = "Pensando na melhor legenda...";
            outputHashtags.innerText = "#aguarde";

            try {
                // Chamada ao Serviço de IA
                const data = await generateContent(context);

                // Preencher Interface
                outputCaption.value = data.caption;
                
                // Formatar Hashtags
                outputHashtags.innerHTML = '';
                data.hashtags.forEach(tag => {
                    const span = document.createElement('span');
                    span.textContent = tag.startsWith('#') ? tag : `#${tag}`;
                    outputHashtags.appendChild(span);
                });

            } catch (error) {
                outputCaption.value = "Erro ao gerar conteúdo. Tente novamente.";
                console.error(error);
                alert("Ocorreu um erro ao conectar com a IA. Verifique o console.");
            } finally {
                // Restaurar Estado
                btnGenerate.innerText = originalText;
                btnGenerate.disabled = false;
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