import { NgModule, APP_INITIALIZER, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ContentService } from './core/services/content.service';
import { GuideLoadService } from './core/services/guide-load.service';
import { VesselContextService } from './core/services/vessel-context.service';
import { VesselResolverService } from './core/services/vessel-resolver.service';
import { appInitializer } from './core/initializers/app.initializer';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [
        ContentService,
        VesselResolverService,
        VesselContextService,
        GuideLoadService,
      ],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
