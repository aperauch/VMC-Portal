import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EmployeeAccount } from 'src/app/models/EmployeeAccount';
import { ApiClientService } from 'src/app/services/api/api-client.service';
import { MSAL_GUARD_CONFIG, MsalGuardConfiguration, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage } from '@azure/msal-browser/dist/event/EventMessage';
import { filter } from 'rxjs/internal/operators/filter';
import { EventType } from '@azure/msal-browser/dist/event/EventType';
import { AuthenticationResult } from '@azure/msal-common';
import '@cds/core/icon/register.js';
import { ClarityIcons, userIcon } from '@cds/core/icon';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { initializeApp } from 'firebase/app';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
firebaseApp.automaticDataCollectionEnabled = true;
const analytics = getAnalytics();

// Azure AD
const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';
type ProfileType = {
  givenName?: string,
  surname?: string,
  displayName?: string,
  mail?: string,
  userPrincipalName?: string,
  id?: string
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  // Employee Profile
  profile!: ProfileType;

  // Cards
  show_error_message: boolean = false;
  employeeAccount: EmployeeAccount;
  show_welcome_card: boolean = false;
  show_account_management_card: boolean = false;
  show_getting_started_card: boolean = false;

  // General Alert
  hide_alert: boolean = true;
  alert_message: string;
  alert_type: string;
  show_account_details_link: boolean = false;

  loading: boolean = true;

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService, 
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient,
    private apiClientService: ApiClientService
  ) { }

  ngOnInit(): void {
    logEvent(analytics, 'Home Page Loaded');
    ClarityIcons.addIcons(userIcon);
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
      )
      .subscribe((result: EventMessage) => {
        console.log(result);
        const payload = result.payload as AuthenticationResult;
        this.authService.instance.setActiveAccount(payload.account);
      });

    if (this.authService.instance.getAllAccounts().length > 0) {
      this.getProfile();
    }
  }

  getProfile() {
    this.http.get(GRAPH_ENDPOINT)
      .subscribe(profile => {
        this.profile = profile;
        if (this.profile) {
          setUserId(analytics, this.profile.userPrincipalName);
          setUserProperties(analytics, { upn: this.profile.userPrincipalName});
          logEvent(analytics, 'home_login', { name: this.profile.userPrincipalName });
          logEvent(analytics, 'Home loaded: ' + this.profile.userPrincipalName);
          this.reloadData();
        }
      });
  }

  reloadData() {
    this.show_error_message = false;

    this.employeeAccount = new EmployeeAccount();
    this.employeeAccount.firstname = this.profile.givenName;
    this.employeeAccount.lastname = this.profile.surname;
    this.employeeAccount.displayName = this.profile.displayName;
    this.employeeAccount.email = this.profile.mail;
    this.employeeAccount.upn = this.profile.userPrincipalName;
    this.employeeAccount.username = this.profile.userPrincipalName.split("@")[0];
    this.employeeAccount.id = this.profile.id;

    this.apiClientService.getAccounts(this.employeeAccount).subscribe(
      data => {
        console.log('HTTP reload response', data);
        if (data.UserAccount || data.AdminAccount) {
          this.show_welcome_card = false;
          this.show_account_management_card = true;
          this.show_getting_started_card = true;
        }
        else {
          this.show_welcome_card = true;
          this.show_account_management_card = false;
          this.show_getting_started_card = false;
        }
      },
      err => {
          console.log('HTTP reload Error', err);
          this.show_welcome_card = false;
          this.show_getting_started_card = false;
          this.show_error_message = true;

          if (typeof err === 'string') {
            const error_message = "Unable to connect to the API backend.  Ensure the server is running and check firewall and network connectivity.  Error:  " + err;
            this.setFailureAlert(error_message);
            logEvent(analytics, "Home Accounts Search Error: " + error_message);
          }
          else if (err.error.message !== undefined) {
            this.setFailureAlert(err.error.message);
            logEvent(analytics, "home_accounts_search_error: " + err.error.message);
          }
          else if (err.status == 0) {
            this.setFailureAlert("The API backend is not responding.");
            logEvent(analytics, "home_accounts_search_error_api_not_responding");
          }
          else {
            this.setFailureAlert("An error occurred when trying to request new lab domain accounts.");
            logEvent(analytics, "home_accounts_search_error_unknown");
          }
      },
      () => {
          console.log('HTTP reload request completed.');
          this.loading = false;
      }
    );
  }

  createNewAccounts() {
    this.resetAlert();
    this.apiClientService.createAccounts(this.employeeAccount).subscribe(
      res => {
        if (res) {
          this.ngOnInit();
          this.show_welcome_card = false;
          this.setSuccessAlert("Your accounts have been created.  Check your VMware email for your info about your new accounts!");
        }
        else {
          console.log("Create account res was null.  res =", res);
          this.setFailureAlert("Create account response was null.");
        }
      },
        err => {
          console.log('HTTP create Error from subscribe: ', err);
                if (typeof err === 'string') {
                  this.setFailureAlert(err);
                }
                else if (err.error.message !== undefined) {
                  this.setFailureAlert(err.error.message);
                }
                else if (err.status == 0) {
                  this.setFailureAlert("The API backend is not running.");
                }
                else {
                  this.setFailureAlert("An error occurred when trying to create your accounts.");
                }
      },
        () => {
          console.log('HTTP create request completed.');
          logEvent(analytics, "new_account_created", { name: this.employeeAccount.upn});
        }
      );
  }

  setSuccessAlert(message: string) {
    this.hide_alert = false;
    this.alert_message = message;
    this.alert_type = "success";
    this.show_account_details_link = true;
  }

  setFailureAlert(message: string) {
    this.hide_alert = false;
    this.alert_message = message;
    this.alert_type = "danger";
    this.show_account_details_link = false;
  }

  resetAlert() {
    this.hide_alert = true;
    this.alert_message = "";
    this.alert_type = "info";
  }
}
