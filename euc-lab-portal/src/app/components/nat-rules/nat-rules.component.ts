import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiClientService } from '../../services/api/api-client.service';
import { PolicyNatRule } from '../../models/PolicyNatRule';
import { PolicyNatRuleListResult } from '../../models/PolicyNatRuleListResult';
import { NatRuleComparator } from './NatRuleComparator';
import { NatRuleComparator2 } from './NatRulesComparator2';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

@Component({
    selector: 'app-nat-rules',
    templateUrl: './nat-rules.component.html',
    styleUrls: ['./nat-rules.component.scss']
})
export class NatRulesComponent implements OnInit {

    // Models
    natRuleListResult: PolicyNatRuleListResult;
    natRules: PolicyNatRule[] = [];

    // Loading for datagrid
    loading: boolean = true;

    // General alert
    hide_general_alert = true;
    general_alert_message: string;

    // Success Alert
    hide_success_alert = true;
    success_alert_message: string;

    // Add Nat Rule Modal
    add_nat_rule_form: FormGroup;
    show_add_nat_rule_form_modal = false;
    hide_add_nat_rule_alert = true;
    add_nat_rule_alert_message: string;

    // Delete Modal
    show_delete_modal = false;
    hide_delete_alert = true;
    delete_alert_message: string;
    nat_rule_name: string;
    nat_rule_obj_to_delete: PolicyNatRule;

    // Comparator for proper sorting in datagrid
    public natRuleComparator = new NatRuleComparator();
    public natRuleComparator2 = new NatRuleComparator2();

    // Search Filter
    public searchFilter: any = '';
    query: string;

    constructor(private formBuilder: FormBuilder, private apiClientService: ApiClientService) { }

    ngOnInit(): void {
        this.hide_general_alert = true;

        this.apiClientService.getNatRules().subscribe(
            data => {
                console.log('HTTP NAT Rules reload response', data);
                this.natRuleListResult = data;
                this.natRules = this.natRuleListResult.results;
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
                    this.general_alert_message = "The API backend is not running.";
                }
                else {
                    this.general_alert_message = "An error occurred when trying to create a new NAT Rule.";
                }

                this.hide_general_alert = false;
            },
            () => {
                console.log('HTTP NAT Rules reload request completed.');
                this.loading = false;
            }
        );

        this.add_nat_rule_form = this.formBuilder.group({
            name: [''],
            publicIP: [''],
            internalIP: [''],
            enabled: [''],
            logging: ['']
        });
    }

    showAddNatRuleModal() {
        this.show_add_nat_rule_form_modal = true;
        this.hide_success_alert = true;
    }

    cancelRequest() {
        this.show_add_nat_rule_form_modal = false;
        this.hide_add_nat_rule_alert = true;
        this.add_nat_rule_alert_message = "";
    }

    submitRequest() {
        const name = this.add_nat_rule_form.value['name'];
        const publicIP = this.add_nat_rule_form.value['publicIP'];
        const internalIP = this.add_nat_rule_form.value['internalIP'];
        const enabled = this.add_nat_rule_form.value['enabled'];
        const logging = this.add_nat_rule_form.value['logging'];

        const policyNatRule = new PolicyNatRule();
        policyNatRule.display_name = name;
        policyNatRule.translated_network = publicIP;
        policyNatRule.source_network = internalIP;
        policyNatRule.enabled = enabled;
        policyNatRule.logging = logging;

        this.apiClientService.createNatRules(policyNatRule).subscribe(
            data => {
                console.log('HTTP request new NAT rule response', data);
                this.ngOnInit();
                this.show_add_nat_rule_form_modal = false;
                this.success_alert_message = "Successfully requested new NAT rule: " + data.display_name;
                this.hide_success_alert = false;
                this.hide_add_nat_rule_alert = true;
            },
            err => {
                console.log('HTTP request new NAT rule Error', err);
                if (typeof err === 'string') {
                    this.add_nat_rule_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.add_nat_rule_alert_message = err.error.message;
                }
                else if (err.status == 0) {
                    this.add_nat_rule_alert_message = "The API backend is not running"
                    this.add_nat_rule_alert_message += " (" + err.status + " " + err.statusText + ")";
                }
                else {
                    this.add_nat_rule_alert_message = "An error occurred when trying to request a new NAT rule"
                }

                this.hide_add_nat_rule_alert = false;
            },
            () => console.log('HTTP request new NAT rule completed.')
        );
    }

    showEditModal(natRule) {

    }

    showDeleteModal(natRule) {
        this.show_delete_modal = true;
        this.hide_success_alert = true;
        this.hide_add_nat_rule_alert = true;
        this.nat_rule_name = natRule.display_name;
        this.nat_rule_obj_to_delete = natRule;
    }

    cancelDelete() {
        this.show_delete_modal = false;
        this.hide_delete_alert = true;
        this.nat_rule_obj_to_delete = null;
    }

    delete(nat_rule_obj_to_delete) {
        this.apiClientService.deleteNatRules(nat_rule_obj_to_delete).subscribe(
            res => {
                console.log('HTTP delete NAT rule response', res);

                if (res) {
                    this.ngOnInit();
                    this.show_delete_modal = false;
                    this.success_alert_message = "Successfully deleted NAT rule " + nat_rule_obj_to_delete.display_name + "!";
                    this.hide_success_alert = false;
                    this.hide_delete_alert = true;
                }
                else {
                    console.log("Delete nat rule res was null.  res =>", res);
                }
            },
            err => {
                console.log('HTTP delete NAT rule error', err)

                
                if (typeof err === 'string') {
                    this.delete_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.delete_alert_message = "Unable to delete " + nat_rule_obj_to_delete.display_name + ". " + err.error.message;
                }
                else if (err.status == 0) {
                    this.delete_alert_message = "The API backend is not running";
                    this.delete_alert_message += " (" + err.status + " " + err.statusText + ")";
                }
                else {
                    this.delete_alert_message = "An error occurred when trying to delete the NAT rule " + nat_rule_obj_to_delete.display_name + "."
                }

                this.hide_delete_alert = false;
                console.log(this.delete_alert_message);
                logEvent(analytics, "nat_rule_delete_error");
            },
            () => {
                console.log('HTTP delete NAT rule request completed.');
                logEvent(analytics, "nat_rule_delete_success");
                this.nat_rule_obj_to_delete = null;
            }
        );
    }
}
