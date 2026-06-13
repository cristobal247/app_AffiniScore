import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatMessage',
  standalone: true
})
export class FormatMessagePipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    
    // Escapar caracteres HTML básicos por seguridad
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
      
    // Reemplazar saltos de línea por <br> para conservar el formato
    let formatted = escaped.replace(/\n/g, '<br>');
      
    // Reemplazar **texto** por <strong>texto</strong> para negrita (soportando saltos de línea internos)
    return formatted.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  }
}
