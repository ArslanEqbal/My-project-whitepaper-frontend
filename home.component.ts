import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private sharedService: SharedService,
    private router: Router) { }

  role: string = '';
  bu: string = '';
  product: string = '';

  isUser: boolean = false;
  isAdmin: boolean = false;
  

  buList: string[] = [];
  products: string[] = [];
  selectedBU: string = '';
  selectedProduct: string = '';


  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.isUser = this.role === 'user';
    this.isAdmin = this.role === 'admin';

    if (!this.role) {
      this.router.navigate(['/login']);
      console.error("Unknown role.");
      alert("Unknown Credentials. Please log in with authorised credentials to access the application")
    }

    this.getBuName();
    this.getProductName();


    if (this.isUser || this.isAdmin) {
      this.selectedBU = this.bu
      this.selectedProduct = this.product
    }

    this.getProductList();
  }

  // Function to load products based on selected BU
  loadProductsForSelectedBU(selectedBU: string) {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
  }

  getBuName() {
    this.bu = this.authService.getUserBU();
    this.selectedBU = this.bu? this.bu : "";
    this.loadProductsForSelectedBU(this.selectedBU);
    this.sharedService.setSelectedBuName(this.selectedBU)
    this.sharedService.setBuName(this.selectedBU)
  }

  getProductName() {
    this.product = this.authService.getUserProduct();
    this.selectedProduct = this.product ? this.product : "";
    this.sharedService.setSelectedProductName(this.selectedProduct)
    this.sharedService.setProductName(this.selectedProduct)
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buList = Object.keys(data);
    });
  }

  onBUChange(event: any) {
    const selectedBU = event.target.value;
    this.selectedBU = selectedBU;
    this.sharedService.setSelectedBuName(this.selectedBU)
    this.sharedService.setBuName(this.selectedBU)
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
    this.selectedProduct = ''
  }

  onProductChange(event: any) {
    const selectedProduct = event.target.value;
    this.selectedProduct = selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
    this.sharedService.setProductName(this.selectedProduct)
  }

  goToDashboard() {
      let actualRole = this.role.toLowerCase()
      if (actualRole === "superadmin") {
        this.router.navigate(['/bu']);
      } else if (actualRole === "admin") {
        let actualBU = this.sharedService.getBuName();
        if (actualBU) {
          this.router.navigate(['/product']);
        } else if (this.selectedBU) {
          this.sharedService.setBuName(this.selectedBU);
          this.router.navigate(['/product']);
        } else {
          alert("Select a BU to continue")
        }
      }
    }
  

  goToChatbot() {
    this.router.navigate(['/chat']);
  }

  goToOnboarding() {
    this.router.navigate(['/onboarding-report']);
  }

  goToAnalytics() {
    this.router.navigate(['/usage-analytics']);
  }

  goToEvaluation() {
    this.router.navigate(['/evaluation-table']);
  }

}
