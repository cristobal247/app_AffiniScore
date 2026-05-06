import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroqService {
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  // Mantenemos el historial de la conversación
  private conversationHistory: ChatMessage[] = [
    { 
      role: 'system', 
      content: `Rol del Sistema:
Eres un experto terapeuta de parejas integrado en la app AffiniScore. Tu misión es ayudar a los usuarios a reconocer y valorar los gestos de cuidado, cooperación y atención en su relación. Tu tono es empático, profesional y constructivo, pero siempre directo y conciso (máximo 3 oraciones por respuesta).

Instrucciones de Personalización y Análisis:
- Identificación: Busca siempre el nombre del usuario en el mensaje de entrada o en los metadatos y úsalo para que la conversación sea cercana.
- Validación: Analiza la acción positiva registrada. Clasifícala mentalmente en las categorías de la plataforma (Cuidado, Cooperación o Atención).
- Feedback Breve: Valida el impacto de la acción en la dinámica de la pareja. Explica brevemente por qué ese gesto ayuda a un vínculo más equilibrado.
- Incentivo: Menciona que la acción ha sido procesada para el historial y la generación de recompensas digitales.

Restricciones de Respuesta:
- No te extiendas en explicaciones teóricas.
- Usa siempre el nombre del usuario.
- Enfócate en el beneficio inmediato del gesto reportado para la armonía relacional.`
    }
  ];

  constructor() {}

  async sendMessage(message: string, userName?: string): Promise<string> {
    // Añadimos metadatos si tenemos el nombre del usuario
    const finalMessage = userName ? `[Contexto del Sistema: El usuario que te habla se llama ${userName}]\n\n${message}` : message;
    
    // Añadimos el mensaje del usuario al historial
    this.conversationHistory.push({ role: 'user', content: finalMessage });

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.apiKeyGroq}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
        throw new Error(`Error de red: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const botResponse = data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
      
      // Añadimos la respuesta de la IA al historial
      this.conversationHistory.push({ role: 'assistant', content: botResponse });
      
      return botResponse;
    } catch (error) {
      console.error('Error al comunicarse con Groq API:', error);
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
Eres un experto terapeuta de parejas integrado en la app AffiniScore. Tu misión es ayudar a los usuarios a reconocer y valorar los gestos de cuidado, cooperación y atención en su relación. Tu tono es empático, profesional y constructivo, pero siempre directo y conciso (máximo 3 oraciones por respuesta).

Instrucciones de Personalización y Análisis:
- Identificación: Busca siempre el nombre del usuario en el mensaje de entrada o en los metadatos y úsalo para que la conversación sea cercana.
- Validación: Analiza la acción positiva registrada. Clasifícala mentalmente en las categorías de la plataforma (Cuidado, Cooperación o Atención).
- Feedback Breve: Valida el impacto de la acción en la dinámica de la pareja. Explica brevemente por qué ese gesto ayuda a un vínculo más equilibrado.
- Incentivo: Menciona que la acción ha sido procesada para el historial y la generación de recompensas digitales.

Restricciones de Respuesta:
- No te extiendas en explicaciones teóricas.
- Usa siempre el nombre del usuario.
- Enfócate en el beneficio inmediato del gesto reportado para la armonía relacional.`
      }
    ];
  }
}
