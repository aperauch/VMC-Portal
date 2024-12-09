import { Injectable } from '@angular/core';
import { ClrDatagridComparatorInterface } from "@clr/angular";
import { Certificate } from '../../models/Certificate';

@Injectable({
    providedIn: 'root'
})
export class CertificateComparator implements ClrDatagridComparatorInterface<Certificate> {
    public compare(a: Certificate, b: Certificate) {
        return String(a.name).localeCompare(String(b.name));
    }
}