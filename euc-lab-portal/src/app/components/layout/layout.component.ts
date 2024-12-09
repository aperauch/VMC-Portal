import { Component, OnInit, Inject, OnDestroy} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult, InteractionStatus, InteractionType, PopupRequest, RedirectRequest } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import '@cds/core/navigation/register.js';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';

type ProfileType = {
  givenName?: string,
  surname?: string,
  userPrincipalName?: string,
  id?: string
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {

  isIframe = false;
  loginDisplay = false;
  profile!: ProfileType;
  login_session_error_message: String;
  hide_login_session_alert = true;
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService, 
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    logEvent(analytics, 'Layout Loaded');
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
      )
      .subscribe((result: EventMessage) => {
        console.log(result);
        const payload = result.payload as AuthenticationResult;
        this.authService.instance.setActiveAccount(payload.account);
      });

      this.setLoginDisplay();
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;

    if (this.loginDisplay) {
      this.getProfile();
    }
  }

  getProfile() {
    this.http.get(GRAPH_ENDPOINT)
      .subscribe(profile => {
        this.profile = profile;
        setUserId(analytics, this.profile.userPrincipalName);
        setUserProperties(analytics, { upn: this.profile.userPrincipalName});
        logEvent(analytics, 'Login: ' + this.profile.userPrincipalName);
      });
  }

  login() {
    logEvent(analytics, 'login_started_layout');
    if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
      if (this.msalGuardConfig.authRequest) {
        this.authService.loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
          .subscribe((response: AuthenticationResult) => {
            this.authService.instance.setActiveAccount(response.account);
          });
      } else {
        this.authService.loginPopup()
          .subscribe((response: AuthenticationResult) => {
            this.authService.instance.setActiveAccount(response.account);
          });
      }
    } else {      
      if (this.msalGuardConfig.authRequest) {
        this.authService.loginRedirect({ ...this.msalGuardConfig.authRequest } as RedirectRequest);
      } else {
        this.authService.loginRedirect();
      }
    }
  }

  logout() {
    logEvent(analytics, 'Logout: ' + this.profile.userPrincipalName);
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

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
