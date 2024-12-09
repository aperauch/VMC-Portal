import { Component, OnInit,  } from '@angular/core';
import { getCookie, getCookies, removeCookie, setCookie } from 'typescript-cookie';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
firebaseApp.automaticDataCollectionEnabled = true;
const analytics = getAnalytics();

@Component({
  selector: 'app-browser-tool',
  templateUrl: './browser-tool.component.html',
  styleUrls: ['./browser-tool.component.scss']
})
export class BrowserToolComponent implements OnInit {

  persistent_cookie_name: string = "persistentcookie";
  session_cookie_name: string = "sessioncookie";
  
  persistent_cookie_value: string;
  session_cookie_value: string;
  user_agent_string: string;

  constructor(private router: Router) { }

  ngOnInit(): void {
    logEvent(analytics, "Browser Tool Loaded");
    this.user_agent_string = navigator.userAgent;
    this.displayCookies();
  }

  setCookie(name,value,days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
      value += " (Expires " + date.toUTCString() + ")";
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }  
 
  setCookies() {
    logEvent(analytics, "Creating Cookies");
    try {
      this.setCookie(this.persistent_cookie_name, "PERSISTENT_COOKIE_" + Math.floor(Math.random() * 100), 1);
      this.setCookie(this.session_cookie_name, "SESSION_COOKIE_" + Math.floor(Math.random() * 100), 0);
      this.displayCookies();
    } catch {
      logEvent(analytics, "Exception: Creating Cookies");
    }
  }

  displayCookies() {
    this.persistent_cookie_value = getCookie(this.persistent_cookie_name);
    this.session_cookie_value = getCookie(this.session_cookie_name);
  }

  eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  clearCookies() {
    logEvent(analytics, "Clearing Cookies");
    try {
      this.eraseCookie("persistentcookie");
      this.eraseCookie("sessioncookie");
      this.displayCookies();
    } catch {
      logEvent(analytics, "Exception:  Cleared Cookied");
    }
  }

}
