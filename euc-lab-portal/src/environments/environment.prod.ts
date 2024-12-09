import { LogLevel } from "@azure/msal-browser";
import { NgxLoggerLevel } from 'ngx-logger';

export const environment = {
  firebase: {
    projectId: '',
    appId: '',
    storageBucket: '',
    apiKey: '',
    authDomain: '',
    messagingSenderId: '',
    measurementId: '',
  },
  wavefront: {
    tenantDNS: '',
    apiToken: '',
    source: ''
  },
  production: true,
  msalClientId: '',
  msalAuthorityTenantUrl: '',
  msalLogLevel: LogLevel.Error,
  msalPiiLoggingEnabled: false,
  ngxLoggerLevel: NgxLoggerLevel.ERROR,
  apiUrl: '',
  redirectUri: ''
};
