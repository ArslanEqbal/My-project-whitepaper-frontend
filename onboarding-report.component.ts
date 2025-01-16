import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SharedService } from '../services/shared.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DocumentsService } from '../services/documents.service';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-onboarding-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding-report.component.html',
  styleUrl: './onboarding-report.component.css'
})
export class OnboardingReportComponent {

  role: string = '';
  nameOfUser: string = '';
  BuName: string = '';
  productName: string = '';
  buReportValues: any[] = [];

  documentNames: string[] = [];
  uploadedDate = [];

  isAdmin: boolean = false;
  isUser: boolean = false;

  buList: string[] = [];
  products: string[] = [];
  selectedBU: string = '';
  selectedProduct: string = '';
  isSearchClicked: boolean = false;
  loading: boolean = true;

  sortDirection: string = 'desc'; // 'asc' or 'desc' for sorting order
  sortField: string = ''; // 'fileName' or 'uploadDate' for the field to sort

  isDownloadClicked: boolean = false;
  downloadingDocument: string | null = null; // Track currently downloading document


  constructor(
    private authService: AuthService,
    private sharedService: SharedService,
    private http: HttpClient,
    private router: Router,
    private documentsService: DocumentsService) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.nameOfUser = this.authService.getNameOfUser();
    this.isUser = this.role === 'user';
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();
    this.getProductList();
    this.getListOfFiles();
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buList = Object.keys(data);
    });
  }

  // Function to load products based on selected BU
  loadProductsForSelectedBU(selectedBU: string) {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
  }

  getBuName() {
    this.BuName = this.sharedService.getBuName();
    this.selectedBU = this.BuName ? this.BuName : "";
    this.loadProductsForSelectedBU(this.selectedBU);
  }

  getProductName() {
    this.productName = this.sharedService.getProductName();
    this.selectedProduct = this.productName ? this.productName : "";
  }

  onBUChange(event: any) {
    const selectedBU = event.target.value;
    this.selectedBU = selectedBU;
    this.sharedService.setSelectedBuName(this.selectedBU)
    this.sharedService.setBuName(this.selectedBU)
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
    this.selectedProduct = ""
  }

  onProductChange(event: any) {
    const selectedProduct = event.target.value;
    this.selectedProduct = selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
    this.sharedService.setProductName(this.selectedProduct)
    this.productName = this.selectedProduct
    this.getListOfFiles();
  }

  downloadReport(documentName: string) {
    this.downloadingDocument = documentName
    this.isDownloadClicked = true;

    this.documentsService.downloadReport(this.nameOfUser, this.role, this.BuName, this.productName, documentName).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      this.isDownloadClicked = false; // Reset here after successful download
      this.downloadingDocument = null;
    }, error => {
      console.error('Error downloading report:', error);
      this.downloadingDocument = null;
      this.isDownloadClicked = false; // Reset on error as well
    });
  }


  deleteReport(documentName: string) {
    this.loading = true;
    // Confirm if the user really wants to delete the report
    if (confirm(`Are you sure you want to delete the report: ${documentName}?`)) {

      // Call your backend service to delete the report
      this.documentsService.deleteReport(this.productName, documentName).subscribe(
        (response: any) => {
          // Success response
          alert(response.message);  // Display success message to the user
          this.getListOfFiles();    // Refresh the document list after deletion
        },
        (error: any) => {
          // Handle error responses here
          console.error('Error deleting report:', error);

          // Display a user-friendly error message
          if (error.status === 404) {
            alert('Report not found. It may have been deleted already.');
          } else if (error.status === 500) {
            alert('An error occurred while deleting the report. Please try again later.');
          } else {
            alert('Unexpected error occurred. Please contact support.');
          }
        }
      );
    }
  }


  getListOfFiles() {
    this.loading = true;
    this.documentsService.getListOfFilesNames(this.selectedBU, this.selectedProduct, 'output_report').subscribe(response => {
      this.documentNames = response.map((element: { doc_name: string; creation_date: any }) => element.doc_name)
      this.uploadedDate = response.map((element: { doc_name: string; creation_date: any }) =>
        this.formatDate(element.creation_date)
      );
      this.isSearchClicked = true;
      this.loading = false;

      this.sortDocumentsByUploadDate(); // Sort by uploaded date in descending order
      this.loading = false;

    }, error => {
      this.isSearchClicked = true;
      console.error('Error feching files:', error);
      this.loading = false;

    });
  }

  sortDocumentsByUploadDate() {
    const sortedArray = this.uploadedDate
      .map((date, index) => ({ date, name: this.documentNames[index] }))
      .sort((a, b) => {
        const dateA = this.convertToDate(a.date);
        const dateB = this.convertToDate(b.date);

        // Sort in descending order (most recent first)
        return dateB.getTime() - dateA.getTime();
      });

    // Update document names and dates after sorting
    this.uploadedDate = sortedArray.map(item => item.date);
    this.documentNames = sortedArray.map(item => item.name);
  }


  convertToDate(dateString: string): Date {
    // Split the date and time parts
    const parts = dateString.split(' ');

    const day = parts[0];
    const month = parts[1]; // e.g., 'Sept'
    const year = parts[2];

    const timePart = parts[3]

    // Split the time into hour and minute
    const [hour, minute] = timePart.split(':');

    // Define month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.indexOf(month); // Get the month index

    // Validate month index
    if (monthIndex === -1) {
      throw new Error(`Invalid month: ${month}`);
    }

    // Create a new Date object
    const dateObj = new Date(+year, monthIndex, +day, +hour, +minute);

    return dateObj;
  }


  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return date.toLocaleString('en-GB', options).replace(',', ''); // Adjust locale as needed
  }


  navigateToHome() {
    this.router.navigate(['/home'])
  }

}
