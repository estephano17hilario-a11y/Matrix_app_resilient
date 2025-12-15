
// Matrix Oracle Service (AI Layer)
// Handles communication with the Intelligence Core (LLM)

export interface AIResponse {
  text: string;
  suggestedActions?: string[];
  emotion?: 'neutral' | 'happy' | 'warning' | 'thinking';
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const MOCK_RESPONSES = [
  "I am analyzing your biometrics. Stress levels are within acceptable parameters.",
  "The Matrix code is flowing efficiently today. Your productivity streak is noted.",
  "I've detected a pattern in your habit completion. You perform better in the mornings.",
  "Accessing the Archives... data retrieved. How can I assist you further?",
  "System optimal. Ready for your command.",
];

export const sendMessage = async (message: string, _history: AIMessage[] = []): Promise<AIResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simple keyword matching for "demo" intelligence
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    return {
      text: "Greetings, Operator. The system is online and listening.",
      emotion: 'happy',
      suggestedActions: ['Check Status', 'View Tasks']
    };
  }
  
  if (lowerMsg.includes('status') || lowerMsg.includes('stats')) {
    return {
      text: "Your neural interface is stable. HP is at nominal levels. XP gain is steady.",
      emotion: 'neutral',
      suggestedActions: ['View Dashboard', 'Meditate']
    };
  }

  // Random fallback
  const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  
  return {
    text: randomResponse,
    emotion: 'neutral'
  };
};

export const generateQuestSuggestion = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "Complete a 15-minute deep work session to restore focus.";
};
