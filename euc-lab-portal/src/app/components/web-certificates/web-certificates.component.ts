import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Certificate } from 'src/app/models/Certificate';
import { CertificateResult } from 'src/app/models/CertificateResult';
import { CertificateComparator } from './CertificateComparator';
import { ApiClientService } from 'src/app/services/api/api-client.service';
import { HttpResponse } from '@angular/common/http';
import { ClrLoadingState } from '@clr/angular';
import { environment } from 'src/environments/environment';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from 'firebase/app';

// Firebase Analytics
const firebaseApp = initializeApp(environment.firebase);
const analytics = getAnalytics();

@Component({
  selector: 'app-web-certificates',
  templateUrl: './web-certificates.component.html',
  styleUrls: ['./web-certificates.component.scss'],
})
export class WebCertificatesComponent implements OnInit {
  // Models
  certificateResult: CertificateResult;
  certificates: Certificate[] = [];

  // Loading for datagrid
  loading: boolean = true;

  // Alerts
  hide_success_alert = true;
  success_alert_message: string;
  hide_general_alert = true;
  general_alert_message: string;

  // Create Certificate Modal
  create_certificate_form: FormGroup;
  show_create_certificate_modal = false;
  hide_create_certificate_alert = true;
  create_certificate_alert_message: string;
  keySize = '2048';
  propationTimeInSeconds = '45';
  createCertButtonState: ClrLoadingState = ClrLoadingState.DEFAULT;

  // Renew Certificate Modal
  renew_certificate_form: FormGroup;
  show_renew_certificate_modal = false;
  hide_renew_certificate_alert = true;
  renew_certificate_alert_message: string;
  renewCertButtonState: ClrLoadingState = ClrLoadingState.DEFAULT;

  // Revoke Certificate
  show_revoke_certificate_modal = false;
  hide_revoke_certificate_alert = true;
  revoke_certificate_alert_message: string;
  revokeCertButtonState: ClrLoadingState = ClrLoadingState.DEFAULT;
  revoke_modal_body_message: string;
  disableButton = false;

  // Delete Certificate
  show_delete_certificate_modal = false;
  hide_delete_certificate_alert = true;
  delete_certificate_alert_message: string;
  deleteCertButtonState: ClrLoadingState = ClrLoadingState.DEFAULT;

  // For cert revoke and delete modals
  certName: string;

  // Comparator
  public certificateComparator = new CertificateComparator();

