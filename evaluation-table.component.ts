import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SharedService } from '../../services/shared.service';
import { HttpClient } from '@angular/common/http';
import { EvaluationService } from '../../services/evaluation.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AddEvaluationComponent } from '../add-evaluation/add-evaluation.component';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-evaluation-table',
  standalone: true,
  imports: [CommonModule, FormsModule, AddEvaluationComponent],
  templateUrl: './evaluation-table.component.html',
  styleUrl: './evaluation-table.component.css'
})
export class EvaluationTableComponent {

  BuName: string = '';
  productName: string = '';
  buReportValues: any[] = [];
  buList: string[] = [];
  products: string[] = [];
  selectedUsecase: string = '';
  selectedBU: string = '';
  selectedProduct: string = '';
  isAdmin: boolean = false;
  isSearchTriggered: boolean = false;
  role: string = '';
  nameOfUser: string = '';
  loading: boolean = false;
  isDropdownOpen = false;
  wantTodownloadFiles = false;
  wantTodeleteFiles = false;
  triggeredByUsername: string = '';
  totalDeletedFiles: number = 0;
  evalList: any[] = [];
  showProgressStatus: boolean = false;
  uploadStatus: boolean = false;
  deleteStatus: boolean = false;
  processingError: boolean = false
  processingErrorMessage: string = ''
  noSelection = true;

  currentPage: number = 1;
  itemsPerPage: number = 5;

  selectedEvaluationNames: string[] = [];
  isAllSelected: boolean = false;
  isDownloading: boolean = false
  isDeleting: boolean = false

  filteredEvaluations: any[] = [];

  showPopup: boolean = false;
  showDeletionConfirmation: boolean = false

  generateDisabledMessage = ''
  searchQuery: string = '';
  deletionMessage: string = '';
  errorMessage: string = ''
  deletionError: boolean = false

