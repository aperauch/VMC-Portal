import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Inject } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';
import { Account } from 'src/app/models/Account';
import { AccountListResult } from 'src/app/models/AccountListResult';
import { EmployeeAccount } from 'src/app/models/EmployeeAccount';
import { ApiClientService } from 'src/app/services/api/api-client.service';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult, InteractionStatus, InteractionType, PopupRequest, RedirectRequest } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import '@cds/core/icon/register.js';
import { ClarityIcons, copyIcon } from '@cds/core/icon';

ClarityIcons.addIcons(copyIcon);

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
firebaseApp.automaticDataCollectionEnabled = true;
const analytics = getAnalytics();

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
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})
export class AccountsComponent implements OnInit {
  // MSAL Profile
  profile!: ProfileType;

  // Models
  employeeAccount: EmployeeAccount;
  userAccount: Account;
  adminAccount: Account;
  accountListResult: Observable<AccountListResult>;
  
  loading: boolean = true;

  // Cards
  show_account_card: boolean = false;
  show_welcome_card: boolean = false;

  userStatusLabelStyle: string;
  adminStatusLabelStyle: string;

  // Modals
  accountToReset: Account;
  show_reset_password_modal: boolean = false;
  newAccounts: AccountListResult;
  newAdminAccount: Account;
  newUserAccount: Account;
  show_new_accounts_modal: boolean = false;
  account_with_new_password: Account;
  passwordToBeCopied: string;
  show_new_password_modal: boolean = false;
  
  // General alert
  hide_alert: boolean = true;
  alert_type: string;
  alert_message: string;

