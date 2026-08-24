import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'age', standalone: false, pure: false })
export class AgePipe implements PipeTransform {
  /** @param timestamp epoch milliseconds of the event being aged. */
  transform(timestamp: number | undefined | null): string {
    if (!timestamp) return '—';

    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}
