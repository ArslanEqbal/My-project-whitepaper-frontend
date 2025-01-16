import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';  // Import MSAL service
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private msalService: MsalService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
    // Check if user is authenticated
    // const isAuthenticated = this.msalService.instance.getActiveAccount() != null;

    // if (isAuthenticated) {
      return true;  // Allow access if authenticated
    // } else {
    //   // If not authenticated, redirect to login
    //   this.router.navigate(['/login']);
    //   return false;
    // }
  }
}
