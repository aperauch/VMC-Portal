import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { DnsRecord } from '../../models/DnsRecord';
import { Dns } from '../../models/interfaces/Dns';
import { PublicIP } from '../../models/PublicIP';
import { PublicIPListResult } from '../../models/PublicIPListResult';
import { PolicyNatRuleListResult } from '../../models/PolicyNatRuleListResult';
import { PolicyNatRule } from '../../models/PolicyNatRule';
import { CgwRuleListResult } from '../../models/CgwRuleListResult';
import { ApiAuthModel } from '../../models/ApiAuthModel';
import { Certificate } from 'src/app/models/Certificate';
import { CertificateResult } from 'src/app/models/CertificateResult';
import { Account } from '../../models/Account';
import { EmployeeAccount } from 'src/app/models/EmployeeAccount';
import { AccountListResult } from 'src/app/models/AccountListResult';
import { AccountCreate } from 'src/app/models/AccountsCreaet';
import { AccountEnableReset } from 'src/app/models/AccountEnableReset';
import { SimpleApiResponse } from 'src/app/models/SimpleApiResponse';
import { environment } from 'src/environments/environment';
import { PasswordResetResponse } from 'src/app/models/password-reset-response';

@Injectable({
    providedIn: 'root'
})
export class ApiClientService { 
    // Backend API server
    private apiServer = environment.apiUrl;

    // Login
    private authUrl = this.apiServer + '/auth';

    // NS1 DNS
    private baseUrl = this.apiServer + '/dns';
    private deleteUrl = this.baseUrl + '/delete';

    // NSX VMC AWS API
    private publicIpApi = this.apiServer + '/publicips';
    private natRulesApi = this.apiServer + '/natrules';
    private cgwRulesApi = this.apiServer + '/cgwrules';

    // Certificates API
    private certificatesApi = this.apiServer + '/certificates';

    // Lab Domain Accounts API
    private accountApi = this.apiServer + '/accounts';

    constructor(private http: HttpClient, private logger: NGXLogger) { }

    public login(apiAuthModel: ApiAuthModel): Observable<any> {
        return this.http.post(this.authUrl, apiAuthModel);
    }

    public getDnsZoneRecords(): Observable<DnsRecord[]> {
        console.log("Getting DNS records");
        return this.http.get<DnsRecord[]>(this.baseUrl);
    }

    public createDnsRecord(dns: Dns): Observable<any> {
        return this.http.put(this.baseUrl, dns);
    }

    public updateDnsRecord(dns: Dns): Observable<any> {
        return this.http.post(this.baseUrl, dns);
    }

    public deleteDnsRecord(dnsZone: string, dnsType: string, dnsDomain: string): Observable<any> {

        const data = {
            zone: dnsZone,
            domain: dnsDomain,
            type: dnsType
        }

        console.log("Deleting DNS record with JSON string: " + data);
        return this.http.post(this.deleteUrl, data);
    }

    public getPublicIPs(): Observable<PublicIPListResult> {
        console.log("Getting public IPs");
        return this.http.get<PublicIPListResult>(this.publicIpApi);
    }

    public requestPublicIP(publicIP: PublicIP): Observable<PublicIP> {
        console.log("Requesting a new public IP", publicIP);
        return this.http.post<PublicIP>(this.publicIpApi, publicIP);
    }

    public updatePublicIP(publicIP: PublicIP): Observable<PublicIP> {
        console.log("Updating public IP", publicIP);
        return this.http.patch<PublicIP>(this.publicIpApi, publicIP);
    }

    public deletePublicIP(publicIP: PublicIP): Observable<PublicIP> {
        console.log("Deleting public IP", publicIP);
        return this.http.put<PublicIP>(this.publicIpApi, publicIP);
    }

    public getNatRules(): Observable<PolicyNatRuleListResult> {
        console.log("Getting NAT Rules");
        return this.http.get<PolicyNatRuleListResult>(this.natRulesApi);
    }

    public createNatRules(policyNatRule: PolicyNatRule): Observable<PolicyNatRule> {
        console.log("Creating new NAT Rule");
        return this.http.post<PolicyNatRule>(this.natRulesApi, policyNatRule);
    }

    public deleteNatRules(policyNatRule: PolicyNatRule): Observable<PolicyNatRule> {
        console.log("Deleting a NAT Rule");
        return this.http.put<PolicyNatRule>(this.natRulesApi, policyNatRule);
    }

    public getCgwRules(): Observable<CgwRuleListResult> {
        console.log("Getting NAT Rules");
        return this.http.get<CgwRuleListResult>(this.cgwRulesApi);
    }

    public getExistingCertificates(): Observable<CertificateResult> {
        console.log("Getting existing certifices");
        return this.http.get<CertificateResult>(this.certificatesApi);
    }

    public createCertificate(certificate: Certificate): Observable<any> {
        console.log("Creating certificate: ", certificate.name);
        const headers = new HttpHeaders();
        return this.http.post<Blob>(this.certificatesApi, certificate, {headers, responseType: 'blob' as 'json'});
    }

    public renewCertificate(certificate: Certificate): Observable<any> {
        console.log("Renewing a certificate: ", certificate.name);
        const headers = new HttpHeaders();
        return this.http.put<Blob>(this.certificatesApi, certificate, {headers, responseType: 'blob' as 'json'});
    }

    public revokeCertificate(certificate: Certificate): Observable<any> {
        console.log("Revoking certificate: ", certificate.name);
        return this.http.patch<any>(this.certificatesApi, certificate);
    }

    public deleteCertificate(certificate: Certificate): Observable<any> {
        console.log("Deleting certificate: ", certificate.name);
        return this.http.post<any>(this.certificatesApi + "/delete", certificate);
    }

    public getAccounts(employeeAccount: EmployeeAccount): Observable<AccountListResult> {
        console.log("Getting accounts for employee username ", employeeAccount.username);
        let params = new HttpParams();
        params = params.set('username', employeeAccount.username);
        const response = this.http.get<AccountListResult>(this.accountApi,{params});
        return response;
    }

    public createAccounts(employeeAccount: EmployeeAccount): Observable<AccountListResult> {
        console.log("Creating accounts for employee username ", employeeAccount.username);
        const accountCreate = new AccountCreate();
        accountCreate.Username = employeeAccount.username;
        accountCreate.Firstname = employeeAccount.firstname;
        accountCreate.Lastname = employeeAccount.lastname;
        return this.http.post<AccountListResult>(this.accountApi, accountCreate);
    }

    public unlockAccount(account: Account): Observable<SimpleApiResponse> {
        console.log("Unlocking account for username ", account.username);
        const accountUnlock = new AccountEnableReset();
        accountUnlock.Username = account.username;
        accountUnlock.AccountType = account.type;
        return this.http.put<SimpleApiResponse>(this.accountApi, accountUnlock);
    }

    public resetAccountPassword(account: Account): Observable<PasswordResetResponse> {
        console.log("Reseting account password for username ", account.username);
        const accountReset = new AccountEnableReset();
        accountReset.Username = account.username;
        accountReset.AccountType = account.type;
        return this.http.patch<PasswordResetResponse>(this.accountApi, accountReset);
    }
}