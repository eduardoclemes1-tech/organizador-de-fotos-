import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";

// Inicialização do App Express
const app = express();
const port = process.env.PORT || 3000;

// Configuração de CORS
// IMPORTANTE: Em produção, substitua '*' pela URL do seu frontend no GitHub Pages
// Exemplo: app.use(cors({ origin: 'https://seu-usuario.github.io' }));
app.use(cors()); 

// Middleware para parsear JSON no body das requisições
app.use(express.json());

// Validação de Segurança Inicial
if (!process.env.GEMINI_API_KEY) {
    console.error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está definida.");
    process.exit(1);
}

// Inicialização do SDK do Gemini (Backend-side)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Constantes do Modelo
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Endpoint Seguro: POST /api/generate-content
 * Recebe: { videoReference: string }
 * Retorna: { caption: string, hashtags: string[] }
 */
app.post('/api/generate-content', async (req, res) => {
    try {
        const { videoReference } = req.body;

        if (!videoReference) {
            return res.status(400).json({ error: "O campo 'videoReference' é obrigatório." });
        }

        console.log(`[LOG] Recebendo requisição para: "${videoReference}"`);

        // Definição do Schema de Resposta (JSON Estruturado)
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                caption: {
                    type: Type.STRING,
                    description: "Uma legenda engajadora para redes sociais (Instagram/TikTok), usando emojis e quebra de linha. Tom autêntico.",
                },
                hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Uma lista de 5 a 10 hashtags relevantes e de alto alcance em pt-BR.",
                }
            },
            required: ["caption", "hashtags"],
        };

        // Construção do Prompt Seguro
        const prompt = `Atue como um especialista Sênior em Social Media Marketing. 
        Crie conteúdo para um vídeo com o seguinte contexto: "${videoReference}".
        
        Diretrizes:
        1. O tom deve ser conversacional, autêntico e convidar à interação (CTA).
        2. Use emojis estrategicamente.
        3. As hashtags devem ser mistas (alto volume e nicho).`;

        // Chamada à API do Gemini
        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            }
        });

        // Processamento da resposta
        // O SDK retorna o JSON como string na propriedade .text
        if (result.text) {
            const jsonResponse = JSON.parse(result.text);
            return res.status(200).json(jsonResponse);
        } else {
            throw new Error("Resposta vazia do modelo.");
        }

    } catch (error) {
        console.error("Erro no processamento do servidor:", error);
        return res.status(500).json({ 
            error: "Erro interno ao gerar conteúdo.",
            details: error.message 
        });
    }
});

// Inicializa o servidor
app.listen(port, () => {
    console.log(`🚀 Servidor Backend rodando em http://localhost:${port}`);
    console.log(`🔒 Endpoint seguro disponível em /api/generate-content`);
});