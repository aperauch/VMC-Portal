import { Injectable } from '@angular/core';
import { ClrDatagridComparatorInterface } from "@clr/angular";
import { Sort } from '@clr/angular/data/datagrid/providers/sort';
import { DnsRecord } from '../../models/DnsRecord';

@Injectable({
    providedIn: 'root'
})
export class DnsComparator implements ClrDatagridComparatorInterface<DnsRecord> {
    public compare(a: DnsRecord, b: DnsRecord) {
        return (a.short_answers[0]).localeCompare(b.short_answers[0]);
    }
}