import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiClientService } from '../../services/api/api-client.service';
import { PublicIP } from '../../models/PublicIP';
import { PublicIPListResult } from '../../models/PublicIPListResult';
import { PublicIpComparator } from './PublicIpComparator';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

@Component({
    selector: 'app-public-ips',
    templateUrl: './public-ips.component.html',
    styleUrls: ['./public-ips.component.scss']
})
export class PublicIpsComponent implements OnInit {

    // Models
    publicIPs: PublicIP[] = [];
    publicIPListResult: PublicIPListResult;
    public_ip_display_name: string;
    public_ip_address: string;

    // Loading for datagrid
    loading: boolean = true;

    // Success alert
    hide_success_alert = true;
    success_alert_message: string;

    // General alert
    hide_general_alert = true;
    general_alert_message: string;
    
    // Request IP Modal
    request_public_ip_form: FormGroup;
    show_request_public_ip_form_modal = false;
    hide_request_public_ip_alert = true;
    request_public_ip_alert_message: string;

    // Edit IP Modal
    edit_public_ip_form: FormGroup;
    show_edit_modal = false;
    hide_edit_public_ip_alert = true;
    edit_public_ip_alert_message: string;

    // Delete IP Modal
    show_delete_modal = false;
    hide_delete_alert = true;
    delete_alert_message: string;
    public_ip_obj_to_delete: PublicIP;

    // Comparator for proper sorting in datagrid
    public publicIpComparator = new PublicIpComparator();

    // Search Filter
    public searchFilter: any = '';
    query: string;
    
    constructor(private formBuilder: FormBuilder, private apiClientService: ApiClientService) { }

    ngOnInit(): void {
        this.hide_general_alert = true;
        
        this.apiClientService.getPublicIPs().subscribe(
            data => {
                console.log('HTTP public IP reload response', data);
                this.publicIPListResult = data;
                this.publicIPs = this.publicIPListResult.results;
            },
            err => {
                console.log('HTTP public IP reload Error', err);
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
                console.log('HTTP public IP reload request completed.');
                this.loading = false;
            }
        );

        this.request_public_ip_form = this.formBuilder.group({
            display_name: ['']
        });

        this.edit_public_ip_form = this.formBuilder.group({
            display_name: [''],
            ip_address: [''],
            ip_id: ['']
        });
    }

    requestPublicIP() {
        this.show_request_public_ip_form_modal = true;
        this.hide_success_alert = true;
    }

    cancelRequest() {
        this.show_request_public_ip_form_modal = false;
        this.hide_request_public_ip_alert = true;
        this.request_public_ip_alert_message = "";
    }

    submitRequest() {
        const display_name = this.request_public_ip_form.value['display_name'];
        const publicIP = new PublicIP();
        publicIP.display_name = display_name;
        this.apiClientService.requestPublicIP(publicIP).subscribe(
            data => {
                console.log('HTTP request new public IP response', data);
                this.ngOnInit();
                this.show_request_public_ip_form_modal = false;
                this.success_alert_message = "Successfully requested new public IP: " + data.ip;
                this.hide_success_alert = false;
                this.hide_request_public_ip_alert = true;
            },
            err => {
                console.log('HTTP request new public IP Error', err);
                if (typeof err === 'string') {
                    this.request_public_ip_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.request_public_ip_alert_message = err.error.message;
                }
                else if (err.status == 0) {
                    this.request_public_ip_alert_message = "The API backend is not running"
                }
                else {
                    this.request_public_ip_alert_message = "An error occurred when trying to request a new public IP"
                }

                this.hide_request_public_ip_alert = false;
            },
            () => console.log('HTTP request new public IP completed.')
        );
    }

    showEditModal(publicIP) {
        this.show_edit_modal = true;
        this.hide_success_alert = true;
        this.hide_edit_public_ip_alert = true;
        this.edit_public_ip_form.patchValue({ display_name: publicIP.display_name });
        this.edit_public_ip_form.patchValue({ ip_address: publicIP.ip });
        this.edit_public_ip_form.patchValue({ ip_id: publicIP.id });
        this.edit_public_ip_alert_message = "";
    }

    cancelEdit() {
        this.show_edit_modal = true;
        this.hide_edit_public_ip_alert = true;
        this.edit_public_ip_alert_message = "";
    }

    saveEdit() {
        const display_name = this.edit_public_ip_form.value['display_name'];
        const ip_address = this.edit_public_ip_form.value['ip_address'];
        const ip_id = this.edit_public_ip_form.value['ip_id'];

        const publicIP = new PublicIP();
        publicIP.display_name = display_name;
        publicIP.ip = ip_address;
        publicIP.id = ip_id;

        this.apiClientService.updatePublicIP(publicIP).subscribe(
            data => {
                console.log('HTTP update public IP response', data);
                this.ngOnInit();
                this.show_edit_modal = false;
                this.success_alert_message = "Successfully updated public IP: " + data.ip;
                this.hide_success_alert = false;
                this.hide_edit_public_ip_alert = true;
                this.edit_public_ip_alert_message = "";
            },
            err => {
                console.log('HTTP update public IP Error', err);
                if (typeof err === 'string') {
                    this.edit_public_ip_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.edit_public_ip_alert_message = err.error.message;
                }
                else if (err.status == 0) {
                    this.edit_public_ip_alert_message = "The API backend is not running"
                }
                else {
                    this.edit_public_ip_alert_message = "An error occurred when trying to update a public IP"
                }

                this.hide_edit_public_ip_alert = false;
            },
            () => console.log('HTTP update public IP completed.')
        );
    }

    showDeleteModal(publicIP) {
        this.show_delete_modal = true;
        this.hide_delete_alert = true;
        this.delete_alert_message = "";
        this.public_ip_obj_to_delete = publicIP;
        this.public_ip_address = publicIP.ip;
        this.public_ip_display_name = publicIP.display_name;
    }

    cancelDelete() {
        this.show_delete_modal = false;
        this.hide_delete_alert = true;
        this.delete_alert_message = "";
        this.public_ip_obj_to_delete = null;
    }

    delete(public_ip_obj) {
        this.apiClientService.deletePublicIP(public_ip_obj).subscribe(
            data => {
                console.log('HTTP delete public IP response', data);
                this.ngOnInit();
                this.show_delete_modal = false;
                this.success_alert_message = "Successfully released public IP.";
                this.hide_success_alert = false;
            },
            err => {
                console.log('HTTP delete public IP Error', err);
                if (typeof err === 'string') {
                    this.delete_alert_message = err;
                }
                else if (err.error.message !== undefined) {
                    this.delete_alert_message = err.error.message;
                }
                else if (err.status == 0) {
                    this.delete_alert_message = "The API backend is not running"
                }
                else {
                    this.delete_alert_message = "An error occurred when trying to delete public IP"
                }

                this.hide_delete_alert = false;
                logEvent(analytics, "public_ip_release_error");
            },
            () => {
                console.log('HTTP delete public IP completed.');
                logEvent(analytics, "public_ip_release_success");
                this.public_ip_obj_to_delete = null;
            }
        );
    }

}
