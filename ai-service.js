import { GoogleGenAI, Type } from "@google/genai";

// Inicializa o cliente com a chave da API do ambiente
// Nota: Em um app real de produção, evite expor chaves no cliente se possível, 
// mas para este protótipo "lean", usamos diretamente conforme solicitado.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Modelo recomendado para tarefas de texto eficientes
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Função para gerar conteúdo baseado no contexto do vídeo.
 * @param {string} videoContext - Descrição textual ou título do vídeo.
 * @returns {Promise<{caption: string, hashtags: string[]}>}
 */
export async function generateContent(videoContext) {
    if (!videoContext || videoContext.trim() === "") {
        throw new Error("Por favor, forneça um contexto ou descrição do vídeo.");
    }

    try {
        // Definição do Schema para garantir que o Gemini retorne JSON estruturado
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                caption: {
                    type: Type.STRING,
                    description: "Uma legenda engajadora para redes sociais (Instagram/TikTok), usando emojis e quebra de linha.",
                },
                hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Uma lista de 5 a 10 hashtags relevantes e de alto alcance.",
                }
            },
            required: ["caption", "hashtags"],
        };

        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `Atue como um especialista em Social Media Marketing. Crie conteúdo para um vídeo com o seguinte contexto: "${videoContext}". O tom deve ser autêntico e convidar à interação.` }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7, // Criatividade balanceada
            }
        });

        // O SDK já retorna o texto, mas precisamos fazer o parse pois responseMimeType é JSON
        const jsonResponse = JSON.parse(result.text);
        
        return jsonResponse;

    } catch (error) {
        console.error("Erro ao chamar Gemini API:", error);
        throw error;
    }
}