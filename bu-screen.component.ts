import { Component } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { Router } from '@angular/router';
import { UploadComponent } from '../../upload/upload.component';
import { CommonModule } from '@angular/common';
import { UploadExternalDependenciesComponent } from '../../upload-external-dependencies/upload-external-dependencies.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bu-screen',
  standalone: true,
  imports: [UploadComponent,CommonModule, UploadExternalDependenciesComponent],
  templateUrl: './bu-screen.component.html',
  styleUrl: './bu-screen.component.css'
})
export class BuScreenComponent {

  showPopup: boolean = false;
  showExternalDepedencyPopup: boolean = false;
  isDropdownOpen = false;

  buList: string[] = [];
  buttonColors: string[] = ['#9FBBC6', '#395F6F', '#558FA3',  '#B9D1DB']; // Define button colors here


  constructor(private sharedService : SharedService, private router: Router, private http: HttpClient){}
  
  ngOnInit(): void {
    this.getProductList(); // Fetch the product list on component initialization
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buList = Object.keys(data);
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  navigateToProducts(BuName:string){
    this.sharedService.setBuName(BuName)
    this.router.navigate(['/product']);
  }

  navigateToHome(){
    this.router.navigate(['/home'])
  }

  uploadFiles(){
    this.isDropdownOpen = !this.isDropdownOpen;
    this.showPopup = true;
  }

  openExternalResources(resourceType: string) {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.sharedService.setResourceType(resourceType)
    this.showExternalDepedencyPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.showExternalDepedencyPopup = false;
  }

}
