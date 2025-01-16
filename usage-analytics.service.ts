import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsageAnalyticsService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;

  fetchUsageBoxData(buName: string, productName: string, usecase: string, timePeriod: string): Observable<any> {
    const apiUrl = this.baseUrl + '/usage_statistics'
    const payload = { bu_name: buName, product_name: productName, usecase: usecase, time_period: timePeriod }
    return this.http.post<any>(apiUrl, payload);
  }

  fetchLeftPlotData(buName: string, productName: string, usecase: string, timePeriod: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/usage_plot_stats`;
    const payload = { bu_name: buName, product_name: productName, usecase: usecase, time_period: timePeriod };
    return this.http.post<any>(apiUrl, payload);
  }

  fetchRightPlotData(buName: string, productName: string, usecase: string, timePeriod: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/usage_plot_trend`;
    const payload = { bu_name: buName, product_name: productName, usecase: usecase, time_period: timePeriod };
    return this.http.post<any>(apiUrl, payload);
  }

  // exportStatistics(buName: string, productName: string, usecase: string, timePeriod: string): Observable<Blob> {
  //   const apiUrl = `${this.baseUrl}/usage_data_export`;
  //   const payload = { bu_name: buName, product_name: productName, usecase: usecase, time_period: timePeriod };
  //   return this.http.post<Blob>(apiUrl, payload, { responseType: 'blob' as 'json' });
  // }

  // exportStatistics(bu: string, product: string, analysisType: string, timePeriod: string): Observable<Blob | any> {
  //   const apiUrl = `${this.baseUrl}/usage_data_export`;
  //   const payload = { bu_name: bu, product_name: product, usecase: analysisType, time_period: timePeriod };
  
  //   return this.http.post(apiUrl, payload, { observe: 'response', responseType: 'blob' }).pipe(
  //     map((response: HttpResponse<Blob>) => {
  //       if (response.headers.get('content-type') === 'text/csv') {
  //         return response.body; // Return Blob for CSV file
  //       }
        
  //       // Ensure that response.body is not null and convert Blob to ArrayBuffer
  //       if (response.body) {
  //         // Convert the Blob to ArrayBuffer using arrayBuffer(), which returns a Promise
  //         return from(response.body.arrayBuffer()).pipe(
  //           map((arrayBuffer: ArrayBuffer) => {
  //             // Decode the ArrayBuffer using TextDecoder
  //             return JSON.parse(new TextDecoder().decode(arrayBuffer));
  //           })
  //         );
  //       }
  
  //       // Handle the case where the body is null
  //       throw new Error('Response body is null');
  //     })
  //   );
  // }

  exportStatistics(bu: string, product: string, analysisType: string, timePeriod: string): Promise<Blob | any> {
    const apiUrl = `${this.baseUrl}/usage_data_export`;
    const payload = { bu_name: bu, product_name: product, usecase: analysisType, time_period: timePeriod };
  
    return this.http.post(apiUrl, payload, { observe: 'response', responseType: 'blob' }).toPromise().then((response: any) => {
      const contentType = response.headers.get('content-type');
      if (contentType === 'text/csv') {
        return response.body; // CSV Blob
      } else {
        const text = new TextDecoder().decode(response.body);
        return JSON.parse(text); // JSON object
      }
    });
  }
  
  
}
