import { Account } from './Account';

export class AccountListResult {
    UserAccount: Account;
    UserAccountUsername: string;
    UserAccountPassword: string;
    AdminAccount: Account;
    AdminAccountUsername: string;
    AdminAccountPassword: string;
}