  constructor(
    private formBuilder: FormBuilder,
    private apiClientService: ApiClientService
  ) {}

  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
  }

  ngOnInit(): void {
    this.reloadDatagrid();
  }

  reloadDatagrid(): void {
    this.hide_general_alert = true;

    this.apiClientService.getExistingCertificates().subscribe(
      (data) => {
        console.log('HTTP Certificate reload response', data);
        this.certificateResult = data;
        this.certificates = this.certificateResult.results;
      },
      (err) => {
        console.log('HTTP Certificate reload Error', err);
        if (typeof err === 'string') {
          this.general_alert_message =
            err + '.  Please ensure the backend API has been setup correctly.';
        } else if (err.error.message !== undefined) {
          this.general_alert_message = err.error.message;
        } else if (err.status == 0) {
          this.general_alert_message = 'The API backend is not running.';
        } else {
          this.general_alert_message =
            'An error occurred when trying to create a new certificate.';
        }

        this.hide_general_alert = false;
      },
      () => {
        console.log('HTTP Certificate reload request completed.');
        this.loading = false;
      }
    );

    this.create_certificate_form = this.formBuilder.group({
      zone: [''],
      name: [''],
      domains: [''],
      privateKeySize: [''],
      secondsToWait: [''],
      privateKeyPassword: [''],
      email: ['']
    });

    this.renew_certificate_form = this.formBuilder.group({
      name: [''],
      privateKeyPassword: [''],
      forceRenewal: ['']
    });
  }

  showCreateCertificateModal() {
    this.show_create_certificate_modal = true;
    this.hide_success_alert = true;
  }

  cancelRequest() {
    this.show_create_certificate_modal = false;
    this.hide_create_certificate_alert = true;
    this.general_alert_message = '';
  }

  submitRequest() {
    const cert = new Certificate();
    cert.zone = this.create_certificate_form.value['zone'];
    cert.name = this.create_certificate_form.value['name'];
    cert.domains = this.create_certificate_form.value['domains'];
    cert.privateKeySize = this.create_certificate_form.value['privateKeySize'];
    cert.secondsToWait = this.create_certificate_form.value['secondsToWait'];
    cert.privateKeyPassword = this.create_certificate_form.value[
      'privateKeyPassword'
    ];
    cert.email = this.create_certificate_form.value['email'];

    this.createCertButtonState = ClrLoadingState.LOADING;
    this.apiClientService.createCertificate(cert).subscribe(
      (response: HttpResponse<Blob>) => {
        console.log('Getting certificate zip file as a blob.');
        
        let binaryData = [];
        binaryData.push(response);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(
          new Blob(binaryData, { type: 'blob' })
        );

        downloadLink.setAttribute('download', cert.name + '.zip');
        document.body.appendChild(downloadLink);
        downloadLink.click();

        this.createCertButtonState = ClrLoadingState.SUCCESS;

        // Delay reload to allow for state change
        this.delay(1000).then(any => {
          this.ngOnInit();
          this.show_create_certificate_modal = false;
          this.success_alert_message =`Successfully created ${cert.name} and downloaded zip file containing certifcate files.`;
          this.hide_success_alert = false;
          this.hide_create_certificate_alert = true;
        });
        
      },
      (err) => {
        this.createCertButtonState = ClrLoadingState.ERROR;
        console.log('HTTP create new certificate API error response:  ', err);
        if (typeof err === 'string') {
          this.create_certificate_alert_message = err;
        } else if (err.error.message !== undefined) {
          this.create_certificate_alert_message = err.error.message;
        } else if (err.status == 0) {
          this.create_certificate_alert_message =
            'The API backend is not running';
          this.create_certificate_alert_message +=
            ' (' + err.status + ' ' + err.statusText + ')';
        } else {
          this.create_certificate_alert_message =
            'An error occurred when trying to create a new certificate rule';
        }

        this.hide_create_certificate_alert = false;
      },
      () => {
        console.log('HTTP request completed.');
      }
    );
  }

  showRenewModal(certificate) {
    this.show_renew_certificate_modal = true;
    this.hide_success_alert = true;
    this.renew_certificate_form.patchValue({ name: certificate.name });

    // If cert is valid for 31 days or more, then enable force renewal toggle button
    var daysUntilExpired: number = +(certificate.status.split(" ")[1]);
    if (daysUntilExpired > 30) {
      this.renew_certificate_form.patchValue({ forceRenewal: true });
    }
  }

  cancelRenewRequest() {
    this.show_renew_certificate_modal = false;
    this.hide_renew_certificate_alert = true;
    this.general_alert_message = '';
  }

  submitRenewRequest() {
    const cert = new Certificate();
    cert.name = this.renew_certificate_form.value['name'];
    cert.privateKeyPassword = this.renew_certificate_form.value[
      'privateKeyPassword'
    ];
    cert.forceRenewal = this.renew_certificate_form.value['forceRenewal'];

    this.renewCertButtonState = ClrLoadingState.LOADING;
    this.apiClientService.renewCertificate(cert).subscribe(
      (response: HttpResponse<Blob>) => {
        console.log('Getting renewed certificate zip file as a blob.');
        let binaryData = [];
        binaryData.push(response);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(
          new Blob(binaryData, { type: 'blob' })
        );

        downloadLink.setAttribute('download', cert.name + '.zip');
        document.body.appendChild(downloadLink);
        downloadLink.click();

        this.renewCertButtonState = ClrLoadingState.SUCCESS;

        // Delay reload to allow for state change
        this.delay(1000).then(any => {
          this.ngOnInit();
          this.show_renew_certificate_modal = false;
          this.success_alert_message = `Successfully renewed ${cert.name} and downlaoded the certificate files.`;
          this.hide_success_alert = false;
          this.hide_renew_certificate_alert = true;
        });

      },
      (err) => {
        this.renewCertButtonState = ClrLoadingState.ERROR;

        console.log('HTTP certificate renewal error response:  ', err);
        if (typeof err === 'string') {
          this.renew_certificate_alert_message = err;
        } else if (err.error.message !== undefined) {
          this.renew_certificate_alert_message = err.error.message;
        } else if (err.status == 0) {
          this.renew_certificate_alert_message =
            'The API backend is not running';
          this.renew_certificate_alert_message +=
            ' (' + err.status + ' ' + err.statusText + ')';
        } else {
          this.renew_certificate_alert_message =
            'An error occurred when trying to renew a certificate';
        }

        this.hide_renew_certificate_alert = false;
      },
      () => console.log('HTTP request completed.')
    );
  }

  showRevokeModal(certificate) {
    this.show_revoke_certificate_modal = true;
    this.hide_success_alert = true;
    this.certName = certificate.name;

    // If cert is invalid (e.g., it is already revoked) then disable revoke button
    var statusReason: string = certificate.status.split(" ")[1]
    if (statusReason == "REVOKED") {
      this.disableButton = true;
      this.revoke_modal_body_message = `<p>The <b>${this.certName}</b> certificate is already revoked.  Consider deleting instead.</p>`;
    }
    else {
      this.revoke_modal_body_message = `<p>Are you sure you want to revoke the <b>${this.certName}</b> certificate?</p>`;
    }
  }

  cancelRevokeRequest() {
    this.show_revoke_certificate_modal = false;
    this.hide_revoke_certificate_alert = true;
    this.general_alert_message = '';
  }

  submitRevokeRequest(certName) {
    const cert = new Certificate();
    cert.name =certName;

    this.revokeCertButtonState = ClrLoadingState.LOADING;
    this.apiClientService.revokeCertificate(cert).subscribe(
      response => {
        console.log('Revoke certificate request response: ', response);

        // Delay reload to allow for state change
        // Revoking takes a while to update state
        this.delay(20000).then(any => {
          this.revokeCertButtonState = ClrLoadingState.SUCCESS;

          this.delay(1000).then(any => {
            this.ngOnInit();
            this.show_revoke_certificate_modal = false;
            this.success_alert_message =`Successfully revoked the ${cert.name} certificate.`;
            this.hide_success_alert = false;
            this.hide_revoke_certificate_alert = true;
          });
        });
        
      },
      (err) => {
        this.revokeCertButtonState = ClrLoadingState.ERROR;

        console.log('Revoke certificate error response:  ', err);
        if (typeof err === 'string') {
          this.revoke_certificate_alert_message = err;
        } else if (err.error.message !== undefined) {
          this.revoke_certificate_alert_message = err.error.message;
        } else if (err.status == 0) {
          this.revoke_certificate_alert_message =
            'The API backend is not running';
          this.revoke_certificate_alert_message +=
            ' (' + err.status + ' ' + err.statusText + ')';
        } else {
          this.revoke_certificate_alert_message =
            'An error occurred when trying to revoke a certificate';
        }

        this.hide_revoke_certificate_alert = false;
      },
      () => console.log('HTTP request completed.')
    );
  }

  showDeleteModal(certificate) {
    this.show_delete_certificate_modal = true;
    this.hide_success_alert = true;
    this.certName = certificate.name;
  }

  cancelDeleteRequest() {
    this.show_delete_certificate_modal = false;
    this.hide_delete_certificate_alert = true;
    this.general_alert_message = '';
  }

  submitDeleteRequest(certName) {
    const cert = new Certificate();
    cert.name = certName;

    this.deleteCertButtonState = ClrLoadingState.LOADING;
    this.apiClientService.deleteCertificate(cert).subscribe(
      response => {
        console.log('Delete certififcate response: ', response);
        this.deleteCertButtonState = ClrLoadingState.SUCCESS;

        // Delay reload to allow for state change
        this.delay(1500).then(any => {
          this.ngOnInit();
          this.show_delete_certificate_modal = false;
          this.success_alert_message ='Successfully deleted the certificate.';
          this.hide_success_alert = false;
          this.hide_delete_certificate_alert = true;
        });

      },
      (err) => {
        this.deleteCertButtonState = ClrLoadingState.ERROR;

        console.log('HTTP certificate deletion error response:  ', err);
        if (typeof err === 'string') {
          this.delete_certificate_alert_message = err;
        } else if (err.error.message !== undefined) {
          this.delete_certificate_alert_message = err.error.message;
        } else if (err.status == 0) {
          this.delete_certificate_alert_message =
            'The API backend is not running';
          this.delete_certificate_alert_message +=
            ' (' + err.status + ' ' + err.statusText + ')';
        } else {
          this.delete_certificate_alert_message =
            'An error occurred when trying to delete a certificate';
        }

        this.hide_delete_certificate_alert = false;
      },
      () => console.log('HTTP request completed.')
    );
  }

}
