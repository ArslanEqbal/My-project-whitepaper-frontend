import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BlueprintService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;

  generateReport(reportJson:any, buName: string, productName: string, reportName: string, nameOfUser: string,  userRole: string): Observable<any> {
    const apiUrl = this.baseUrl+'/generate_report'
    const payload = {template_json:reportJson, business_unit: buName, product_name: productName, report_name: reportName ,  username: nameOfUser, role: userRole }
    return this.http.post<any>(apiUrl,payload);
  }
  // username role bu

}
