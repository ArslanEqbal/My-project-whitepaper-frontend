import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject,catchError,Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  sliderDisabled: boolean = false;
  private baseUrl = environment.apiUrl;
  private chatMessagesSubject = new BehaviorSubject<any[]>([]);
  chatMessages$ = this.chatMessagesSubject.asObservable();

  constructor(private http: HttpClient) { }

  chat(payload: { question: string, messageId:string, username:string,temperature:any,conversationalId: any,
    bu_name: string, product_name:string   }) {
    // const payload = { bu_name: BuName, product_name: productName }
    
    const apiUrl = `${this.baseUrl}/chat`
    return this.http.post(apiUrl, payload).pipe(
      catchError(error => {
          console.error('Error during chat request:', error);
          // Handle error here if necessary, or return an observable that emits a default structure
          return of({
              response: "<p>An error occurred. Please try again.</p>",
              reference: [],
              followup_questions: [],
              filename: [],
              page_number: [],
              image_links : ""
          });
      })
  );
}

  fetch_chat_options(product_name: string): Observable<string[]> {
    const payload = { product_name };
    const apiUrl = `${this.baseUrl}/chat-options`;
    return this.http.post<string[]>(apiUrl, payload);
  }

  clearChatMessages() {
    this.chatMessagesSubject.next([]);
  }

  new_conversation(){
    const apiUrl = `${this.baseUrl}/new_conversation`
    return this.http.get(apiUrl);
  }

  // uploadFile(formData: FormData): Observable<any> {
  //   const apiUrl = `${this.baseUrl}/upload`;
  //   console.log(formData)
  //   return this.http.post(apiUrl, formData);
  // }

  private handleError(error: HttpErrorResponse) {
    console.error('Upload failed:', error);
    return throwError('File upload failed; please try again later.');
  }

  
}
