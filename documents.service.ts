import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UploadExternalService } from './upload-external.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentsService {

  constructor(private http: HttpClient, private uploadExternalService: UploadExternalService) { }

  private baseUrl = environment.apiUrl;

  private documentCounts: { [key: string]: number } = {}; // Dictionary to hold counts by product name

  private lastReportGenerated: { [key: string]: string } = {}; // To hold the last report generation timestamp

  private productProgressStatus: { [productName: string]: { showProgressStatus: boolean, uploadStatus: boolean, deleteStatus: boolean, totalFilesDeleted: number } } = {};


  // Method to get progress status for a specific product
  getProgressStatusForProduct(productName: string) {
    // console.log('Checking progress status for product:', productName);
    // console.log('Current productProgressStatus:', this.productProgressStatus);

    if (this.productProgressStatus.hasOwnProperty(productName)) {
      // console.log('Product found:', productName);
      return this.productProgressStatus[productName];
    } else {
      // console.log('Product not found, returning default:', productName);
      return { showProgressStatus: false, uploadStatus: false, deleteStatus: false, totalFilesDeleted: 0 };
    }
  }

  // Method to set progress status for a specific product
  setProgressStatusForProduct(productName: string, showProgressStatus: boolean, uploadStatus: boolean, deleteStatus: boolean, totalFilesDeleted: number) {
    // console.log('Setting progress status for product:', productName);
    this.productProgressStatus[productName] = { showProgressStatus, uploadStatus, deleteStatus, totalFilesDeleted };
    // console.log('Updated productProgressStatus:', this.productProgressStatus);
  }

  // Method to get the count of documents and store it in the dictionary
  getNoOfDocs(BuName: string, productName: string): Observable<number> {
    const apiUrl = `${this.baseUrl}/count_files`; // Use your actual endpoint for counting
    const payload = { product_name: productName };
    return this.http.post<any>(apiUrl, payload).pipe(
      map((response: { count: number; }) => {
        this.documentCounts[productName] = response.count; // Store the count in the dictionary
        return response.count; // Return the count
      })
    );
  }

  // Method to get the stored document counts
  getDocumentCounts(): { [key: string]: number } {
    return this.documentCounts;
  }

  // Service method to get the last report generation date for a product
  fetchLastReportDate(productName: string): Observable<string> {
    const apiUrl = `${this.baseUrl}/latest_report`; // Use your actual endpoint for fetching the last report date
    const payload = { product_name: productName };

    return this.http.post<any>(apiUrl, payload).pipe(
      map((response: { latest_report: string }) => {
        const lastReportDate = response.latest_report;
        this.lastReportGenerated[productName] = lastReportDate; // Store the date in the dictionary
        return lastReportDate; // Return the last report date
      }),
      catchError((error) => {
        // console.error(`Error fetching report for ${productName}:`, error);
        return of('NA'); // Return 'NA' in case of error
      })
    );
  }

  // Method to retrieve all cached last report dates
  getLastReportGenerated(): { [key: string]: string } {
    return this.lastReportGenerated;
  }

  getListOfFilesNames(buName: string, productName: string, request_flag: string): Observable<any> {
    const apiUrl = this.baseUrl + '/fetch'
    const payload = { product_name: productName, request_flag: request_flag }
    return this.http.post<any>(apiUrl, payload);
  }

  deleteFiles(productName: string, filenames: string[]): Observable<any> {
    const apiUrl = this.baseUrl + '/delete'
    let product_name = productName.toLowerCase()
    const payload = { product_name: product_name, file_names: filenames }
    return this.http.post<any>(apiUrl, payload);
  }

  downloadFiles(productName: string, filenames: string[]): Observable<Blob> {
    const apiUrl = this.baseUrl + '/download_selected';
    const payload = { product_name: productName, selected_files: filenames };

    return this.http.post(apiUrl, payload, { responseType: 'blob' });
  }

  downloadReport( nameOfUser: string,  userRole: string, buName: string, productName: string, filename: string): Observable<Blob> {
    const apiUrl = this.baseUrl + '/download_report';
    const payload = { username: nameOfUser, role: userRole,  business_unit : buName,  product_name: productName, file_name: filename };

    return this.http.post(apiUrl, payload, { responseType: 'blob' }).pipe(
      catchError(error => {
        console.error('Error downloading the report:', error);
        return throwError(() => error);
      })
    );
  }

  deleteReport(productName: string, filename: string): Observable<Blob> {
    const apiUrl = this.baseUrl + '/delete_report';
    let product_name = productName.toLowerCase()
    const payload = { product_name: product_name, file_name: filename };

    return this.http.post<any>(apiUrl, payload);
  }

  fetchExternalFiles(productName: string, sourceType: string): Observable<any> {
    const apiUrl = this.baseUrl + '/fetch_external';
    const payload = { product_name: productName.toLowerCase(), source_type: sourceType };
    return this.http.post<any>(apiUrl, payload);  // Calling the Flask endpoint
  }

  deleteExternalFiles(productName: string, source_type: string, filenames: string[]): Observable<any> {
    const apiUrl = this.baseUrl + '/delete_external'
    let product_name = productName.toLowerCase()
    const payload = { product_name: product_name, file_names: filenames, source_type: source_type }
    return this.http.post<any>(apiUrl, payload);
  }

}
