import { Component, Output, ViewChild, ElementRef, EventEmitter, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SharedService } from '../services/shared.service';
import { UploadService } from '../services/upload.service';
import { DocumentsService } from '../services/documents.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})


export class UploadComponent   {
  size_error: string = '';

  constructor(
    private sharedService: SharedService,
    private uploadService: UploadService,
    private authService: AuthService,
    private http: HttpClient,
    private documentsService: DocumentsService,
    private router: Router) { }

  @Input() isDocumentsComponent: boolean = false;

  @Output() close = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef;

  BuName: string = '';
  productName: string = '';

  selectedFiles: File[] = [];
  buList: string[] = [];
  products: string[] = [];
  selectedBU: string = '';
  selectedProduct: string = '';
  showProgressStatus: boolean = false;
  uploadStatus: boolean = false;

  uploadMessage: string | null = null; // Message to display after upload
  private uploadedFilesSet = new Set<string>(); // Track unique files
  uploadCompleted: boolean = false; // Track upload completion status

  isUploading: boolean = false; // Track uploading state

  errorMessage: string | null = null; // Add this property to handle error messages
  pii_confirm: boolean = false;


  uploadedFiles: File[] = [];
  fileNamesToDisplay: string[] = [];
  temporaryFileNames: any[] = [];

  username: string = '';

  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef

  ngOnInit() {
    this.username = this.authService.getUsername();
    this.getBuName();
    this.getProductName();
    this.getProductList()
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      container.scroll({
        top: container.scrollHeight,
        left: 0,
        behavior: 'smooth'
      });
    }
  }

  // Function to load products based on selected BU
  loadProductsForSelectedBU(selectedBU: string) {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
  }

  
  onPIIChange(event: any) {
    this.pii_confirm = event.target.checked;
  }


  getBuName() {
    this.BuName = this.sharedService.getBuName();
    this.selectedBU = this.BuName? this.BuName : "";
    this.loadProductsForSelectedBU(this.selectedBU);
  }

  getProductName() {
    this.productName = this.sharedService.getProductName() ? this.sharedService.getProductName() : '';
    this.selectedProduct = this.productName ? this.productName : "";
  }

  handleFileInput(event: Event) {
    let input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(input.files);
    }
  }

  processFiles(files: FileList) {
    this.errorMessage = null; // Reset error message
    const maxFileSize = 100 * 1024 * 1024; // 100 MB in bytes
    const maxFileCount = 100;
  
    // Calculate the current total size of selected files
    const currentTotalSize = this.selectedFiles.reduce((total, file) => total + file.size, 0);
  
    Array.from(files).forEach((file) => {
      const newTotalSize = currentTotalSize + this.uploadedFiles.reduce((total, f) => total + f.size, 0) + file.size;
  
      if (file.size === 0) {
        this.errorMessage = `File "${file.name}" is empty and cannot be uploaded.`;
      } else if (file.size > maxFileSize) {
        this.size_error = `File "${file.name}" exceeds the maximum allowed size of 100 MB.`;
      } else if (newTotalSize > maxFileSize) {
        this.size_error = `Total file size exceeds the 100 MB limit. Please remove some files.`;
      } else if (this.selectedFiles.length + this.uploadedFiles.length >= maxFileCount) {
        this.size_error = `File upload limit exceeded. You can only upload a maximum of ${maxFileCount} files.`;
      } else if (!this.isFileTypeAllowed(file.type)) {
        this.errorMessage = `File "${file.name}" is of an unsupported file type.`;
      } else if (this.uploadedFilesSet.has(file.name)) {
        this.errorMessage = `File "${file.name}" is a duplicate and will not be uploaded again.`;
      } else {
        this.uploadedFiles.push(file);
        this.temporaryFileNames.push(file.name);
        this.uploadedFilesSet.add(file.name);
        this.selectedFiles.push(file); // Directly add valid files
      }
  
      if (this.errorMessage) {
        setTimeout(() => (this.errorMessage = ''), 3000);
      }
      if (this.size_error) {
        setTimeout(() => (this.size_error = ''), 3000);
      }
    });
  
    if (this.uploadedFiles.length === 0 && !this.errorMessage) {
      this.errorMessage = 'No valid files were selected for upload.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }
  
  isFileTypeAllowed(fileType: string): boolean {
    // Allowed file types including .pdf, .docx, .pptx, .md, .txt, and .html
    const allowedTypes = [
      'application/pdf', // .pdf
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/markdown', // .md
      'text/plain', // .txt
      'text/html' // .html
    ];

    return allowedTypes.includes(fileType);
  }



  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buList = Object.keys(data);
    });
  }

  onBUChange(event: any) {
    const selectedBU = event.target.value;
    this.selectedBU = selectedBU;
    this.BuName = this.selectedBU
    this.sharedService.setSelectedBuName(this.selectedBU)
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
    this.selectedProduct = ""
  }

  onProductChange(event: any) {
    const selectedProduct = event.target.value;
    this.selectedProduct = selectedProduct;
    this.productName = this.selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
  }

  uploadDocuments() {
    this.isUploading = true;
    this.errorMessage = null; // Reset error message before upload
    if (this.selectedFiles.length === 0) {
      return;
    }

    const uniqueFiles = Array.from(this.uploadedFilesSet);
    this.uploadService.uploadFiles(this.selectedFiles, this.selectedBU, this.selectedProduct).subscribe(
      (response) => {
        this.showProgressStatus = true;
        this.uploadStatus = true;

        const uniqueCount = uniqueFiles.length;
        this.uploadMessage = uniqueCount === 1
          ? `${uniqueCount} document has been successfully uploaded. It will now take some time to process it.`
          : `${uniqueCount} documents have been successfully uploaded. It will now take some time to process them.`;

        this.showProgressStatus = true;
        this.uploadStatus = true;
        this.isUploading = false;
        this.uploadCompleted = true;

        const status = this.documentsService.getProgressStatusForProduct(this.productName);

        if (status) {
          let deleteStatus = status.deleteStatus;
          let totalDeletedFiles = status.totalFilesDeleted;
          this.documentsService.setProgressStatusForProduct(this.productName, this.showProgressStatus, this.uploadStatus, deleteStatus, totalDeletedFiles);
        }
        else {
          this.documentsService.setProgressStatusForProduct(this.productName, this.showProgressStatus, this.uploadStatus, false, 0);
        }

        this.uploadService.saveProgressStatusJSON(this.productName, this.username).subscribe(response => {
          // console.log(response)
        }
        );


        this.documentsService.getNoOfDocs(this.BuName, this.productName);

        // Auto close the popup after 5 seconds
        setTimeout(() => {
          this.closePopup();
        }, 5000);
      },
      (error) => {
        // console.error('Upload failed', error);
        this.isUploading = false; // Reset uploading state
        this.errorMessage = 'Error uploading files. Please contact administrator.'; // Set error message
        alert('Error uploading files. Please contact administrator.'); // Alert to the user
      }
    );
  }

  closePopup() {
    this.uploadMessage = null; // Reset message when closing
    this.uploadedFilesSet.clear(); // Clear the set of uploaded files
    this.selectedFiles = []; // Clear selected files
    this.close.emit();
  }

  removeFile(file: File) {
    // Remove the file from the selectedFiles array
    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
    // Also remove from the uploadedFilesSet to allow re-uploading if needed
    this.uploadedFilesSet.delete(file.name);
  }

}
