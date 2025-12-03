
/**
 * Serviço de IA (Frontend)
 * Tenta comunicar com o Backend Seguro. 
 * Se o backend estiver offline, usa um modo DEMO para não travar a experiência.
 */

// URL do Backend
const API_URL = "http://localhost:3000/api/generate-content";

/**
 * Função para solicitar a geração de conteúdo.
 * Tenta o backend primeiro; se falhar, simula uma resposta.
 * @param {string} videoContext - Descrição textual ou título do vídeo.
 * @returns {Promise<{caption: string, hashtags: string[]}>}
 */
export async function generateContent(videoContext) {
    if (!videoContext || videoContext.trim() === "") {
        throw new Error("Por favor, forneça um contexto ou descrição do vídeo.");
    }

    try {
        console.log("📡 Tentando conectar ao backend em:", API_URL);
        
        // Tenta conectar ao servidor Node.js (com timeout curto para não travar)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoReference: videoContext }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
        }

        const data = await response.json();
        return {
            caption: data.caption || "",
            hashtags: data.hashtags || []
        };

    } catch (error) {
        console.warn("⚠️ Backend indisponível ou erro de conexão. Usando modo DEMO/OFFLINE.", error);
        
        // --- MODO DEMO / FALLBACK ---
        // Simula uma resposta para o usuário não ficar travado se não rodar o server.js
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simula delay da IA

        const isTech = videoContext.toLowerCase().includes('code') || videoContext.toLowerCase().includes('ia') || videoContext.toLowerCase().includes('dev');
        
        if (isTech) {
            return {
                caption: `🚀 Transforme sua forma de codar com essas dicas essenciais! 💻\n\nNo vídeo de hoje, mostro como aplicar conceitos avançados de ${videoContext} no seu dia a dia. A produtividade vai lá pro alto! 📈\n\n👇 Me conta aqui nos comentários: qual sua maior dificuldade nessa área?\n\n#DevLife`,
                hashtags: ["#Desenvolvimento", "#Programação", "#TechTips", "#CleanCode", "#Inovação"]
            };
        } else {
            return {
                caption: `✨ Aquele momento especial que a gente precisava registrar! \n\n"${videoContext}" não é só sobre o resultado, é sobre o processo. Espero que esse vídeo inspire o seu dia tanto quanto me inspirou a gravar. 🎥\n\nMarque alguém que precisa ver isso hoje! 👇`,
                hashtags: ["#Inspiração", "#Lifestyle", "#ConteúdoDigital", "#Vibes", "#Criatividade"]
            };
        }
    }
}
