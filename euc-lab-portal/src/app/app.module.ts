import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ClarityModule } from '@clr/angular';
import { announcementIcon, ClarityIcons, flaskIcon, infoCircleIcon, infoStandardIcon, newIcon, userIcon, copyIcon } from '@cds/core/icon';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { IPublicClientApplication, PublicClientApplication, InteractionType, BrowserCacheLocation, LogLevel } from '@azure/msal-browser';
import { MsalGuard, MsalInterceptor, MsalBroadcastService, MsalInterceptorConfiguration, MsalModule, MsalService, MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalGuardConfiguration, MsalRedirectComponent } from '@azure/msal-angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { DnsComponent } from './components/dns/dns.component';
import { ErrorInterceptorService } from './services/error/error-interceptor.service';
import { PublicIpsComponent } from './components/public-ips/public-ips.component';
import { NatRulesComponent } from './components/nat-rules/nat-rules.component';
import { CgwRulesComponent } from './components/cgw-rules/cgw-rules.component';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { WebCertificatesComponent } from './components/web-certificates/web-certificates.component';
import { CdsModule } from '@cds/angular';
import { AccountsComponent } from './components/accounts/accounts.component';
import { environment } from '../environments/environment';
import { ApiAuthInterceptorService } from './services/api-auth/api-auth-interceptor.service';
import { BrowserToolComponent } from './components/browser-tool/browser-tool.component';
import { SearchFilterPipe } from './search-filter.pipe';
import '@cds/core/icon/register.js';
import '@cds/core/button/register.js';
import '@cds/core/navigation/register.js';
import '@cds/core/divider/register.js';
import { TruncatePipe } from './truncate.pipe';

//import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
//import { Analytics, AnalyticsModule, provideAnalytics, getAnalytics, logEvent } from '@angular/fire/analytics';
//import { providePerformance, getPerformance } from '@angular/fire/performance';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;
ClarityIcons.addIcons(userIcon, newIcon, announcementIcon, flaskIcon, infoCircleIcon, copyIcon);

export function loggerCallback(logLevel: LogLevel, message: string) {
    console.log(message);
}
  
export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: environment.msalClientId,
            authority: environment.msalAuthorityTenantUrl,
            redirectUri: environment.redirectUri
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage,
            storeAuthStateInCookie: isIE, // set to true for IE 11
        },
        system: {
            loggerOptions: {
                loggerCallback,
                logLevel: environment.msalLogLevel,
                piiLoggingEnabled: environment.msalPiiLoggingEnabled
            }
        }
    });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    //const protectedResourceMap = new Map<string, Array<string>>();
    //protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);
    //protectedResourceMap.set('http://localhost:5000', ['user.read']);
    

    return {
        interactionType: InteractionType.Redirect,
        //protectedResourceMap
        protectedResourceMap: new Map([
            ['https://graph.microsoft.com/v1.0/me', ['user.read']]//,
            //['http://localhost:5000/*', ['user.read']] 
        ])
    };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return { 
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: ['user.read']
        }
    };
}

@NgModule({
    declarations: [
        HomeComponent,
        DnsComponent,
        PublicIpsComponent,
        NatRulesComponent,
        CgwRulesComponent,
        AppComponent,
        LayoutComponent,
        LoginComponent,
        WebCertificatesComponent,
        AccountsComponent,
        BrowserToolComponent,
        SearchFilterPipe,
        TruncatePipe
    ],
    imports: [
        BrowserModule,
        ClarityModule,
        CdsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        MatDialogModule,
        FormsModule,
        ReactiveFormsModule,
        AppRoutingModule,
        MsalModule,
        LoggerModule.forRoot({ serverLoggingUrl: '/logs', level: environment.ngxLoggerLevel, serverLogLevel: environment.ngxLoggerLevel })
        
        //provideFirebaseApp(() => initializeApp(environment.firebase)),
        //provideAnalytics(() => getAnalytics()),
        //providePerformance(() => getPerformance())     
    ],
    providers: [
        { 
            provide: HTTP_INTERCEPTORS, 
            useClass: ApiAuthInterceptorService, 
            multi: true 
        },
        { 
            provide: HTTP_INTERCEPTORS, 
            useClass: ErrorInterceptorService, 
            multi: true 
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true
          },
          {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory
          },
          {
            provide: MSAL_GUARD_CONFIG,
            useFactory: MSALGuardConfigFactory
          },
          {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory
          },
          MsalService,
          MsalGuard,
          MsalBroadcastService
    ],
    bootstrap: [AppComponent, MsalRedirectComponent]
})
export class AppModule { }
