import { Injectable } from '@angular/core';
import { ClrDatagridComparatorInterface } from "@clr/angular";
import { PublicIP } from '../../models/PublicIP';

@Injectable({
    providedIn: 'root'
})
export class PublicIpComparator implements ClrDatagridComparatorInterface<PublicIP> {
    public compare(a: PublicIP, b: PublicIP) {
        const numA = Number(
            a.ip.split('.')
                .map((num, idx) => Number(num) * Math.pow(2, (3 - idx) * 8))
                .reduce((a, v) => ((a += v), a), 0)
          );
          const numB = Number(
            b.ip.split('.')
                .map((num, idx) => Number(num) * Math.pow(2, (3 - idx) * 8))
                .reduce((a, v) => ((a += v), a), 0)
          );
          return numA - numB;
    }
}