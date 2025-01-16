import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SharedService } from '../../services/shared.service';
import { HttpClient } from '@angular/common/http';
import { EvaluationService } from '../../services/evaluation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-evaluation.component.html',
  styleUrl: './add-evaluation.component.css'
})
export class AddEvaluationComponent {

  @ViewChild('fileInput') fileInput!: ElementRef;

  @Output() close = new EventEmitter<void>();

  BuName: string = '';
  productName: string = '';
  buReportValues: any[] = [];
  buList: string[] = [];
  products: string[] = [];
  selectedUsecase: string = '';
  selectedBU: string = '';
  selectedProduct: string = '';

  uniqueName: string = '';
  uniqueNameMessage: string = '';
  isUniqueName: boolean = true;
  uniqueNameError = '';
  pii_confirm: boolean = false;
  isProceeding = false;     // Spinner state for proceeding

  role: string = '';
  isAdmin = false;
  current_step = 1;
  fileToUpload: File | null = null;
  errorMessage: string | null = null; // Add this property to handle error messages

  templateDownloaded = false;
  isInfoPopupVisible: boolean= false;

  constructor(
    private sharedService: SharedService,
    private http: HttpClient,
    private authService: AuthService,
    private evaluationService: EvaluationService,
    private router: Router) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();
    this.getUsecase();
    this.getProductList();
  }

  getUsecase() {
    const selectedUsecase = this.sharedService.getSelectedUsecase();
    this.selectedUsecase = selectedUsecase ? selectedUsecase : "";
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
  }

  onUsecaseChange(event: any) {
    const selectedUsecase = event.target.value;
    this.selectedUsecase = selectedUsecase;
    this.sharedService.setSelectedUsecase(this.selectedUsecase)
    this.templateDownloaded = false
  }

  downloadTemplate() {
    if (!this.selectedUsecase) {
      alert('Please select a use case before downloading the template.');
      return;
    }

    this.evaluationService.downloadTemplate(this.selectedUsecase).subscribe(
      response => {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.selectedUsecase}_template.csv`;
        link.click();

        this.templateDownloaded = true
        window.URL.revokeObjectURL(url);
      },
      error => {
        console.error('Error downloading template:', error);
        alert('Failed to download the template. Please try again.');
      }
    );
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  handleFileInput(event: Event) {
    let input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(input.files);
    }
  }

  processFiles(files: FileList) {
    let uploadedFiles = [];

    Array.from(files).forEach((file) => {
      // Check for allowed file types
      if (this.isFileTypeAllowed(file.type)) {
        uploadedFiles.push(file);
        this.fileToUpload = file;
      }
    });

    if (uploadedFiles.length === 0) {
      this.errorMessage = 'Invalid file type. Only .csv file is allowed.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  isFileTypeAllowed(fileType: string): boolean {
    // Allowed file types including .csv
    const allowedTypes = [
      'text/csv'// .csv
    ];
    return allowedTypes.includes(fileType);
  }

  removeFile() {
    this.fileToUpload = null;
    this.errorMessage = ''
    this.isProceeding = false;
  }

  uploadFile() {
    this.isProceeding = true;
    this.errorMessage = ''; // Clear any previous error message
    this.sharedService.setEvaluatingAppVersion(this.uniqueName)

    if (!this.fileToUpload || !this.uniqueName || !this.selectedProduct || !this.selectedUsecase) {
      this.errorMessage = 'Please fill in all the details and select a valid file.';
      this.isProceeding = false;
      return;
    }

    let username = this.authService.getUsername() || "deloitte";

    const formData = new FormData();
    formData.append('file', this.fileToUpload);
    formData.append('product_name', this.selectedProduct);
    formData.append('app_version', this.uniqueName);
    formData.append('usecase', this.selectedUsecase);
    formData.append('username', username);

    this.evaluationService.uploadEvalFile(formData).subscribe(
      response => {
        this.sharedService.setEvaluationStatus(this.selectedProduct, this.selectedUsecase, false);

        console.log(`${response.filepath} uploaded successfully.`);
        
        // Proceed with the next steps
        this.evaluationService.addEvaluationTask(username, this.selectedProduct.toLowerCase(), this.selectedUsecase, response.filepath).subscribe(
          response2 => {
            console.log('Azure evaluation function response:', response2);
            this.sharedService.setEvaluationStatus(this.selectedProduct, this.selectedUsecase, true);
            this.sharedService.setEvaluatingAppVersion(this.uniqueName)
            this.isProceeding = false;
            this.closePopup();
          },
          error => {
            this.isProceeding = false;
            this.sharedService.setEvaluationStatus(this.selectedProduct, this.selectedUsecase, true);
            console.error('Error calling Azure evaluation function:', error);
            this.errorMessage = 'Failed to start evaluation. Please try again.';
          }
        );
        this.isProceeding = false;
        this.closePopup();
      },
      error => {
        this.isProceeding = false;
        this.sharedService.setEvaluationStatus(this.selectedProduct, this.selectedUsecase, true);
        console.error('Error uploading file:', error);
        this.errorMessage = this.mapErrorMessage(error);
      }
    );
  }

  mapErrorMessage(error: any): string {
    if (!error || !error.error || !error.error.response) {
      return "An unexpected error occurred. Please try again.";
    }

    const errorMessage = error.error.response;

    // Map specific backend messages to user-friendly ones
    if (errorMessage.includes('Empty file.')) {
      return 'The uploaded file is empty. Please ensure it has data and try again.';
    }
    else if (errorMessage.includes("null")) {
      return "Empty fields found. Please upload a file with valid data.";
    }
    else if ((errorMessage.toLowerCase().includes("uploaded file is not in alignment with the template") || errorMessage.toLowerCase().includes("provided evaluation file should have the following columns")) && this.selectedUsecase == 'qa') {
      return "Incorrect format. Kindly use the Chatbot Template.";
    }
    else if ((errorMessage.toLowerCase().includes("uploaded file is not in alignment with the template") || errorMessage.toLowerCase().includes("provided evaluation file should have the following columns")) && this.selectedUsecase == 'om') {
      return "Incorrect format. Kindly use the Onboarding Template.";
    }
    else if (errorMessage.includes("Failed to upload")) {
      return "Upload failed. Please try again.";
    }

    return errorMessage; // Fallback to the backend message if no mapping exists
  }

  closeInfoPopupOnClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.isInfoPopupVisible && !target.closest('.info-popup') && !target.closest('.info-icon')) {
      this.isInfoPopupVisible = false;
    }
  }

  // Method to check if the unique name is available
  checkUniqueName(): void {
    // Reset the error message
    this.uniqueNameError = '';
    this.uniqueNameMessage = ''

    if (!this.uniqueName) {
      this.uniqueNameMessage = '';
      this.isUniqueName = false;
      return;
    }

    this.isUniqueName = true;
    let uniqueNamePattern: RegExp = /^[A-Za-z0-9_-]+$/;

    // Check if uniqueName length is between 3 and 40
    if (this.uniqueName.length < 3 || this.uniqueName.length > 40) {
      this.uniqueNameError = 'Unique Name must be between 3 and 40 characters.';
      this.uniqueNameMessage = '';
      this.isUniqueName = false;
      return;
    }

    this.isUniqueName = true;

    // Check if uniqueName matches the allowed pattern
    if (!uniqueNamePattern.test(this.uniqueName)) {
      this.uniqueNameError = 'Name can only contain letters, numbers, hyphens, and underscores.';
      this.uniqueNameMessage = '';
      this.isUniqueName = false;
      return;
    }
    this.isUniqueName = true;

  }

  goToNextStep() {
    if (this.current_step == 1) {
      this.isProceeding = true
      // TODO: passing selectedUsecase
      this.evaluationService.checkUniqueName(this.selectedProduct, this.uniqueName, this.selectedUsecase).subscribe(
        (response: any) => {
          this.isUniqueName = response.is_unique;
          this.uniqueNameMessage = this.isUniqueName
            ? 'This name is available.'
            : 'This name is already taken. Please choose another.';
          if (this.uniqueNameMessage == "This name is available.") {
            setTimeout(() => {
              this.current_step = this.current_step + 1
              this.isProceeding = false;
            }, 2000);
          }
          else {
            this.isProceeding = false;
          }
        },
        (error) => {
          console.error('Error checking unique name:', error);
          this.uniqueNameMessage = 'Error occurred while checking. Please try again.';
          this.isUniqueName = false;
        }
      );
    }
  }

  toggleInfoPopup() {
    this.isInfoPopupVisible = !this.isInfoPopupVisible;
  }
  
  goToPreviousStep() {
    this.current_step = this.current_step - 1
    this.isProceeding = false;
    this.fileToUpload = null
  }

  closePopup(event?: MouseEvent) {
    this.router.navigate(["/evaluation-table"])
    this.close.emit();
  }

}
