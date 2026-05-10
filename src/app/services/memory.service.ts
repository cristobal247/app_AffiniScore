import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Tipos para Shared Memories
 */
export interface SharedMemory {
  id: string;
  partnership_id: string;
  image_url: string;
  date: string;
  notes: string | null;
  voice_note_url: string | null;
  created_at: string;
}

/**
 * MemoryService
 * 
 * Gestiona la galería de recuerdos compartidos de la pareja.
 * 
 * Funcionalidades:
 * - Obtener recuerdos compartidos
 * - Subir fotos al Storage
 * - Agregar notas de voz
 * - Actualizar metadatos de recuerdos
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  constructor(private supabaseClient: SupabaseClientService) {}

  /**
   * Obtiene todos los recuerdos compartidos de la pareja.
   * Retorna una lista ordenada cronológicamente.
   */
  async getSharedMemories(): Promise<{ data: SharedMemory[]; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: [], error: 'No user' };
    }

    const supabase = this.supabaseClient.getClient();
    
    // Obtener partnership_id del usuario
    const { data: partnership } = await supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { data: [], error: null };
    }

    // Obtener recuerdos del partnership
    const result = await supabase
      .from('shared_memories')
      .select('*')
      .eq('partnership_id', partnership.id)
      .order('date', { ascending: false });

    return { data: result.data || [], error: result.error };
  }

  /**
   * Sube una foto de recuerdo al Storage.
   * Retorna la URL pública de la imagen.
   */
  async uploadMemoryImage(file: File): Promise<{ url: string | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { url: null, error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
    const filePath = `memories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('shared_memories')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading memory image:', uploadError);
      return { url: null, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('shared_memories')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  }

  /**
   * Guarda un nuevo recuerdo en la BD.
   * Requiere la URL de la imagen y la fecha.
   */
  async saveSharedMemory(imageUrl: string, memoryDate: string): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    
    // Obtener partnership_id
    const { data: partnership } = await supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { error: 'No partnership found' };
    }

    return await supabase
      .from('shared_memories')
      .insert({
        partnership_id: partnership.id,
        image_url: imageUrl,
        date: memoryDate,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Sube una nota de voz para un recuerdo.
   * Retorna la URL pública del audio.
   */
  async uploadMemoryVoiceNote(audioBlob: Blob): Promise<{ url: string | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { url: null, error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const fileName = `${user.id}_${new Date().getTime()}.webm`;
    const filePath = `memory_voice_notes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('memory_voice_notes')
      .upload(filePath, audioBlob);

    if (uploadError) {
      console.error('Error uploading voice note:', uploadError);
      return { url: null, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('memory_voice_notes')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  }

  /**
   * Agrega una nota de texto a un recuerdo existente.
   */
  async updateMemoryNotes(memoryId: string, notes: string): Promise<{ error: any }> {
    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('shared_memories')
      .update({ notes })
      .eq('id', memoryId);
  }

  /**
   * Agrega una nota de voz a un recuerdo existente.
   */
  async updateMemoryVoiceNote(memoryId: string, voiceNoteUrl: string): Promise<{ error: any }> {
    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('shared_memories')
      .update({ voice_note_url: voiceNoteUrl })
      .eq('id', memoryId);
  }
}