  processingAppVersion = ''
  evaluationStatus: { [productName: string]: { [useCase: string]: boolean } } = {};
  private statusSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private sharedService: SharedService,
    private http: HttpClient,
    private evaluationService: EvaluationService) { }

  ngOnInit() {
    this.triggeredByUsername = this.authService.getUsername();
    this.role = this.authService.getUserRole();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();
    this.getUsecase();
    this.getProductList();

    // Subscribe to status updates
    this.statusSubscription = this.sharedService.getEvaluationStatusUpdates().subscribe((status) => {
      this.evaluationStatus = status; //true means done processing, false means pending
      console.log('Evaluation status updated:', this.evaluationStatus);
      this.processingAppVersion = this.sharedService.getEvaluatingAppVersion()
      this.getEvaluationStatus();
      this.getListOfEvaluations();
    });

    if (this.selectedBU && this.selectedProduct && this.selectedUsecase) {
      this.noSelection = false;
      this.getListOfEvaluations();
      this.getEvaluationStatus();
    }

  }

  ngOnDestroy(): void {
    // Unsubscribe to avoid memory leaks
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  getEvaluationStatus() {
    if (!this.selectedProduct)
      return
    let isEvaluating = !this.sharedService.getEvaluationStatus(this.selectedProduct, this.selectedUsecase);
    this.triggeredByUsername = this.nameOfUser ? this.nameOfUser : this.authService.getUsername()

    if (isEvaluating) {
      this.showProgressStatus = true;
      this.uploadStatus = true;
    }
    else {
      this.showProgressStatus = false
      this.uploadStatus = false
    }
  }

  get isNewEvaluationButtonDisabled(): boolean {
    // if evaluation is processing, disable the button
    if (this.showProgressStatus) {
      this.generateDisabledMessage = "Evaluation still processing"
    }
    return this.showProgressStatus; //true means showProgressStatus is true i.e. Evaluation under progress
  }

  get isDownloadDeleteButtonDisabled(): boolean {
    // if no evaluations left, disable the button
    return this.evalList.length == 0;
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

  getUsecase() {
    const selectedUsecase = this.sharedService.getSelectedUsecase();
    this.selectedUsecase = selectedUsecase ? selectedUsecase : "";
  }


  onBUChange(event: any) {
    this.resetVariables();
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
    this.resetVariables();
    const selectedProduct = event.target.value;
    this.selectedProduct = selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
    this.sharedService.setProductName(this.selectedProduct)
    this.isSearchTriggered = false;
    this.productName = this.selectedProduct
    if (this.selectedUsecase) {
      this.noSelection = false
      this.getListOfEvaluations();
    }
  }

  onUsecaseChange(event: any) {
    this.resetVariables();
    const selectedUsecase = event.target.value;
    this.isSearchTriggered = false;
    this.selectedUsecase = selectedUsecase;
    this.sharedService.setSelectedUsecase(this.selectedUsecase)
    if (this.productName) {
      this.noSelection = false
      this.getListOfEvaluations();
    }
  }

  resetVariables() {
    this.evalList = []
    this.showProgressStatus = false;
    this.uploadStatus = false;
    this.deleteStatus = false;
    this.processingError = false
    this.processingErrorMessage = ''
    this.isAllSelected = false;
    this.loading = false;
    this.isDropdownOpen = false;
    this.wantTodownloadFiles = false;
    this.wantTodeleteFiles = false;
    this.triggeredByUsername = '';
    this.totalDeletedFiles = 0;
    this.isDownloading = false
    this.isAllSelected = false
    this.selectedEvaluationNames = []
  }

  getListOfEvaluations() {
    this.loading = true;

    this.evaluationService.fetchListOfEvaluations(this.selectedBU, this.selectedProduct, this.selectedUsecase)
      .subscribe(response => {
        console.log('Fetch Evaluations Response:', response);

        // Map response to evaluation list
        this.evalList = response.evaluations.map((item: any) => ({
          appVersion: this.extractAppVersion(item["app version"]) || 'N/A',
          timestamp: item.timestamp ? this.formatTimestamp(item.timestamp) : '7777-12-31 12:00:00',
          username: item.username ? item.username : '-',
          total_count: item.total_count >= 0 ? item.total_count : '-',
          contextualPrecision: item['Contextual Precision'] >= 0 ? item['Contextual Precision'] : '-',
          contextualRecall: item['Contextual Recall'] >= 0 ? item['Contextual Recall'] : '-',
          contextualRelevancy: item['Contextual Relevancy'] >= 0 ? item['Contextual Relevancy'] : '-',
          answerRelevancy: item['Answer Relevancy'] >= 0 ? item['Answer Relevancy'] : '-',
          faithfulness: item['Faithfulness'] >= 0 ? item['Faithfulness'] : '-',
          isAggregated: item.total_count !== null, // Identify if aggregated data exists
        })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by timestamp

        this.loading = false;
      }, error => {
        console.error('Error fetching evaluations:', error);
        this.evalList = []; // Clear the list on error
        this.loading = false;
      });
  }

  extractAppVersion(fullPath: string): string {
    if (fullPath.includes("/")) {
      // Remove path prefix and .csv suffix
      const segments = fullPath.split('/');
      const fileName = segments[segments.length - 1]; // Get the last segment (file name)
      return fileName.replace('.csv', '').trim(); // Remove .csv and trim whitespace
    }
    return fullPath
  }

  formatTimestamp(rawTimestamp: string): string {
    try {
      // Parse the raw timestamp into date and time
      const [datePart, timePart] = rawTimestamp.split(' '); // "2024-12-03 11:33:24" -> ["2024-12-03", "11:33:24"]
      const [year, month, day] = datePart.split('-'); // Split the date into year, month, and day

      // Month mapping
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];

      // Convert to the desired format
      const formattedDate = `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`; // "03 Dec 2024"

      // Combine with time (only HH:mm part)
      return `${formattedDate} ${timePart.substring(0, 5)}`; // "03 Dec 2024 11:33"
    } catch (error) {
      // Fallback for invalid timestamps
      return '7777-12-31 12:00:00';
    }
  }



  // onSearch(event: any) {
  //   this.searchQuery = event.target.value.toLowerCase();
  //   this.applyFilter();
  // }

  // applyFilter() {
  //   // Filter by search query and paginate results
  //   const filtered = this.evalList.filter((row) =>
  //     row.appVersion.toLowerCase().includes(this.searchQuery)
  //   );
  //   this.filteredEvaluations = filtered.slice(
  //     (this.currentPage - 1) * this.itemsPerPage,
  //     this.currentPage * this.itemsPerPage
  //   );
  // }

  openUploadPopup() {
    this.toggleDropdown()
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.getBuName();
    this.getProductName();
    this.getUsecase();
    this.getListOfEvaluations();
    this.getEvaluationStatus();
  }

  onFileSelection(event: Event, appVersion: string) {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      if (!this.selectedEvaluationNames.includes(appVersion)) {
        this.selectedEvaluationNames.push(appVersion);
      }
    } else {
      this.selectedEvaluationNames = this.selectedEvaluationNames.filter(
        selected => selected !== appVersion
      );
    }

    // Check if all current page items are selected
    const currentPageItems = this.evalList.slice(this.startIndex(), this.endIndex());
    this.isAllSelected = currentPageItems.every(item =>
      this.selectedEvaluationNames.includes(item.appVersion)
    );
  }


  toggleSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.isAllSelected = checkbox.checked;

    // Get the list of items on the current page
    const currentPageItems = this.evalList.slice(this.startIndex(), this.endIndex());

    if (this.isAllSelected) {
      // Add only the items on the current page to the selected list
      currentPageItems.forEach(item => {
        if (!this.selectedEvaluationNames.includes(item.appVersion)) {
          this.selectedEvaluationNames.push(item.appVersion);
        }
      });
    } else {
      // Remove only the items on the current page from the selected list
      currentPageItems.forEach(item => {
        this.selectedEvaluationNames = this.selectedEvaluationNames.filter(
          selected => selected !== item.appVersion
        );
      });
    }
  }


  downloadSelectedFiles() {
    this.isDownloading = true
    this.evaluationService.downloadSelected(this.selectedBU, this.selectedProduct, this.selectedEvaluationNames, this.selectedUsecase)
      .subscribe(response => {
        const blob = new Blob([response], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'selected_evaluations.zip';
        link.click();
        this.isDownloading = false
        this.selectedEvaluationNames = []
        this.isAllSelected = false
      }, error => {
        console.error('Error downloading files:', error);
      });
  }

  downloadSummary() {
    this.isDownloading = true
    this.evaluationService.downloadSummary(this.selectedBU, this.selectedProduct, this.selectedUsecase)
      .subscribe(response => {
        // Create a link element for downloading the file
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.selectedProduct}_summary.csv`;
        link.click();
        this.isDownloading = false
        this.selectedEvaluationNames = []
        this.isAllSelected = false
        // Cleanup
        window.URL.revokeObjectURL(url);
      }, error => {
        console.error('Error downloading summary:', error);
        alert('Failed to download summary.');
      });
  }

  deleteSelectedFiles() {
    this.isDeleting = true
    this.deletionMessage = 'Deleting the selected records...';
    // this.triggeredByUsername = this.nameOfUser
    this.triggeredByUsername = this.nameOfUser ? this.nameOfUser : this.authService.getUsername()

    this.totalDeletedFiles = this.selectedEvaluationNames.length

    this.evaluationService.deleteSelected(this.selectedBU, this.selectedProduct, this.selectedEvaluationNames, this.selectedUsecase)
      .subscribe(response => {
        console.log('Files deleted successfully');
        this.getListOfEvaluations(); // Refresh the list after deletion
        this.deleteStatus = true
        this.deletionMessage = '';
        this.isDeleting = false;
        this.showDeletionConfirmation = false;
        this.selectedEvaluationNames = []
        this.isAllSelected = false

        // Hide progress bars after 10 seconds
        setTimeout(() => {
          this.deleteStatus = false
          this.totalDeletedFiles = 0
        }, 5000);

        // Check if there are no more files in the filtered list, and handle any additional logic
        let filesNotpresent = this.evalList.length == 0;

        // If there are no files left, reset progress and upload status
        if (filesNotpresent) {
          this.evalList = []
          // Hide progress bars after 10 seconds
          setTimeout(() => {
            this.resetVariables()
          }, 10000);
        }

      }, error => {
        console.error('Error deleting files:', error);
      });
  }

  navigateToAddEvaluation() {
    this.router.navigate(["/add-evaluation"])
  }

  showDeletionPopup() {
    this.showDeletionConfirmation = true;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  downloadFiles() {
    this.wantTodownloadFiles = true
    this.wantTodeleteFiles = false
    this.removeAllSelectedFiles();
    this.toggleDropdown();
  }

  deleteFiles() {
    this.wantTodownloadFiles = false
    this.wantTodeleteFiles = true
    this.removeAllSelectedFiles();
    this.toggleDropdown();
  }

  cancelDownloadDelete() {
    this.wantTodownloadFiles = false
    this.wantTodeleteFiles = false
    this.removeAllSelectedFiles();
  }


  navigateToGlossary() {
    this.router.navigate(['/evaluation-kpi'])
  }

  navigateToHome() {
    this.router.navigate(['/home'])
  }

  // Pagination methods
  startIndex() {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  endIndex() {
    return Math.min(this.startIndex() + this.itemsPerPage, this.evalList.length);
  }

  totalPages() {
    return Math.ceil(this.evalList.length / this.itemsPerPage);
  }

  changePage(page: number) {
    if (page > 0 && page <= this.totalPages()) {
      this.currentPage = page;

      // Recalculate "Select All" checkbox for the new page
      const currentPageItems = this.evalList.slice(this.startIndex(), this.endIndex());
      this.isAllSelected = currentPageItems.every(item =>
        this.selectedEvaluationNames.includes(item.appVersion)
      );
    }
  }

  removeAllSelectedFiles() {
    this.selectedEvaluationNames = []; // Empty the selectedFiles array
    this.isAllSelected = false
  }


}
