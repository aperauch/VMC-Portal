import { PublicIP } from './PublicIP';

export class PublicIPListResult {
    result_count: number;
    results: PublicIP[];
    sort_ascending: boolean;
    sort_by: string;
}