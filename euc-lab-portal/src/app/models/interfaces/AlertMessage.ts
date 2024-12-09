import { HttpErrorResponse } from '@angular/common/http';

export class AlertMessage {
    type: string;
    title: string;
    message: string;
    status: number;
    httpErrorResponse: HttpErrorResponse;
}