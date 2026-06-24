import { Platform } from 'react-native';

const GEMINI_API_KEY = "SUA_API_KEY_AQUI";

const uriToBase64 = async (uri: string): Promise<string> => {
  if (uri.startsWith('data:')) {
    return uri.split(',')[1];
  }
  
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface ScannedMeal {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  portions: number;
  items: Array<{
    name: string;
    amount: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  insights: string;
}

export const analyzeMealImage = async (imageUri: string, base64Data: string | null, presetName?: string): Promise<ScannedMeal> => {
  try {
    const base64Image = base64Data || await uriToBase64(imageUri);
    
    const prompt = `Analise a foto desta refeição. Retorne um objeto JSON com as informações nutricionais estimadas. 
Use exatamente a seguinte estrutura JSON:
{
  "name": "Nome da Refeição (ex: Salmão Grelhado com Aspargos)",
  "emoji": "Um único emoji que represente o prato",
  "calories": 450,
  "protein": 35,
  "carbs": 12,
  "fat": 15,
  "confidence": 92,
  "portions": 1,
  "items": [
    {
      "name": "Nome do ingrediente",
      "amount": "quantidade aproximada (ex: 150g ou 1 colher)",
      "calories": 300,
      "protein": 30,
      "carbs": 0,
      "fat": 10
    }
  ],
  "insights": "Uma frase curta com dica nutricional ou observação sobre o prato."
}

Retorne APENAS o JSON puro. Não coloque formatação markdown como \`\`\`json ou texto adicional. Se a imagem não for de comida, tente estimar ou use o contexto '${presetName || "Comida"}' para gerar o resultado.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("Resposta vazia da API do Gemini.");
    }

    const cleanedText = textResponse.trim().replace(/^```json/, '').replace(/```$/, '');
    const mealResult: ScannedMeal = JSON.parse(cleanedText);
    return mealResult;
  } catch (error) {
    console.error("Erro na análise do Gemini:", error);
    throw error;
  }
};

export const chatWithGemini = async (userPrompt: string, history: Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemPrompt = "Você é o NutriCaloriQ IA, um assistente de nutrição integrado no aplicativo CaloriQ. Seja prestativo, educado e dê dicas nutricionais de forma simples e motivadora em português.";
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...history,
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textResponse || "Desculpe, ocorreu um erro ao processar sua solicitação.";
  } catch (err) {
    console.error("Erro no chat com o Gemini:", err);
    throw err;
  }
};
