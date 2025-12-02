/**
 * Serviço de IA (Frontend)
 * Responsável por comunicar com o Backend Seguro.
 * NÃO contém chaves de API nem lógica direta do Gemini SDK.
 */

// URL do Backend
// NOTA: Ao fazer deploy do backend (Vercel/Render), altere esta URL para o endereço de produção.
// Exemplo Prod: const API_URL = "https://seu-backend-app.onrender.com/api/generate-content";
const API_URL = "http://localhost:3000/api/generate-content";

/**
 * Função para solicitar a geração de conteúdo ao backend.
 * @param {string} videoContext - Descrição textual ou título do vídeo.
 * @returns {Promise<{caption: string, hashtags: string[]}>}
 */
export async function generateContent(videoContext) {
    if (!videoContext || videoContext.trim() === "") {
        throw new Error("Por favor, forneça um contexto ou descrição do vídeo.");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoReference: videoContext })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
        }

        const data = await response.json();
        
        // Garante que o retorno tenha o formato esperado pela UI
        return {
            caption: data.caption || "",
            hashtags: data.hashtags || []
        };

    } catch (error) {
        console.error("Erro ao comunicar com o Backend de IA:", error);
        throw error;
    }
}