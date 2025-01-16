import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { SharedService } from './shared.service';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  isAuthenticated = false;
  username: string = '';
  role: string = '';
  bu: string = '';
  product: string = '';
  nameOfUser: string = '';

  private userSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private msalService: MsalService, private sharedService: SharedService) { }

  private baseUrl = environment.apiUrl;

  ngOnInit() {
    this.isAuthenticated = false;
  }

  setUser(user: any) {
    this.userSubject.next(user);
  }

  getUser(): Observable<any> {
    return this.userSubject.asObservable();
  }

  fetchUserGroups(userPrincipalName: string): Observable<{ role: string, bu: string, product: string, username: string }> {
    const apiUrl = `${this.baseUrl}/api/user-groups`;
    const payload = { userPrincipalName: userPrincipalName };

    return this.http.post<{ role: string, bu: string, product: string, username: string }>(apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      console.error('An error occurred:', error.error.message);
    } else {
      // Backend returned an unsuccessful response code
      console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
    }
    return throwError('Something bad happened; please try again later.');
  }
  
  getUserRole(): string {
    return this.role
  }
  setUserRole(role: string) {
    this.role = role
  }

  getUserBU(): string {
    return this.bu
  }

  getUserProduct(): string {
    return this.product
  }

  setUserBU(bu: string) {
    this.bu = bu
  }

  setUserProduct(product: string) {
    this.product = product
  }

  getUsername(): string {
    return this.username
  }

  setUsername(username: string) {
    this.username = username
  }

  getNameOfUser(): string {
    return this.nameOfUser
  }

  setNameOfUser(nameOfUser: string) {
    this.nameOfUser = nameOfUser
  }


  login(username: string, password: string): Observable<boolean> {
    const apiUrl = `${this.baseUrl}/login`;

    const payload = { username, password };

    return this.http.post(apiUrl, payload)
      .pipe(
        map((response: any) => {

          // Check if response is valid
          if (response.message === "success") {
            this.isAuthenticated = true;
            this.setUsername(username);

            // Use optional chaining to avoid errors
            this.role = response.credential.role || 'user';
            this.bu = response.credential.bu || '';
            this.product = response.credential.product || '';

            this.sharedService.setBuName(this.bu)
            this.sharedService.setProductName(this.product)

            return true; // Login success
          } else {
            this.isAuthenticated = false;
            return false; // Login failed
          }
        }),
        catchError(error => {
          this.isAuthenticated = false;
          return throwError('Login Failed');
        })
      );
  }



  logout(): void {
    this.isAuthenticated = false;
  }

  getAuthStatus(): boolean {
    return this.isAuthenticated;
  }

}
