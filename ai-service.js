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
        
        // Tenta conectar ao servidor Node.js com timeout curto (2s) para fallback rápido
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

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
            throw new Error(`Status: ${response.status}`);
        }

        const data = await response.json();
        return {
            caption: data.caption || "",
            hashtags: data.hashtags || []
        };

    } catch (error) {
        console.warn("⚠️ Backend offline ou não configurado. Ativando MODO SIMULAÇÃO.", error);
        
        // Notifica o usuário visualmente (via console ou UI se possível, aqui retornamos dados)
        // Isso garante que o botão "Gerar" sempre funcione, mesmo sem servidor Node.js rodando.
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay artificial "pensando"

        const ctx = videoContext.toLowerCase();
        const isTech = ctx.includes('code') || ctx.includes('ia') || ctx.includes('dev') || ctx.includes('react');
        const isFood = ctx.includes('receita') || ctx.includes('comida') || ctx.includes('bolo');
        
        let demoCaption = "";
        let demoHashtags = [];

        if (isTech) {
            demoCaption = `🚀 Dica rápida de Dev!\n\nHoje vou mostrar como resolver "${videoContext}" de forma simples e eficiente. Essa técnica salvou horas do meu projeto.\n\n👇 Já conhecia esse método? Comenta aí!\n\n(Texto gerado em Modo Simulação - Configure o Backend para IA real)`;
            demoHashtags = ["#DevLife", "#Coding", "#TechTips", "#Programador"];
        } else if (isFood) {
            demoCaption = `😋 Água na boca!\n\nQuem aí resiste a "${videoContext}"? O segredo para ficar perfeito eu conto no vídeo. Salva pra não perder!\n\n(Texto gerado em Modo Simulação)`;
            demoHashtags = ["#Receitas", "#Gastronomia", "#DicaDeCozinha", "#Delicia"];
        } else {
            demoCaption = `✨ Momento especial: "${videoContext}"\n\nÀs vezes a gente só precisa parar e apreciar o processo. Espero que gostem do resultado tanto quanto eu!\n\n(Texto gerado em Modo Simulação)`;
            demoHashtags = ["#Lifestyle", "#Vlog", "#Inspiração", "#DiaADia"];
        }

        return {
            caption: demoCaption,
            hashtags: demoHashtags
        };
    }
}