import { Component, OnInit } from '@angular/core';
import { ApiClientService } from '../../services/api/api-client.service';
import { CgwRule } from '../../models/CgwRule';
import { CgwRuleListResult } from '../../models/CgwRuleListResult';
import { CgwRuleComparator } from './CgwRuleComparator';
import { getAnalytics, logEvent } from "firebase/analytics";

// Firebase Analytics
const analytics = getAnalytics();

@Component({
    selector: 'app-cgw-rules',
    templateUrl: './cgw-rules.component.html',
    styleUrls: ['./cgw-rules.component.scss']
})
export class CgwRulesComponent implements OnInit {

    // Models
    cgwRuleListResult: CgwRuleListResult;
    cgwRules: CgwRule[] = [];

    // General alert
    hide_general_alert = true;
    general_alert_message: string;

    // Loading for datagrid
    loading: boolean = true;

    // Comparator for proper sorting in datagrid
    public cgwRuleComparator = new CgwRuleComparator();

    // Search Filter
    public searchFilter: any = '';
    query: string;

    constructor(private apiClientService: ApiClientService) { }

    ngOnInit(): void {
        logEvent(analytics, "CGW Rules Loaded");
        this.hide_general_alert = true;
        
        this.apiClientService.getCgwRules().subscribe(
            data => {
                console.log("NAT rules loading 2...");
                console.log('HTTP NAT Rules reload response', data);
                this.cgwRuleListResult = data;
                this.cgwRules = this.cgwRuleListResult.rules;
            },
            err => {
                console.log('HTTP NAT Rules reload Error', err);
                if (typeof err === 'string') {
                    this.general_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.general_alert_message = err.error.message;
                }
                else if (err.status == 0) {
                    this.general_alert_message = "The API backend is not running"
                }
                else {
                    this.general_alert_message = "An error occurred when trying to request a new public IP"
                }

                this.hide_general_alert = false;
            },
            () => {
                console.log('HTTP NAT Rules reload request completed.');
                this.loading = false;
            }
        );
    }

}
