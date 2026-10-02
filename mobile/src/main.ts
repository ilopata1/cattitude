// Scheduled: `ng g @angular/core:standalone`, then bootstrap with
// bootstrapApplication so this file can drop the JIT platform.
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
