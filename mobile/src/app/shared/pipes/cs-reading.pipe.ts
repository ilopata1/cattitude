import { Pipe, PipeTransform } from '@angular/core';
import { LiveReadingParts, splitLiveReading } from '../reading-parts';

@Pipe({ name: 'csReading', standalone: false })
export class CsReadingPipe implements PipeTransform {
  transform(value: string | null | undefined): LiveReadingParts {
    return splitLiveReading(value);
  }
}
