import { CgwRule } from './CgwRule';

export class CgwRuleListResult {
    _revision: number;
    _create_time: any;
    _create_user: string;
    _last_modified_time: any;
    _last_modified_user: string;
    _protection: string;
    _system_owned: boolean;
    display_name: String;
    id: string;
    resource_type: string;
    parent_path: string;
    path: string;
    relative_path: string;
    marked_for_delete: boolean;
    category: string;
    lock_modified_time: any;
    locked: boolean;
    sequence_number: number;
    stateful: boolean;
    rules: CgwRule[];
}