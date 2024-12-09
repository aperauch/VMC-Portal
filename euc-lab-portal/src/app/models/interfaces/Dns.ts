export interface Dns {
    zone: string;
    id: string;
    domain: string;
    answers: string[];
    short_answers: string[];
    type: string;
    ttl: number;
    tier: number;
}