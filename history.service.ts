import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {

  private baseUrl = environment.apiUrl;
  private chatMessagesSubject = new BehaviorSubject<any[]>([]);
  chatMessages$ = this.chatMessagesSubject.asObservable();

  constructor(private http: HttpClient) { }

  chatHistory(payload: { data : any }){
    const apiUrl = `${this.baseUrl}/history`
    return this.http.post(apiUrl, payload);
  }  

  updateChatHistory(payload: { data : any }){
    const apiUrl = `${this.baseUrl}/history`
    return this.http.post(apiUrl, payload);
  }  

  updateResponse(payload: { data : any }){
    const apiUrl = `${this.baseUrl}/update_history`
    return this.http.post(apiUrl, payload);
  }  

  getConversationHistory(payload: { username:string , product_name:string}) {
    const apiUrl = `${this.baseUrl}/get_data`
    return this.http.post(apiUrl, payload);
  }

  deleteConversationHistory(payload : {username: string, conversationalId:any}){
    const apiUrl = `${this.baseUrl}/delete_data`
    return this.http.post(apiUrl, payload);
  }
}
