export const SUBCATEGORY_MAPPING: Record<string, string> = {
  'HOGAR': '🏠',
  'DETALLES': '🎁',
  'CITA': '🥂',
  'VIAJE': '✈️',
  'BIENESTAR': '🧘',
  'COMUNICACION': '💬',
  'SORPRESA': '🎉'
};

export function getEmojiForSubcategory(subcat: string | undefined): string {
  if (!subcat) return '✨';
  const upperSubcat = subcat.toUpperCase();
  return SUBCATEGORY_MAPPING[upperSubcat] || '✨';
}
