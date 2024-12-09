import { Injectable } from '@angular/core';
import { ClrDatagridComparatorInterface, ClrDatagridSortOrder } from "@clr/angular";
import { CgwRule } from '../../models/CgwRule';

@Injectable({
    providedIn: 'root'
})
export class CgwRuleComparator implements ClrDatagridComparatorInterface<CgwRule> {
    public compare(a: CgwRule, b: CgwRule) {
        return String(a.display_name).localeCompare(String(b.display_name));
    }
}