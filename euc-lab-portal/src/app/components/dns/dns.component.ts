import { Component, OnInit, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../services/api/api-client.service';
import { DnsRecord } from '../../models/DnsRecord';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { map } from 'rxjs/operators';
import { DnsComparator } from './DnsComparator';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { TruncatePipe } from '../../truncate.pipe';
import '@cds/core/divider/register.js';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

@Injectable({
    providedIn: 'root'
})
@Component({
    selector: 'app-dns',
    templateUrl: './dns.component.html',
    styleUrls: ['./dns.component.scss']
})
export class DnsComponent implements OnInit {

    // Models
    dnsRecords: Observable<DnsRecord[]>;
    dnsArray: DnsRecord[] = [];
    createDnsRecordApiResponse: Observable<DnsRecord>;
    dnsModel: DnsRecord;

    // Loading for datagrid
    loading: boolean = true;

    // DNS forms
    createDnsForm: FormGroup;
    editDnsForm: FormGroup;
    zone_select: string;
    dns_type_select: string;
    dns_record_name: string;
    dns_answer_values: string[];

    // Modal attributes
    modal_dns_zone: string;
    modal_dns_type: string;
    modal_dns_domain: string;
    modal_dns_answers: string[];

    // Create modal
    show_create_dns_form_modal = false;
    hide_create_alert = true;
    create_alert_message: string;

    // General alert
    hide_general_alert = true;
    general_alert_message: string;

    // Success Alert
    hide_success_alert = true;
    success_alert_message: string;

    // Edit modal
    show_edit_dns_form_modal = false;
    hide_edit_alert = true;
    edit_alert_message: string;
    originalRecord: DnsRecord;

    // Delete modal
    show_delete_modal = false;
    delete_alert_message: string;
    hide_delete_alert = true;

    // Comparator for proper sorting in datagrid
    public dnsComparator = new DnsComparator();

    // Search Filter
    public searchFilter: any = '';
    query: string;

    constructor(private formBuilder: FormBuilder, private apiClientService: ApiClientService) { }

    ngOnInit(): void {
        this.reloadData();
        this.initDnsForms();
    }

    reloadData() {
        this.hide_general_alert = true;

        this.apiClientService.getDnsZoneRecords()
            .pipe(
                map(data => {
                    const eucRecords = data["euclab.net"]
                    eucRecords.forEach(function (item) {
                        item.zone = "euclab.net";
                    });

                    const psoRecords = data["psolab.net"]
                    psoRecords.forEach(function (item) {
                        item.zone = "psolab.net";
                    });

                    const combined = [...eucRecords, ...psoRecords];
                    this.dnsArray = combined;
                    this.dnsArray = this.dnsArray.sort((a, b) => (a.domain < b.domain ? -1 : 1));
                }))
            .subscribe(
                data => console.log('HTTP reload response', data),
                err => {
                    console.log('HTTP reload Error', err);
                    if (typeof err === 'string') {
                        this.general_alert_message = err;
                    }
                    else if (err.error == undefined) {
                        console.log('undefined error');
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
                    console.log('HTTP reload request completed.');
                    this.loading = false;
                }
            );
    }

    initDnsForms(): void {
        this.createDnsForm = this.formBuilder.group({
            zone: [''],
            type: [''],
            domain: [''],
            answers: ['']
        });

        this.editDnsForm = this.formBuilder.group({
            zone: [''],
            type: [''],
            domain: [''],
            answers: ['']
        });
    }

    createNewDnsRecord() {
        let dns = new DnsRecord();
        dns.zone = this.createDnsForm.value['zone'];
        dns.type = this.createDnsForm.value['type'];
        dns.domain = this.createDnsForm.value['domain'];
        dns.answers = this.createDnsForm.value['answers'];

        this.apiClientService.createDnsRecord(dns).subscribe(
            res => {
                console.log('HTTP create response', res);
                if (res) {
                    this.ngOnInit();
                    this.show_create_dns_form_modal = false;
                    this.success_alert_message = "Successfully created DNS record " + dns.domain + "." + dns.zone + "!";
                    this.hide_success_alert = false;
                    this.hide_create_alert = true;
                }
                else {
                    console.log("Create res was null.  res =", res);
                }
            },
            err => {
                console.log('HTTP create Error from subscribe: ', err);
                if (typeof err === 'string') {
                    this.create_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.create_alert_message = "The " + dns.domain + "." + dns.zone + " " + err.error.message;
                }
                else if (err.status == 0) {
                    this.create_alert_message = "The API backend is not running";
                    this.edit_alert_message += " (" + err.status + " " + err.statusText + ")";
                }
                else {
                    this.create_alert_message = "An error occurred when trying to create the DNS record"
                }

                this.hide_create_alert = false;
                console.log(this.create_alert_message);
            },
            () => console.log('HTTP create request completed.')
        );
    }

    showDeleteConfirmationModal(dns) {
        this.success_alert_message = "Successfully deleted " + dns.domain + ".";
        this.hide_success_alert = true;
        this.show_delete_modal = true;
        this.modal_dns_zone = dns.zone;
        this.modal_dns_type = dns.type;
        this.modal_dns_domain = dns.domain;
    }

    delete(dnsZone, dnsType, dnsDomain) {
        this.apiClientService.deleteDnsRecord(dnsZone, dnsType, dnsDomain).subscribe(
            res => {
                console.log('HTTP delete response', res);
                this.show_delete_modal = false;
                this.ngOnInit();
                this.hide_success_alert = false;
            },
            err => {
                console.log('HTTP delete error response', err);

                if (typeof err === 'string') {
                    this.delete_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.delete_alert_message = "The " + dnsDomain + "." + dnsZone + " " + err.error.message;
                }
                else if (err.status == 0) {
                    this.delete_alert_message = "The API backend is not running";
                    this.edit_alert_message += " (" + err.status + " " + err.statusText + ")";
                }
                else {
                    this.delete_alert_message = "An error occurred when trying to delete the DNS record"
                }
                
                this.hide_delete_alert = false;
                console.log(this.delete_alert_message);
            },
            () => console.log('HTTP delete request completed.')
        );
    }

    cancelDelete() {
        this.show_delete_modal = false;
    }

    closeCreateDnsFormModal() {
        this.show_create_dns_form_modal = false;
    }

    openCreateDnsFormModal() {
        this.hide_success_alert = true;
        this.show_create_dns_form_modal = true;
    }

    openEditDnsFormModal(dns) {
        this.hide_success_alert = true;
        this.show_edit_dns_form_modal = true;
        this.editDnsForm.patchValue({ zone: dns.zone });
        this.editDnsForm.patchValue({ type: dns.type });
        this.editDnsForm.patchValue({ domain: dns.domain });
        this.editDnsForm.patchValue({ answers: dns.short_answers });
    }

    closeEditDnsModal() {
        this.show_edit_dns_form_modal = false;
    }

    saveEditDnsModal() {
        let dns = new DnsRecord();
        dns.zone = this.editDnsForm.value['zone'];
        dns.type = this.editDnsForm.value['type'];
        dns.domain = this.editDnsForm.value['domain'];
        dns.answers = this.editDnsForm.value['answers'];

        this.apiClientService.updateDnsRecord(dns).subscribe(
            res => {
                console.log('HTTP edit response', res);

                if (res) {
                    this.ngOnInit();
                    this.show_edit_dns_form_modal = false;
                    this.success_alert_message = "Successfully updated DNS record " + dns.domain + dns.zone + "!";
                    this.hide_success_alert = false;
                    this.hide_edit_alert = true;
                }
                else {
                    console.log("Create res was null.  res =>", res);
                }
            },
            err => {
                console.log('HTTP edit error', err)

                
                if (typeof err === 'string') {
                    this.edit_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.edit_alert_message = "The " + dns.domain + "." + dns.zone + " " + err.error.message;
                }
                else if (err.status == 0) {
                    this.edit_alert_message = "The API backend is not running";
                    this.edit_alert_message += " (" + err.status + " " + err.statusText + ")";
                }
                else {
                    this.edit_alert_message = "An error occurred when trying to update the DNS record"
                }

                this.hide_edit_alert = false;
                console.log(this.edit_alert_message);
            },
            () => console.log('HTTP edit request completed.')
        );
    }

}
