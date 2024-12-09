import { Inject, Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpRequest, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { MSAL_GUARD_CONFIG, MsalGuardConfiguration, MsalService } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

@Injectable({
    providedIn: 'root'
})
export class ErrorInterceptorService implements HttpInterceptor {

    constructor(
        @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
        private authService: MsalService
    ) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const error = err.error?.message || err.statusText;
            console.error(err);
            logEvent(analytics, "intercepted_error", { name: err });
            logEvent(analytics, "Error: " + error );
            
            if (err instanceof HttpErrorResponse) {
                logEvent(analytics, "Error Http Status Code: " + err.status );
                if (err.status == 401 || err.status == 403) {
                    if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
                        this.authService.logoutPopup({
                            postLogoutRedirectUri: "/login",
                            mainWindowRedirectUri: "/login"
                        });
                    } else {
                        this.authService.logoutRedirect({
                            postLogoutRedirectUri: "/login",
                    });
                    }
                }
            } else {
                logEvent(analytics, "Error (Unknown Instance Type): " + err );
            }

            return throwError(error);
        }))
    }
}