import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

interface ProductResources {
  hasInternalResources: boolean;
  hasJiraResources: boolean;
  hasConfluenceResources: boolean;
  hasWebsiteResources: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UploadExternalService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;
  
  private functionAppName = environment.AZURE_FUNCTION_APP_NAME;
  private triggerName = environment.AZURE_FTN_JIRACONF_TRIGGER_NAME;
  private key = environment.AZURE_HTTP_FUNCTION_KEY;
  private appFuncURL = `https://${this.functionAppName}.azurewebsites.net/api/${this.triggerName}`

  private stillExtractingProductList: { [key: string]: string } = {};
  private extractionStatusSubject = new BehaviorSubject<{ [key: string]: string }>({});

  // Observable for components to subscribe to
  extractionStatus$ = this.extractionStatusSubject.asObservable();

  getProductExtractionStatus(productName: string): string {
    return this.stillExtractingProductList[productName] || "false";
  }

  setProductExtractionStatus(productName: string, extractionStatus: string) {
    this.stillExtractingProductList[productName] = extractionStatus;

    // Emit the latest status to subscribers
    this.extractionStatusSubject.next(this.stillExtractingProductList);

    if (!extractionStatus) {
      setTimeout(() => {
        delete this.stillExtractingProductList[productName];
        // Emit updated list after removal
        this.extractionStatusSubject.next(this.stillExtractingProductList);
      }, 0);
    }
  }

  checkResourceStatus(productName: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/check_resource_status`;
    const payload = { product_name: productName };
    return this.http.post(apiUrl, payload);
  }


  loadJiraProjects(): Observable<any> {
    const apiUrl = `${this.baseUrl}/jira_projects_list`;
    return this.http.get(apiUrl);
  }

  loadJiraBoards(selectedProject: string): Observable<any> {
    const apiUrl = `${this.baseUrl}/jira_boards_list`;
    const payload = { selectedProject: selectedProject }
    return this.http.post(apiUrl, payload);
  }

  loadConfluenceSpaces(): Observable<any> {
    const apiUrl = `${this.baseUrl}/confluence_space`;
    return this.http.get(apiUrl);
  }

  addExternalJiraResource(resource_type: string, product_name: string, selectedBoardId: any): Observable<any> {
    const apiUrl = `${this.appFuncURL}?code=${this.key}`;
    const payload = {
      content_type: resource_type,
      product_name: product_name,
      board_id: selectedBoardId,
      start: 0 // Initialize the starting point for ticket extraction
    };
    console.log(payload, "✨✨ jira payload")
    console.log(apiUrl, "✨✨ jira api")

    return new Observable((observer) => {
          console.log("✨✨ to get jira response")
      const processTickets = () => {
        this.http.post(apiUrl, payload, { responseType: 'text' }).subscribe({
          next: (response) => {
            console.log(response, "response")
            const jsonResponse = JSON.parse(response); // Parse response into JSON
            let extractedTickets = jsonResponse?.tickets_extracted;
            if(!jsonResponse?.tickets_extracted && jsonResponse?.tickets_extracted != 0) {
              extractedTickets = -1
            }
            console.log("extractedTickets", extractedTickets)

            if (extractedTickets > 0) {
              // Update `start` for the next batch and continue the process
              payload.start += extractedTickets;
              console.log("payload.start", payload.start)

              processTickets();
            } else if(extractedTickets == -1) {
              console.error("Extraction failed. Try again");
              observer.error("Extraction failed. Try again"); // Emit error to the observer
            }
             else {
              // All tickets processed, complete the observable
              observer.next(`Total tickets processed: ${payload.start}`);
              console.log(`Total tickets processed: ${payload.start}`)

              observer.complete();
            }
          },
          error: (error) => {
            // Handle errors and notify the observer
            observer.error(error);
          }
        });
      };

      // Start the ticket processing
      processTickets();
    });
  }

  addExternalConfluenceResource(resource_type: string, product_name: string, selectedSpaceKey: any): Observable<any> {
    const apiUrl = `${this.appFuncURL}`; // Starting URL without query parameters

    // Construct the query parameters
    const params = new URLSearchParams();
    params.append('code', this.key); // Add the code parameter
    params.append('content_type', resource_type);
    params.append('product_name', product_name);
    params.append('space_key', selectedSpaceKey);

    // Combine the base URL with parameters
    const fullUrl = `${apiUrl}?${params.toString()}`;

    console.log(apiUrl, "✨✨ conf func app link ")
    console.log(fullUrl, "✨✨ conf full url")
    // Send the POST request with no body
    return this.http.get(fullUrl, { responseType: 'text' });
  }

  addExternalWebsiteResource(product_name: string, websiteUrl: string, depth: number, width: number): Observable<any> {
    const apiUrl = `${this.baseUrl}/add_website2db`;
    const payload = {
      product_name: product_name,
      url: websiteUrl,
      depth: depth,
      width: width
    }
    return this.http.post(apiUrl, payload);
  }

}
