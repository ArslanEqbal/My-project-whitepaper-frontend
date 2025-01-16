import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  username: string = ''

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.getUsername();
  }

  getUsername() {
    this.username = this.authService.getUsername();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);

  }

}
