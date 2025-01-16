import { ApplicationConfig } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MsalModule, MsalService, MsalGuard, MsalInterceptor, MsalBroadcastService, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType, IPublicClientApplication } from '@azure/msal-browser';
import { routes } from './app.routes';
import { Location as AngularLocation } from '@angular/common';
import { Location as BrowserLocation } from '@angular/common';
import { environment } from '../environments/environment';



const msalConfig = {
  auth: {
    clientId: environment.clientId,
    authority: `https://login.microsoftonline.com/${environment.tenantId}`,  // Replace with your tenant ID
    redirectUri: environment.redirectUri, // Replace with your redirect URI
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const protectedResourceMap = new Map<string, Array<string>>([
  ['https://graph.microsoft.com/v1.0/me', ['user.read']],
  ['https://graph.microsoft.com/v1.0/users', ['user.read.all', 'GroupMember.Read.All']]
]);

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Popup,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MsalService,
      useFactory: (msalInstance: PublicClientApplication, location: AngularLocation) => {
        msalInstance.initialize();
        return new MsalService(msalInstance, location as unknown as BrowserLocation);
      },
      deps: [MSAL_INSTANCE, AngularLocation]
    },
    MsalGuard,
    MsalBroadcastService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory
    }
  ],
};
