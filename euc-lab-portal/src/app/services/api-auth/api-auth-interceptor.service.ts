import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiAuthInterceptorService implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {      
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);

      //if (true) { return next.handle(req); } // needed for debug

      if (typeof value === 'string') {
        let tempToken = JSON.parse(value);
        if (tempToken) {
          if (tempToken.credentialType === 'IdToken') {
            let token = tempToken;
            if (req.url.startsWith(environment.apiUrl)) { 
              let secret = token.secret;
              const cloned = req.clone({
                  headers: req.headers.set("Authorization",
                      "Bearer " + secret)
              });
        
              return next.handle(cloned);
            }
            else {
              return next.handle(req);
            }
          }
        }
      }
    }
  }
}
