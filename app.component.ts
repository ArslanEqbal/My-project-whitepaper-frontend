import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'eg-angular';
  showNavbar: boolean = false;

  constructor(private router: Router, private msalService: MsalService, private authService : AuthService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showNavbar = event.urlAfterRedirects !== '/login';
      }
    });
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/login']);
    }
  }
  
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (!confirm('Are you sure you want to leave?')) {
      $event.returnValue = true;
      localStorage.removeItem('username');
    }
  }

}