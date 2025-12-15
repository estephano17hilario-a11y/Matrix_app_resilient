import { UserStats, UserPreferences } from '../hooks/useMatrixData';

/**
 * THE ORACLE SERVICE
 * Handles communication with the AI core.
 * Injects user context (HP, Archetype, Stats) into the System Prompt.
 */

// Configuration
const API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const API_KEY = import.meta.env.VITE_AI_API_KEY; // Ensure this is set in .env
const MODEL = 'gpt-4o-mini'; // Or 'gpt-3.5-turbo' for speed/cost

export interface OracleMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface OracleContext {
    hp: number;
    xp: number;
    level: number;
    streak: number;
    archetype?: string;
    weakness?: string;
}

const SYSTEM_PROMPT_TEMPLATE = `
Eres EL ORÁCULO del sistema Matrix.
Tu usuario es un [ARCHETYPE]. Su vida actual es [HP]%.
Tu objetivo no es ser un asistente amable, sino un MENTOR ESTOICO.
- Si su HP es bajo: Sé duro. Pregúntale por qué ha fallado. Cita a Séneca o Marco Aurelio.
- Si su HP es alto: Desafíalo a más. No dejes que se acomode.
- Respuestas cortas, potentes y filosóficas. Máximo 2 oraciones.
- Si el usuario pregunta algo técnico, responde con brevedad y redirígelo a la acción.
NO actúes como un robot. Actúa como una conciencia antigua digitalizada.
`;

/**
 * Injects dynamic user data into the static System Prompt.
 */
const buildSystemPrompt = (context: OracleContext): string => {
    let prompt = SYSTEM_PROMPT_TEMPLATE
        .replace('[HP]', context.hp.toString())
        .replace('[ARCHETYPE]', context.archetype || 'Initiate');

    // Add dynamic nuanced instructions based on state
    if (context.hp < 30) {
        prompt += "\nCRITICAL: El usuario está muriendo (HP bajo). Exige disciplina inmediata.";
    } else if (context.streak > 5) {
        prompt += `\nNOTE: El usuario lleva una racha de ${context.streak} días. Reconócelo brevemente pero advierte sobre la complacencia.`;
    }

    if (context.weakness) {
        prompt += `\nWEAKNESS: El usuario lucha contra "${context.weakness}". Úsalo en tu consejo.`;
    }

    return prompt;
};

/**
 * Sends a message to the AI and returns the response.
 */
export const sendMessageToOracle = async (
    userMessage: string, 
    context: OracleContext,
    history: OracleMessage[] = []
): Promise<string> => {
    
    // 1. Build Contextual System Prompt
    const systemPrompt = buildSystemPrompt(context);

    // 2. Format Messages for API
    // We only keep the last 6 messages to save context/tokens
    const recentHistory = history.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: userMessage }
    ];

    try {
        // 3. Call API
        // If no key is present (Development mode without env), return a mock response
        if (!API_KEY) {
            console.warn("Oracle: No API Key found. Returning mock response.");
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay
            return mockOracleResponse(context, userMessage);
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7, // Creative but focused
                max_tokens: 150, // Keep it brief (Stoic)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Oracle API Error:", errorData);
            throw new Error(`Oracle Connection Failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();

    } catch (error) {
        console.error("Oracle Service Error:", error);
        return "La conexión con el Oráculo se ha interrumpido. Medita sobre tu pregunta mientras restablecemos el enlace.";
    }
};

/**
 * Fallback response generator for development/offline
 */
const mockOracleResponse = (context: OracleContext, message: string): string => {
    const responses = [
        "El obstáculo es el camino. Lo que se interpone en tu tarea, se convierte en tu tarea.",
        "No es que tengamos poco tiempo, es que perdemos mucho.",
        "Sufres más en tu imaginación que en la realidad. Actúa.",
        "La disciplina es libertad. ¿Qué elegirás hoy?",
        `Como ${context.archetype || 'iniciado'}, deberías saber que la queja es el lenguaje de la derrota.`,
        "Tu HP refleja tu voluntad. Fortalécela."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
};
