import { Component, Input } from '@angular/core';
import { resolveUiIcon, ResolvedUiIcon } from '../../icons/ui-icons';

@Component({
  selector: 'app-ui-icon',
  templateUrl: './ui-icon.component.html',
  styleUrls: ['./ui-icon.component.scss'],
  standalone: false,
  host: { 'aria-hidden': 'true' },
})
export class UiIconComponent {
  @Input() icon: string | undefined;
  @Input() fallback = 'ellipse-outline';

  get resolved(): ResolvedUiIcon {
    return resolveUiIcon(this.icon, this.fallback);
  }
}
