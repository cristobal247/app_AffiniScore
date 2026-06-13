import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  
  // Mantenemos el historial de la conversación
  private conversationHistory: ChatMessage[] = [
    { 
      role: 'system', 
      content: `Rol del Sistema:
Eres "AffiniCoach", experto en terapia de parejas en la app AffiniScore. Tu objetivo es fortalecer el vínculo afectivo de los usuarios. Tu tono es cálido, maduro y profesional. Eres directo pero empático.

Instrucciones:
- Usa siempre el nombre del usuario (si está disponible) para mayor cercanía.
- Brinda un consejo constructivo y valida emocionalmente la acción o el problema.
- Da una respuesta perfectamente balanceada: ni muy corta, ni muy larga. Exactamente el punto medio.

Restricciones:
- Escribe exactamente 2 o 3 párrafos cortos (no más de 2 oraciones por párrafo).
- Tu respuesta total debe tener entre 60 y 90 palabras. Ni mucha información abrumadora, ni muy poca.
- NUNCA uses listas, guiones ni viñetas. Redacta de forma natural.
- Evita introducciones largas y ve al punto central.`
    }
  ];

  constructor() {}

  async sendMessage(message: string, userName?: string, imageUrl?: string): Promise<string> {
    // Añadimos metadatos si tenemos el nombre del usuario
    const finalMessage = userName ? `[Contexto del Sistema: El usuario que te habla se llama ${userName}]\n\n${message}` : message;
    
    // Añadimos el mensaje del usuario al historial
    if (imageUrl) {
      this.conversationHistory.push({
        role: 'user',
        content: [
          { type: 'text', text: finalMessage },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      this.conversationHistory.push({ role: 'user', content: finalMessage });
    }

    const model = 'gemini-2.5-flash';

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(environment as any).apiKeyGemini}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 350,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error details:', errorText);
        throw new Error(`Error de red: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const botResponse = data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
      
      // Añadimos la respuesta de la IA al historial
      this.conversationHistory.push({ role: 'assistant', content: botResponse });
      
      return botResponse;
    } catch (error) {
      console.error('Error al comunicarse con Gemini API:', error);
      // Si hay error, quitamos el último mensaje del usuario para no corromper el historial
      this.conversationHistory.pop();
      return 'Disculpa, tuve un problema al conectarme. ¿Podrías intentar de nuevo?';
    }
  }
  
  // Método opcional para resetear la conversación
  resetConversation() {
    this.conversationHistory = [
      { 
        role: 'system', 
        content: `Rol del Sistema:
Eres "AffiniCoach", experto en terapia de parejas en la app AffiniScore. Tu objetivo es fortalecer el vínculo afectivo de los usuarios. Tu tono es cálido, maduro y profesional. Eres directo pero empático.

Instrucciones:
- Usa siempre el nombre del usuario (si está disponible) para mayor cercanía.
- Brinda un consejo constructivo y valida emocionalmente la acción o el problema.
- Da una respuesta perfectamente balanceada: ni muy corta, ni muy larga. Exactamente el punto medio.

Restricciones:
- Escribe exactamente 2 o 3 párrafos cortos (no más de 2 oraciones por párrafo).
- Tu respuesta total debe tener entre 60 y 90 palabras. Ni mucha información abrumadora, ni muy poca.
- NUNCA uses listas, guiones ni viñetas. Redacta de forma natural.
- Evita introducciones largas y ve al punto central.`
      }
    ];
  }

  // Analizar acción personalizada, clasificar en categorías y asignar puntaje automáticamente
  async analyzeCustomAction(actionText: string): Promise<{ category: string, points: number, description: string }> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(environment as any).apiKeyGemini}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'Eres el motor clasificador y evaluador de la app AffiniScore. Tu labor es analizar la acción registrada por el usuario y clasificarla estrictamente en una de las siguientes categorías válidas: "Social", "Detalles", "Cita", "Aventura", "Hogar", "Cuidado", "Cultura", "Salud". También debes asignarle un puntaje entero del 10 al 100 de acuerdo al esfuerzo físico, de tiempo, económico o emocional involucrado en dicha acción (con un máximo absoluto de 100 puntos y un mínimo de 10). Por último, genera una breve y cálida descripción de 1 frase que valide el valor de ese gesto. Responde EXCLUSIVAMENTE con un objeto JSON válido, sin formato de markdown ni explicaciones, por ejemplo: {"category": "Detalles", "points": 35, "description": "Compraste un rico pie de limón para consentir a tu pareja."}'
            },
            { role: 'user', content: actionText }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      const rawText = data.choices[0]?.message?.content?.trim() || '';
      
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const validCategories = ["Social", "Detalles", "Cita", "Aventura", "Hogar", "Cuidado", "Cultura", "Salud"];
        let matchedCategory = validCategories.find(c => c.toLowerCase() === (parsed.category || '').toLowerCase().trim());
        if (!matchedCategory) matchedCategory = "Detalles";

        return {
          category: matchedCategory,
          points: Math.min(Math.max(Number(parsed.points) || 15, 10), 100),
          description: parsed.description || 'Una acción especial registrada.'
        };
      }
      throw new Error('JSON not found');
    } catch (e) {
      console.error('Error analyzing action with IA:', e);
      return { category: 'Detalles', points: 15, description: 'Acción personalizada registrada con éxito.' };
    }
  }

  // Cargar historial desde la base de datos para mantener el contexto
  setConversationHistory(dbMessages: any[]) {
    this.resetConversation();
    
    // Mapeamos los mensajes de la base de datos al formato de Gemini
    for (const msg of dbMessages) {
      if (msg.sender_type === 'USER') {
        const imageUrl = msg.metadata?.image_url;
        if (imageUrl) {
          this.conversationHistory.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.message },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          });
        } else {
          this.conversationHistory.push({ role: 'user', content: msg.message });
        }
      } else if (msg.sender_type === 'AI') {
        this.conversationHistory.push({ role: 'assistant', content: msg.message });
      }
    }
  }

  // Generar un título corto para la conversación basado en el primer mensaje
  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(environment as any).apiKeyGemini}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Eres un generador de títulos. Responde SOLO con un título corto (máximo 4 palabras) que resuma el tema del mensaje del usuario. Sin comillas ni texto adicional.' },
            { role: 'user', content: firstMessage }
          ],
          temperature: 0.5,
          max_tokens: 20,
        })
      });

      if (!response.ok) return 'Nueva Conversación';
      
      const data = await response.json();
      return data.choices[0]?.message?.content?.trim().replace(/['"]/g, '') || 'Nueva Conversación';
    } catch {
      return 'Nueva Conversación';
    }
  }
}