  domains: string[] = ["EUC"];
  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService, 
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient,
    private apiClientService: ApiClientService
  ) { }

  ngOnInit(): void {
    logEvent(analytics, "Account Management Page Loaded");
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
          logEvent(analytics, "Account Management Page Loaded By: " + this.profile.userPrincipalName);
          this.reloadData();
        }
      });
  }

  reloadData() {
    this.employeeAccount = new EmployeeAccount();
    this.employeeAccount.firstname = this.profile.givenName;
    this.employeeAccount.lastname = this.profile.surname;
    this.employeeAccount.displayName = this.profile.displayName;
    this.employeeAccount.email = this.profile.mail;
    this.employeeAccount.upn = this.profile.userPrincipalName;
    this.employeeAccount.username = this.profile.userPrincipalName.split("@")[0];
    this.employeeAccount.id = this.profile.id;

    this.apiClientService.getAccounts(this.employeeAccount)
      .pipe(
          map(data => {
              if (data) {
                if (data.UserAccount || data.AdminAccount) {
                  
                  // USER ACCOUNT
                  this.userAccount = data.UserAccount;
                  this.userAccount.username = data.UserAccount.sAMAccountName;
                  this.userAccount.type = "user";
                  this.userAccount.domain = data.UserAccount.distinguishedName.split(",")[4].replace("DC=", "").toUpperCase();
                  this.userAccount.objectGUID = data.UserAccount.objectGUID.replace("{", "").replace("}", "");
                  
                  if (data.UserAccount.badPasswordTime == "1601-01-01 00:00:00+00:00") {
                    this.userAccount.badPasswordTime = "None";
                  }
                  else {
                    this.userAccount.badPasswordTime = data.UserAccount.badPasswordTime;
                  }

                  if (data.UserAccount.lockoutTime == "1601-01-01 00:00:00+00:00") {
                    this.userAccount.lockoutTime = "None";
                  }
                  else {
                    this.userAccount.lockoutTime = data.UserAccount.lockoutTime;
                  }

                  if (this.userAccount.lockoutTime != "None" && this.userAccount.badPwdCount > 0) {
                    this.userAccount.status = "Locked"
                    this.userStatusLabelStyle = "label-danger";
                  }
                  else if (data.UserAccount.userAccountControl == 544 || data.UserAccount.userAccountControl == 512) {
                    this.userAccount.status = "Enabled and Unlocked";
                    this.userStatusLabelStyle = "label-success";
                  }
                  else if (data.UserAccount.userAccountControl == 546) {
                    this.userAccount.status = "Disabled";
                    this.userStatusLabelStyle = "label-danger";
                  }
                  else {
                    this.userAccount.status = "Unknown";
                    this.userStatusLabelStyle = "label-danger";
                  }

                  // Need to set this so confirm modal doesn't throw an exception
                  this.accountToReset = this.userAccount;

                  // ADMIN ACCOUNT
                  this.adminAccount = data.AdminAccount;
                  this.adminAccount.username = data.AdminAccount.sAMAccountName;
                  this.adminAccount.type = "admin";
                  this.adminAccount.domain = data.AdminAccount.distinguishedName.split(",")[4].replace("DC=", "").toUpperCase();
                  this.adminAccount.objectGUID = data.AdminAccount.objectGUID.replace("{", "").replace("}", "");
                  
                  if (data.AdminAccount.badPasswordTime == "1601-01-01 00:00:00+00:00") {
                    this.adminAccount.badPasswordTime = "None";
                  }
                  else {
                    this.adminAccount.badPasswordTime = data.AdminAccount.badPasswordTime;
                  }
                  if (data.AdminAccount.lockoutTime == "1601-01-01 00:00:00+00:00") {
                    this.adminAccount.lockoutTime = "None";
                  }
                  else {
                    this.adminAccount.lockoutTime = data.AdminAccount.lockoutTime;
                  }

                  if (this.adminAccount.lockoutTime != "None" && this.adminAccount.badPwdCount > 0) {
                    this.adminAccount.status = "Locked";
                    this.adminStatusLabelStyle = "label-danger";
                  }
                  else if (data.AdminAccount.userAccountControl == 544 || data.AdminAccount.userAccountControl == 512) {
                    this.adminAccount.status = "Enabled and Unlocked";
                    this.adminStatusLabelStyle = "label-success";
                  }
                  else if (data.AdminAccount.userAccountControl == 546) {
                    this.adminAccount.status = "Disabled";
                    this.adminStatusLabelStyle = "label-danger";
                  }
                  else {
                    this.adminAccount.status = "Unknown";
                    this.adminStatusLabelStyle = "label-danger";
                  }
                  this.show_welcome_card = false;
                  this.show_account_card = true;
                }
                else {
                  console.log('No accounts were found.');
                  this.show_welcome_card = true;
                }
              }
              else {
                console.log('Error getting lab user or lab admin account.');
                
                this.show_account_card = false;
                this.show_welcome_card = true;
                this.setFailureAlert("Error getting lab user or lab admin account.");
              }
          }))
      .subscribe(
          data => console.log('HTTP reload response', data),
          err => {
              console.log('HTTP reload Error', err);
              this.show_account_card = false;
              this.show_welcome_card = false;

              if (typeof err === 'string') {
                const error_message = "Unable to connect to the API backend.  Ensure the server is running and check firewall and network connectivity.  Error:  " + err;
                this.setFailureAlert(error_message);
                logEvent(analytics, "accounts_search_error", { name: error_message});
                logEvent(analytics, "Accounts Search Error: " + error_message);
              }
              else if (err.error.message !== undefined) {
                this.setFailureAlert(err.error.message);
                logEvent(analytics, "accounts_search_error", { name: err.error.message});
              }
              else if (err.status == 0) {
                this.setFailureAlert("The API backend is not running.");
                logEvent(analytics, "accounts_search_error_api_not_running");
              }
              else {
                this.setFailureAlert("An error occurred when trying to request new lab domain accounts.");
                logEvent(analytics, "accounts_search_error_unknown");
              }
          },
          () => {
              console.log('HTTP reload request completed.');
              this.loading = false;
          }
      );
  }

  createNewAccounts() {
    this.resetScreen();
    this.apiClientService.createAccounts(this.employeeAccount)
    .pipe(
      map(res => {
        this.newAdminAccount = new Account();
        this.newAdminAccount.sAMAccountName = res.AdminAccountUsername;
        this.newAdminAccount.password = res.AdminAccountPassword;
        
        this.newUserAccount = new Account();
        this.newUserAccount.sAMAccountName = res.UserAccountUsername;
        this.newUserAccount.password = res.UserAccountPassword;
        
        this.showNewAccountsModal();
      }))
    .subscribe(
      res => {
        this.ngOnInit();
        this.show_welcome_card = false;
        this.show_account_card = true;
        
        this.setSuccessAlert("Your accounts have been created.  Check your VMware email for your info about your new accounts!");
        logEvent(analytics, "accounts_creation_success");
      },
        err => {
          console.log('HTTP create Error from subscribe: ', err);
                if (typeof err === 'string') {
                  this.setFailureAlert(err);
                  logEvent(analytics, "accounts_creation_error", { name: err });
                  logEvent(analytics, "Create Account Error: " + err);
                }
                else if (err.error.message !== undefined) {
                  this.setFailureAlert(err.error.message);
                  logEvent(analytics, "accounts_creation_error", { name: err.error.message });
                }
                else if (err.status == 0) {
                  this.setFailureAlert("The API backend is not running.");
                  logEvent(analytics, "accounts_creation_error_api_not_running");
                }
                else {
                  this.setFailureAlert("An error occurred when trying to create your accounts.");
                  logEvent(analytics, "accounts_creation_error_unknown");
                }
      },
        () => console.log('HTTP create request completed.')
      );
  }

  unlockAccount(account: Account) {
    this.resetScreen();
    this.apiClientService.unlockAccount(account).subscribe(
      res => {
        if (res) {
          if (res.success) {
            this.ngOnInit();
            this.show_welcome_card = false;
            this.show_account_card = true;
            this.setSuccessAlert("Your " + account.sAMAccountName + " account has been enabled and unlocked!");
            logEvent(analytics, "unlock_success", { name: account.sAMAccountName});
            logEvent(analytics, "Unlock Success: " + account.sAMAccountName);
          }
          else {
            this.setFailureAlert("Oops!  We couldn't enable or unlock your " + account.sAMAccountName + " account.");
            logEvent(analytics, "unlock_error_response_failure");
          }
        }
        else {
          console.log("Unlock account res was null.  res =", res);
          this.setFailureAlert("Unlock account response was null.");
          logEvent(analytics, "unlock_error_response_null");
        }
      },
        err => {
          console.log('HTTP unlock account Error from subscribe: ', err);
          if (typeof err === 'string') {
            this.setFailureAlert(err);
            logEvent(analytics, "unlock_error", { name: err });
            logEvent(analytics, "Unlock Error: " + err);
          }
          else if (err.error.message !== undefined) {
            this.setFailureAlert(err.error.message);
            logEvent(analytics, "unlock_error", { name: err.error.message });
          }
          else if (err.status == 0) {
            this.setFailureAlert("The API backend is not responding.");
            logEvent(analytics, "unlock_error_api_not_responding");
          }
          else {
            this.setFailureAlert("An error occurred when trying to unlock your account.");
            logEvent(analytics, "unlock_error_unknown");
          }
      },
        () => console.log('HTTP unlock account request completed.')
    );
  }

  resetAccountPassword(account: Account) {
    this.resetScreen();
    this.apiClientService.resetAccountPassword(account)
      .pipe(
        map(res => {
          
          let temp_account = new Account();
          temp_account.username = res.username;
          temp_account.sAMAccountName = res.username;
          temp_account.password = res.password;
          this.showNewPasswordModal(temp_account);
        }))
      .subscribe(
        res => {
          this.ngOnInit();
          this.show_welcome_card = false;
          this.show_account_card = true;
          this.setSuccessAlert("Your " + account.sAMAccountName + " account password has been reset and the account has been enabled and unlocked.  Check your VMware email for your new password!");
          logEvent(analytics, "password_reset_success", { name: account.sAMAccountName });
          logEvent(analytics, "Reset Account Success: " + account.sAMAccountName);
        },
          err => {
            console.log('HTTP reset account password Error from subscribe: ', err);
            if (typeof err === 'string') {
              this.setFailureAlert(err);
              logEvent(analytics, "password_reset_error", { name: err });
            }
            else if (err.error.message !== undefined) {
              this.setFailureAlert(err.error.message);
              logEvent(analytics, "password_reset_error", { name: err.error.message });
            }
            else if (err.status == 0) {
              this.setFailureAlert("The API backend is not responding.");
              logEvent(analytics, "password_reset_error_api_not_responding");
            }
            else {
              this.setFailureAlert("An error occurred when trying to reset the password for your account.");
              logEvent(analytics, "password_reset_error_unknown");
            }
        },
          () => console.log('HTTP reset account password request completed.')
      );
  }

  showResetPasswordModal(account: Account) {
    this.accountToReset = account;
    this.show_reset_password_modal = true;
  }

  showNewAccountsModal() {
    this.show_new_accounts_modal = true;
  }

  closeNewAccountsModal() {
    this.show_new_accounts_modal = false;
  }

  showNewPasswordModal(account: Account) {
    this.account_with_new_password = account;
    this.show_new_password_modal = true;
  }

  closeNewPasswordModal() {
    this.show_new_password_modal = false;
  }

  cancelResetPassword() {
    this.show_reset_password_modal = false;
  }

  setSuccessAlert(message: string) {
    this.hide_alert = false;
    this.alert_message = message;
    this.alert_type = "success";
  }

  setInfoAlert(message: string) {
    this.hide_alert = false;
    this.alert_message = message;
    this.alert_type = "info";
  }

  setFailureAlert(message: string) {
    this.hide_alert = false;
    this.alert_message = message;
    this.alert_type = "danger";
  }

  resetScreen() {
    this.show_reset_password_modal = false;
    this.hide_alert = true;
    this.alert_message = "";
    this.alert_type = "info";
  }
}
