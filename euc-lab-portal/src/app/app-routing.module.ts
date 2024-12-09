import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { AppComponent } from './app.component';
import { AccountsComponent } from './components/accounts/accounts.component';
import { BrowserToolComponent } from './components/browser-tool/browser-tool.component';
import { CgwRulesComponent } from './components/cgw-rules/cgw-rules.component';
import { DnsComponent } from './components/dns/dns.component';
import { HomeComponent } from './components/home/home.component';
import { LayoutComponent } from './components/layout/layout.component';
import { LoginComponent } from './components/login/login.component';
import { NatRulesComponent } from './components/nat-rules/nat-rules.component';
import { PublicIpsComponent } from './components/public-ips/public-ips.component';
import { WebCertificatesComponent } from './components/web-certificates/web-certificates.component';

const routes: Routes = [
    { path: '', component: LayoutComponent, 
        canActivate: [MsalGuard],
        children: [
            { path: '', component: HomeComponent, canActivate: [MsalGuard] },
            { path: 'dns', component: DnsComponent },
            { path: 'publicips', component: PublicIpsComponent },
            { path: 'natrules', component: NatRulesComponent },
            { path: 'cgwrules', component: CgwRulesComponent },
            { path: 'certificates', component: WebCertificatesComponent },
            { path: 'accounts', component: AccountsComponent, canActivate: [MsalGuard] },
            { path: 'home', component: HomeComponent, canActivate: [MsalGuard] },
            { path: 'browsertool', component: BrowserToolComponent },
            { path: 'code', redirectTo: '' },
            { path: 'error', redirectTo: '' }
        ]
    },
    { path: 'login', component: LoginComponent },
    { path: '**', redirectTo: '' }
];

const isIframe = window !== window.parent && !window.opener;

@NgModule({
    imports: [RouterModule.forRoot(routes, { 
        useHash: true,
        // Don't perform initial navigation in iframes
        initialNavigation: !isIframe ? 'enabled' : 'disabled',
        relativeLinkResolution: 'legacy' 
    })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
