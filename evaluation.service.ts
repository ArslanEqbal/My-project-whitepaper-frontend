import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {

  private baseUrl = environment.apiUrl;

  private functionAppName = environment.AZURE_FUNCTION_APP_NAME;
  private triggerName = environment.AZURE_FTN_EVAL_TRIGGER_NAME;
  private key = environment.AZURE_HTTP_FUNCTION_KEY;
  private appFuncURL = `https://${this.functionAppName}.azurewebsites.net/api/${this.triggerName}`

  constructor(private http: HttpClient) { }


  fetchListOfEvaluations(buName: string, productName: string, usecaseType: string): Observable<any> {
    const apiUrl = this.baseUrl + '/fetch_evaluations';
    const payload = { business_unit: buName, product_name: productName, usecase: usecaseType };
    return this.http.post<any>(apiUrl, payload);
  }

  downloadSelected(buName: string, productName: string, selectedFiles: string[], usecaseType: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/download_selected_evaluations`;
    const payload = { business_unit: buName, product_name: productName, appVersions: selectedFiles, usecase: usecaseType };
    return this.http.post(apiUrl, payload, { responseType: 'blob' });
  }

  deleteSelected(buName: string, productName: string, selectedFiles: string[], usecaseType: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/delete_selected_evaluations`;
    const payload = { business_unit: buName, product_name: productName, appVersions: selectedFiles, usecase: usecaseType };
    return this.http.post(apiUrl, payload);
  }

  downloadSummary(buName: string, productName: string, usecaseType: string): Observable<any> {
    const url = `${this.baseUrl}/download_eval_summary_table`;
    const body = { business_unit: buName, product_name: productName, usecase: usecaseType };
    return this.http.post(url, body, { responseType: 'blob' });
  }

  // Method to check if the unique name is available
  // TODO: passing selectedUsecase
  checkUniqueName(productName: string, uniqueName: string, usecaseType: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/check_unique_name`;
    const payload = { product_name: productName, unique_name: uniqueName, usecase: usecaseType };
    return this.http.post<any>(apiUrl, payload);
  }

  downloadTemplate(usecase: string) {
    const url = `${this.baseUrl}/download_template?usecase=${usecase}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  uploadEvalFile(formData: FormData) {
    const url = `${this.baseUrl}/upload_eval_file`;
    return this.http.post<any>(url, formData);
  }




  addEvaluationTask(username: string, productName: string, usecaseType: string, filepath: string) {
    const url = `${this.appFuncURL}?code=${this.key}`;  // Azure function app URL
    const headers = { 'Content-Type': 'application/json' };
    const payload = {
      usecase: usecaseType,
      product_name: productName,
      username: username,
      filepath: filepath
    };

    console.log("azure function call", payload)

    return this.http.post(url, payload, { headers, responseType: 'text' });
  }


}
