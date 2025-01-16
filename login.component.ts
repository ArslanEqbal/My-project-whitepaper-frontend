import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginForm!: FormGroup;
  errorMessage = false;

  constructor(private authService: AuthService, private msalService: MsalService, private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }


  async loginSSO() {
    try {
      await this.msalService.instance.initialize();
      this.msalService.loginPopup({
        scopes: ['user.read', 'GroupMember.Read.All']
      }).subscribe({
        next: (result) => {
          const userPrincipalName = result.account.username;
          let userName = result.account.name ? result.account.name : '';
          this.authService.fetchUserGroups(userPrincipalName).subscribe(userInfo => {
            this.authService.setUserRole(userInfo.role);
            this.authService.setUserBU(userInfo.bu);
            this.authService.setUserProduct(userInfo.product);

            if (userName != '') {
              let usernameWithFirstName = userInfo.username + " " + userName.split(' ')[0]
              this.authService.setUsername(usernameWithFirstName);
              this.authService.setNameOfUser(userName);
            }
            else {
              console.error('Error fetching username');
              alert("Error fetching user details")
              this.router.navigate(['/login']);
            }

            this.router.navigate(['/home']);
          }, error => {
            console.error('Error fetching user groups:', error);
          });
        },
        error: (error) => {
          console.error('Error during SSO login:', error);
        }
      });
    } catch (error) {
      // console.error('Error initializing MSAL instance:', error);
    }
  }

  login() {
    this.authService.login(this.loginForm.value.username, this.loginForm.value.password)
      .subscribe(
        (isAuthenticated: any) => {
          if (isAuthenticated) {
            localStorage.setItem('username', this.loginForm.value.username);
            this.router.navigate(['/home']);
          } else {
            this.errorMessage = true;
            this.loginForm.reset();
          }
        },
        error => {
          // console.error('Error during login:', error);
          this.errorMessage = true;
          this.loginForm.reset();
        }
      );
  }
}
