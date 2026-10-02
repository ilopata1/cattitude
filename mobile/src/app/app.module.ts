import { NgModule, APP_INITIALIZER, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { InstrumentMapService } from './core/services/instrument-map.service';
import { SailPlanService } from './core/services/sail-plan.service';
import { appInitializer } from './core/initializers/app.initializer';
import { SharedModule } from './shared/shared.module';
import './shared/icons/ui-icons';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Signal K and the polar sampler never let the app become stable, so
      // registerWhenStable only registered on its 30s fallback.
      registrationStrategy: 'registerImmediately',
    }),
  ],
  providers: [
    provideHttpClient(withFetch()),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [SailPlanService, InstrumentMapService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
