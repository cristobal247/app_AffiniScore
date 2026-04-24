import { Pipe, PipeTransform } from '@angular/core';
import { getEmojiForSubcategory } from '../utils/activity-icons';

@Pipe({
  name: 'emoji',
  standalone: true
})
export class EmojiPipe implements PipeTransform {
  transform(subcategory: string | undefined): string {
    return getEmojiForSubcategory(subcategory);
  }
}
