import { Component, Output, ViewChild, ElementRef, EventEmitter, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SharedService } from '../services/shared.service';
import { UploadExternalService } from '../services/upload-external.service';
import { FormsModule } from '@angular/forms';
import { DocumentsService } from '../services/documents.service';
import { UploadService } from '../services/upload.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-upload-external-dependencies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-external-dependencies.component.html',
  styleUrl: './upload-external-dependencies.component.css'
})
export class UploadExternalDependenciesComponent {
  constructor(
    private sharedService: SharedService,
    private http: HttpClient,
    private documentsService: DocumentsService,
    private uploadService: UploadService,
    private authService: AuthService,
    private uploadExternalService: UploadExternalService,
    private router: Router) { }

  @Input() isDocumentsComponent: boolean = false;

  @Output() close = new EventEmitter<void>()

  BuName: string = '';
  productName: string = '';

  buList: string[] = [];
  products: string[] = [];
  selectedBU: string = '';
  selectedProduct: string = '';

  uploadCompleted: boolean = false;
  loading: boolean = false;
  isUploading: boolean = false;

  errorMessage: string | null = null;

  resourceType: string = '';
  websiteInput: string = '';

  jira_projects: any[] = [];

  list_of_boards: any[] = [];

  list_of_board_names: any[] = [];

  list_of_spaces: any[] = [];

  list_of_space_names: any[] = [];

  selectedProject: string = ''

  selectedBoard: string = ''

  selectedSpace: string = ''

  selectedBoardId !: any

  selectedSpaceKey !: any

  selectedConfluenceDocCount: number = 0
  selectedJiraTicketsCount: number = 0

  showProgressStatus: boolean = false;
  uploadStatus: boolean = false;
  isValidUrl: boolean = true;
  private urlRegex: RegExp = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/;
  username: string = '';

  // New properties for website sub-links functionality
  includeSublinks: boolean = false;
  pii_confirm: boolean = false;
  depth: number = 2;
  width: number = 10;
  linksExtracted: number = 20;
  isInfoPopupVisible: boolean = false;
  isDepthInvalid: boolean = false;
  isWidthInvalid: boolean = false;

  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef


