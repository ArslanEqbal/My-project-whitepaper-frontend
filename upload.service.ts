import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentsService } from './documents.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {

  constructor(private http: HttpClient,
    private documentsService: DocumentsService
  ) { }

  private baseUrl = environment.apiUrl;

  uploadFiles(selectedFiles: File[], buName: string, productName: string): Observable<any> {

    const apiUrl = this.baseUrl + '/upload'
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('business_unit', buName);
    formData.append('product_name', productName);

    return this.http.post(apiUrl, formData);
  }

  // Fetch the blueprint JSON from Azure Blob Storage
  fetchBlueprint(productName: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/fetch-blueprint`;
    const payload = {
      product_name: productName
    };
    return this.http.post(apiUrl, payload);
  }

  // Method to save the blueprint JSON
  saveBlueprint(productName: string, blueprintData: any): Observable<any> {
    const apiUrl = `${this.baseUrl}/save-blueprint`;
    const payload = {
      product_name: productName,
      blueprint: blueprintData
    };
    return this.http.post(apiUrl, payload);
  }

  // Fetch the blueprint JSON from Azure Blob Storage
  fetchProgressStatusJSON(productName: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/fetch-progress-status-json`;
    const payload = {
      product_name: productName
    };
    return this.http.post(apiUrl, payload);
  }

  // Method to save the blueprint JSON
  saveProgressStatusJSON(productName: string, username: string): Observable<any> {
    // console.log("in saveProgressStatusJSON ")
    const apiUrl = `${this.baseUrl}/save-progress-status-json`;

    const status = this.documentsService.getProgressStatusForProduct(productName);
    const progressStatusJSON = {
      triggeredByUsername: username,
      showProgressStatus: status.showProgressStatus,
      uploadStatus :status.uploadStatus,
      deleteStatus : status.deleteStatus,
      totalDeletedFiles : status.totalFilesDeleted
    }


    const payload = {
      product_name: productName,
      progressStatusJSON: progressStatusJSON
    };

    return this.http.post(apiUrl, payload);
  }



}
