import { PolicyNatRule } from './PolicyNatRule'

export class PolicyNatRuleListResult {
    result_count: number;
    results: PolicyNatRule[];
    sort_ascending: boolean;
    sort_by: string;
}