  ngOnInit() {
    this.username = this.authService.getUsername();
    this.resourceType = this.sharedService.getResourceType();

    if (this.isDocumentsComponent) {
      this.getBuName();
      this.getProductName();
    }
    else {
      this.getProductList();
    }

    if (this.resourceType == 'jira') {
      this.loading = true;
      this.loadJiraProjects();
    }
    if (this.resourceType == 'confluence') {
      this.loading = true;
      this.loadConfluenceSpaces();
    }
    document.addEventListener('click', this.closeInfoPopupOnClickOutside.bind(this));
  }
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closeInfoPopupOnClickOutside.bind(this));
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

  getProceedButtonTooltip(): string {
    if (!this.selectedBU || !this.selectedProduct) {
      return "Please select a BU and a Product";
    }
    if (this.resourceType === 'website' && !this.websiteInput) {
      return "Please enter a website URL";
    }
    if (this.resourceType === 'website' && this.isValidUrl === false) {
      return "Please enter a valid website URL";
    }
    if (this.resourceType === 'website' && this.linksExtracted >= 1000) {
      return "Maximum limit of 1000 extracted links has been reached";
    }
    if (this.resourceType === 'website' && this.includeSublinks && (!this.depth || !this.width || this.depth < 1 || this.width < 1)) {
      return "Please enter valid depth and width";
    }
    if (this.resourceType == 'confluence' && !this.selectedSpace) {
      return "Please select a confluence Space";
    }
    if (this.resourceType == 'jira' && !this.selectedBoard) {
      return "Please select a Jira Board";
    }
    return "Click to proceed";
  }


  closeInfoPopupOnClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.isInfoPopupVisible && !target.closest('.info-popup') && !target.closest('.info-icon')) {
      this.isInfoPopupVisible = false;
    }
  }

  toggleInfoPopup() {
    this.isInfoPopupVisible = !this.isInfoPopupVisible;
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
    this.productName = this.sharedService.getProductName() ? this.sharedService.getProductName() : '';
    this.selectedProduct = this.productName ? this.productName : "";
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
    this.productName = this.selectedProduct
    this.productName = this.selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
  }

  onWebsiteInputChange(value: string) {
    this.websiteInput = value;
    this.isValidUrl = this.validateUrl(value);
  }

  validateUrl(url: string): boolean {
    return this.urlRegex.test(url);
  }

  validateDepth(event: any) {
    const inputValue = +event.target.value; // Convert the value to a number

    // Check if input is within the range and update validation status
    if (inputValue < 1 || inputValue > 1000) {
      this.isDepthInvalid = true;
    } else {
      this.isDepthInvalid = false;
      this.depth = inputValue; // Update depth only if valid
      this.calculateLinksExtracted();
    }
  }

  validateWidth(event: any) {
    const inputValue = +event.target.value; // Convert the value to a number

    // Check if input is within the range and update validation status
    if (inputValue < 1 || inputValue > 1000) {
      this.isWidthInvalid = true;
    } else {
      this.isWidthInvalid = false;
      this.width = inputValue; // Update depth only if valid
      this.calculateLinksExtracted();
    }
  }


  // New method to calculate Links Extracted
  calculateLinksExtracted() {
    this.linksExtracted = this.depth * this.width;
  }

  onIncludeSublinksChange(event: any) {
    this.includeSublinks = event.target.checked;
  }

  onPIIChange(event: any) {
    this.pii_confirm = event.target.checked;
  }

  loadJiraProjects() {
    this.uploadExternalService.loadJiraProjects()
      .subscribe((response: any) => {
        for (let i = 0; i < response.list_of_projects['length']; i++) {
          this.jira_projects.push(response.list_of_projects[i].name)
        }
        this.loading = false;
        this.selectedProject = '';

      })
  }

  onProjectChange() {
    this.selectedJiraTicketsCount = 0

    this.loading = true;

    this.list_of_boards = []
    this.list_of_board_names = []
    // console.log('Selected Project:', this.selectedProject);
    this.uploadExternalService.loadJiraBoards(this.selectedProject)
      .subscribe((response: any) => {
        // console.log("list od boards", response.list_of_boards)
        this.list_of_boards = response.list_of_boards
        for (let i = 0; i < response.list_of_boards['length']; i++) {
          this.list_of_board_names.push(response.list_of_boards[i].name)
        }
        this.loading = false;

        // console.log("list of boards after for loop", this.list_of_boards)
      })
  }

  onBoardChange() {
    this.selectedJiraTicketsCount = 0
    // console.log("selecetd borad name", this.selectedBoard)
    for (let i = 0; i < this.list_of_boards['length']; i++) {
      if (this.selectedBoard == this.list_of_boards[i].name) {
        this.selectedBoardId = this.list_of_boards[i].id
        this.selectedJiraTicketsCount = this.list_of_boards[i].ticket_count
        // console.log("selected board id", this.selectedBoardId)
        break
      }
      else {
        continue
      }
    }
  }

  loadConfluenceSpaces() {
    this.uploadExternalService.loadConfluenceSpaces()
      .subscribe((response: any) => {
        this.list_of_spaces = response.space
        // console.log("list of spaces", this.list_of_spaces)
        for (let i = 0; i < response.space['length']; i++) {
          this.list_of_space_names.push(response.space[i].name)
        }
        this.loading = false;

      })
  }

  onSpaceChange() {
    this.selectedConfluenceDocCount = 0
    // console.log(this.selectedSpace)
    for (let i = 0; i < this.list_of_spaces['length']; i++) {
      if (this.selectedSpace == this.list_of_spaces[i].name) {
        this.selectedSpaceKey = this.list_of_spaces[i].key
        this.selectedConfluenceDocCount = this.list_of_spaces[i].document_count
        // console.log("selected space id", this.selectedSpaceKey)
        break
      }
      else {
        continue
      }
    }
  }

  closePopup() {
    this.close.emit();
  }

  generateExternalReport() {
    this.isUploading = true;
    this.uploadExternalService.setProductExtractionStatus(this.productName, "true"); // Resource is being extracted

    let uploadObservable;

    if (this.resourceType === 'jira') {
      uploadObservable = this.uploadExternalService.addExternalJiraResource(
        this.resourceType,
        this.productName.toLowerCase(),
        this.selectedBoardId
      );
    } else if (this.resourceType === 'confluence') {
      uploadObservable = this.uploadExternalService.addExternalConfluenceResource(
        this.resourceType,
        this.productName.toLowerCase(),
        this.selectedSpaceKey
      );
    } else if (this.resourceType === 'website') {
      if (!this.isValidUrl) {
        this.errorMessage = 'Invalid website URL. Please check and try again.';
        this.isUploading = false;
        return;
      }
      let depth = this.includeSublinks ? this.depth : 1;
      let width = this.includeSublinks ? this.width : 1;
      uploadObservable = this.uploadExternalService.addExternalWebsiteResource(
        this.productName,
        this.websiteInput,
        depth,
        width
      );
    } else {
      console.error("Unknown resource type");
      this.isUploading = false;
      return;
    }

    // Subscribe to the observable returned for the selected resource type
    uploadObservable.subscribe({
      next: (response: any) => {
        console.log(response);
        this.showProgressStatus = true;
        this.uploadStatus = true;
        this.isUploading = false;
        this.uploadCompleted = true;

        const status = this.documentsService.getProgressStatusForProduct(this.productName);
        if (status) {
          let deleteStatus = status.deleteStatus;
          let totalDeletedFiles = status.totalFilesDeleted;
          this.documentsService.setProgressStatusForProduct(this.productName, this.showProgressStatus, this.uploadStatus, deleteStatus, totalDeletedFiles);
        } else {
          this.documentsService.setProgressStatusForProduct(this.productName, this.showProgressStatus, this.uploadStatus, false, 0);
        }

        this.uploadService.saveProgressStatusJSON(this.productName, this.username).subscribe();
        this.uploadExternalService.setProductExtractionStatus(this.productName, "false"); // Resource extraction completed
      },
      error: (error: any) => {
        console.error('Upload failed', error);

        let extractionStatusMessage = '';
        if (this.resourceType === 'jira') {
          extractionStatusMessage = `${this.selectedBoardId} - ${this.selectedBoard}; jira error`;
          this.errorMessage = `Error uploading ${this.resourceType} resources (${this.selectedBoardId} - ${this.selectedBoard}). Please contact administrator.`; // Set error message
          alert(this.errorMessage); // Alert to the user with the specific error message
        } else if (this.resourceType === 'confluence') {
          extractionStatusMessage = `${this.selectedSpaceKey} - ${this.selectedSpace}; confluence error`;
          this.errorMessage = `Error uploading ${this.resourceType} resources (${this.selectedSpaceKey} - ${this.selectedSpace}). Please contact administrator.`; // Set error message
          alert(this.errorMessage); // Alert to the user with the specific error message
        } else {
          extractionStatusMessage = `${this.resourceType} error`;
          this.errorMessage = `Error uploading ${this.resourceType} resources (${extractionStatusMessage}). Please contact administrator.`; // Set error message
          alert(this.errorMessage); // Alert to the user with the specific error message
        }

        // Set the product extraction status with specific error
        this.uploadExternalService.setProductExtractionStatus(this.productName, extractionStatusMessage);

        this.isUploading = false; // Reset uploading state

      }
    });

    // Auto close the popup after 5 seconds
    setTimeout(() => {
      this.closePopup();
    }, 5000);
  }


}