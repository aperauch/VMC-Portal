import { Injectable } from '@angular/core';
import { ClrDatagridComparatorInterface } from "@clr/angular";
import { PolicyNatRule } from '../../models/PolicyNatRule';

@Injectable({
    providedIn: 'root'
})
export class NatRuleComparator implements ClrDatagridComparatorInterface<PolicyNatRule> {
    public compare(a: PolicyNatRule, b: PolicyNatRule) {
        const numA = Number(
            a.source_network.split('.')
                .map((num, idx) => Number(num) * Math.pow(2, (3 - idx) * 8))
                .reduce((a, v) => ((a += v), a), 0)
          );
          const numB = Number(
            b.source_network.split('.')
                .map((num, idx) => Number(num) * Math.pow(2, (3 - idx) * 8))
                .reduce((a, v) => ((a += v), a), 0)
          );
          return numA - numB;
    }
}