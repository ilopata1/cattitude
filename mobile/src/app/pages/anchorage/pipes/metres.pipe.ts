import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'metres', standalone: false })
export class MetresPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value === undefined || value === null || value === 0) return '—';
    if (value < 1) return `${(value * 100).toFixed(0)} cm`;
    if (value < 100) return `${value.toFixed(1)} m`;
    if (value < 1000) return `${Math.round(value)} m`;
    return `${(value / 1000).toFixed(2)} km`;
  }
}
