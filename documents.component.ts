import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DocumentsService } from '../../services/documents.service';
import { UploadComponent } from '../../upload/upload.component';
import { forkJoin, interval, Subscription, takeWhile } from 'rxjs';
import { UploadExternalDependenciesComponent } from '../../upload-external-dependencies/upload-external-dependencies.component';
import { UploadExternalService } from '../../services/upload-external.service';
import { UploadService } from '../../services/upload.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, UploadComponent, UploadExternalDependenciesComponent],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {

  selectedtab: string = 'internal'
  selectedSecondaryTab: string = 'jira'
  isDropdownOpen = false;
  showUploadResourcePopup = false;
  BuName: string = '';
  productName: string = '';
  showProgressStatus: boolean = false;
  uploadStatus: boolean = false;
  deleteStatus: boolean = false;
  showPopup: boolean = false;
  showExternalDepedencyPopup: boolean = false;
  documentNames: string[] = [];
  uploadedDate = [];

  currentPage: number = 1;
  itemsPerPage: number = 5;

  selectedFiles: string[] = [];
  isAllSelected: boolean = false;

  filteredDocumentNames: string[] = [];
  filteredUploadedDate: string[] = [];
  searchPerformed: boolean = false;
  sortDirection: string = 'desc'; // 'asc' or 'desc' for sorting order
  sortField: string = ''; // 'fileName' or 'uploadDate' for the field to sort
  totalDeletedFiles: number = 0;  // Track total number of deleted files

  deletionMessage: string = '';

  isListFetched: boolean = false
  isJiraListFetched: boolean = false
  isConfluenceListFetched: boolean = false
  isWebsiteListFetched: boolean = false

  showDeletionConfirmation: boolean = false

  loading: boolean = true
  isDeleting: boolean = false
  isDownloading: boolean = false

  processedFilesCount: number = 0;
  totalFilesCount: number = 0;

  processingError: boolean = false
  deletionError: boolean = false

  errorMessage: string = ''
  generateDisabledMessage: string = ''

  processingErrorMessage: string = ''

  filesLeftToProcess: number = 0;

  private processingStatusSubscription: Subscription | undefined;
  private extractionStatusSubscription!: Subscription;

  role: string = '';
  username: string = '';
  triggeredByUsername: string = '';
  isAdmin: boolean = false;

  jiraFiles: any[] = []
  confluenceFiles: any[] = [];
  websiteList: any[] = [];

  filteredJiraFiles: any[] = [];
  filteredConfluenceFiles: any[] = [];
  filteredWebsiteList: any[] = [];

  wantTodownloadFiles = false;
  wantTodeleteFiles = false;

  websiteExtracting: boolean = false;

  errorExtFile = ''
  failingFileName = ''

  constructor(
    private sharedService: SharedService,
    private router: Router,
    private authService: AuthService,
    private documentsService: DocumentsService,
    private uploadExternalService: UploadExternalService,
    private uploadService: UploadService) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.username = this.authService.getUsername();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();
    // this.getProgressStatusForProduct();
    this.checkForProgressStatusJSON();
    this.getListOfFiles();
    this.loadExternalFiles();

    console.log("BACK IN DOC TS - WEBSITE = " + this.websiteExtracting)

    // Subscribe to the extraction status observable
    this.extractionStatusSubscription = this.uploadExternalService.extractionStatus$
      .subscribe(statuses => {
        const currentStatus = statuses[this.productName];

        if (currentStatus && currentStatus.includes('error')) {
          this.processingError = true;
          this.websiteExtracting = false;

          if (currentStatus.includes('jira')) {
            this.errorExtFile = currentStatus.split(';')[0]; // Extract board ID
            this.processingErrorMessage = `Adding External Resource failed for Board: ${this.errorExtFile}. Please contact administrator.`;
          } else if (currentStatus.includes('confluence')) {
            this.errorExtFile = currentStatus.split(';')[0]; // Extract space key
            this.processingErrorMessage = `Adding External Resource failed for Space: ${this.errorExtFile}. Please contact administrator.`;
          } else {
            this.processingErrorMessage = `Adding External Resource failed. Please contact administrator.`;
          }
        } else {
          this.processingError = false;
          this.websiteExtracting = currentStatus === 'true';
          console.log(`Current extraction status for ${this.productName}:`, this.websiteExtracting);

          if (this.websiteExtracting) {
            console.log('Extraction started.');
          } else if (!this.websiteExtracting) {
            console.log('Extraction completed.');
            this.checkForProgressStatusJSON();
            this.loadExternalFiles(); // Load files after extraction completes
          }
        }
      });

    console.log("BACK IN DOC TS")
  }

  ngOnDestroy() {
    // Unsubscribe from polling when the component is destroyed
    if (this.processingStatusSubscription) {
      this.processingStatusSubscription.unsubscribe();
    }
    if (this.extractionStatusSubscription) {
      this.extractionStatusSubscription.unsubscribe();
    }
  }

  navigateToBUList() {
    if (this.isAdmin) {
      this.router.navigate(['/home'])
    } else {
      this.router.navigate(['/bu'])
    }
  }

  checkForProgressStatusJSON() {
    // console.log("checking PROGRESS STATU")
    this.uploadService.fetchProgressStatusJSON(this.productName.toLowerCase()).subscribe(
      (data) => {
        // console.log("IT IS PRESENT")

        this.populateProgressStatusJSON(data);
      },
      (error) => {
        // Check if error is 404 (not found)
        if (error.status === 404) {
          // console.log("NOT FOUND PRESENT")
          this.showProgressStatus = false;
          this.uploadStatus = false;
          this.deleteStatus = false;
          this.totalDeletedFiles = 0;
          this.triggeredByUsername = ''
        } else {
          // console.error('Error fetching ProgressStatusJSON:', error);
        }
      }
    );
  }

  populateProgressStatusJSON(status: any) {
    // console.log("POPULATE " + status)
    this.showProgressStatus = status.showProgressStatus;
    this.uploadStatus = status.uploadStatus;
    this.deleteStatus = status.deleteStatus;
    this.totalDeletedFiles = status.totalFilesDeleted;
    this.triggeredByUsername = status.triggeredByUsername;

    if (this.showProgressStatus && this.uploadStatus)
      this.loading = true
    // console.log("progress " + this.showProgressStatus + " " + this.uploadStatus)
  }

  loadExternalFiles() {
    this.loading = true;

    const jiraFiles$ = this.documentsService.fetchExternalFiles(this.productName, 'jira');
    const confluenceFiles$ = this.documentsService.fetchExternalFiles(this.productName, 'confluence');
    const websiteFiles$ = this.documentsService.fetchExternalFiles(this.productName, 'website');

    forkJoin([jiraFiles$, confluenceFiles$, websiteFiles$]).subscribe(
      ([jiraFiles, confluenceFiles, websiteFiles]) => {
        this.jiraFiles = jiraFiles;
        this.filteredJiraFiles = this.jiraFiles;
        this.isJiraListFetched = true;

        this.confluenceFiles = confluenceFiles;
        this.filteredConfluenceFiles = this.confluenceFiles;
        this.isConfluenceListFetched = true;

        this.websiteList = websiteFiles;
        this.filteredWebsiteList = this.websiteList;
        this.isWebsiteListFetched = true;

        if (this.showProgressStatus && (this.filteredJiraFiles.length > 0 || this.filteredConfluenceFiles.length > 0 || this.filteredWebsiteList.length > 0)) {
          this.loading = true;
          this.checkProcessingStatus();
        }
        else {
          // If no files or no progress status, stop the spinner here
          this.loading = false;
        }
      },
      error => {
        console.error('Error fetching external files:', error);
        this.loading = false;
      }
    );
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectTab(tab: string) {
    this.selectedtab = tab;
    this.selectedFiles = []; // Empty the selectedFiles array
    this.isAllSelected = false;
    this.currentPage = 1;
    this.loading = true 

    if (tab === 'internal') {
      this.filteredDocumentNames = [...this.documentNames];
      this.filteredUploadedDate = [...this.uploadedDate];
    } else if (tab === 'external') {
      if (this.selectedSecondaryTab === 'jira') {
        this.filteredJiraFiles = [...this.jiraFiles];
      } else if (this.selectedSecondaryTab === 'confluence') {
        this.filteredConfluenceFiles = [...this.confluenceFiles];
      } else if (this.selectedSecondaryTab === 'website') {
        this.filteredWebsiteList = [...this.websiteList];
      }
    }
  }

  selectSecondaryTab(secondaryTab: string) {
    this.selectedSecondaryTab = secondaryTab;
    this.selectedFiles = []; // Empty the selectedFiles array
    this.isAllSelected = false;
    this.currentPage = 1;

    if (secondaryTab === 'jira') {
      this.filteredJiraFiles = [...this.jiraFiles];
    } else if (secondaryTab === 'confluence') {
      this.filteredConfluenceFiles = [...this.confluenceFiles];
    } else if (secondaryTab === 'website') {
      this.filteredWebsiteList = [...this.websiteList];
    }
  }

  getCurrentFiles(): any[] {
    if (this.selectedtab === 'external') {
      if (this.selectedSecondaryTab === 'jira') {
        return this.filteredJiraFiles;
      } else if (this.selectedSecondaryTab === 'confluence') {
        return this.filteredConfluenceFiles;
      } else if (this.selectedSecondaryTab === 'website') {
        return this.filteredWebsiteList;
      }
    } else if (this.selectedtab === 'internal') {
      return this.filteredDocumentNames;
    }
    return [];
  }

  getProgressStatusForProduct() {
    this.checkForProgressStatusJSON();
  }

  updateProgressStatus(showProgress: boolean, upload: boolean, deleteStatus: boolean, totalFilesDeleted: number) {
    this.documentsService.setProgressStatusForProduct(this.productName, showProgress, upload, deleteStatus, totalFilesDeleted);
    this.uploadService.saveProgressStatusJSON(this.productName, this.username).subscribe();
  }

  showDeletionPopup() {
    this.showDeletionConfirmation = true;
  }

  getListOfFiles() {
    this.documentsService.getListOfFilesNames(this.BuName, this.productName, 'input_files').subscribe(response => {
      this.documentNames = response.map((element: { doc_name: string; creation_date: any }) => element.doc_name);
      this.uploadedDate = response.map((element: { doc_name: string; creation_date: any }) =>
        this.formatDate(element.creation_date)
      );

      this.filteredDocumentNames = [...this.documentNames];
      this.filteredUploadedDate = [...this.uploadedDate];
      this.isListFetched = true;

      this.sortField = 'uploadDate'
      this.sortDirection = 'desc'
      this.sortDocumentsByUploadDate(); // Sort by uploaded date in descending order

      if (this.showProgressStatus && this.filteredDocumentNames.length > 0) {
        this.loading = true; // Keep loading spinner active for processing status
        this.checkProcessingStatus(); // Start checking the status
      }
      else {
        // Stop loading if no files or no progress status
        this.loading = false;
      }
    }, error => {
      console.error('Error fetching files:', error);
      this.loading = false; // Stop loading on error
    });
  }


  resetProgressStatusIfEmpty() {
    if (this.filteredDocumentNames.length === 0) {
      this.uploadStatus = false;
      this.showProgressStatus = false;
      this.deleteStatus = false;
      this.updateProgressStatus(this.showProgressStatus, this.uploadStatus, this.deleteStatus, this.totalDeletedFiles);
    }
  }
  
  checkProcessingStatus() {
    // Unsubscribe from any previous subscription to avoid duplicate polling
    if (this.processingStatusSubscription) {
      this.processingStatusSubscription.unsubscribe();
    }
  
    this.loading = true; // Keep the loading state active while checking status
  
    // Polling every 15 seconds to check metadata
    this.processingStatusSubscription = interval(15000)
      .pipe(takeWhile(() => this.loading)) // Stop polling when loading is false
      .subscribe(() => {
        this.uploadExternalService.checkResourceStatus(this.productName.toLowerCase()).subscribe(
          (status: any) => {
            let resourceProcessedStatus = status.isFileProcessed;
            let failingFileName = status.failingFileName;
  
            if (resourceProcessedStatus === 'true') {
              // All files processed successfully
              console.log('Processing completed.');
              this.processingStatusSubscription?.unsubscribe(); // Stop polling
              this.processingError = false;
              this.loading = false; // Stop loading spinner
              this.showProgressStatus = false;
              this.uploadStatus = true;
  
              // Update the progress status
              this.documentsService.setProgressStatusForProduct(
                this.productName,
                this.showProgressStatus,
                this.uploadStatus,
                this.deleteStatus,
                this.totalDeletedFiles
              );
              this.uploadService.saveProgressStatusJSON(this.productName, this.username).subscribe();
            } else if (resourceProcessedStatus === 'unknown') {
              // Files still being processed, continue polling
              console.log('Files are still processing...');
              this.loading = true;
            } else {
              // Handle error scenario
              this.failingFileName = failingFileName
              console.error('Error in processing resources:', failingFileName);
              this.processingStatusSubscription?.unsubscribe(); // Stop polling
              this.processingError = true;
              this.processingErrorMessage = failingFileName
                ? `Error in processing the file: ${failingFileName}. Delete the file to continue processing or Please contact the administrator.`
                : `Error in processing resources. Please contact the administrator.`;
              this.loading = false; // Stop the spinner on error
              this.resetProgressStatusIfEmpty();
            }
          },
          error => {
            console.error(`Error checking resource status:`, error);
            this.processingStatusSubscription?.unsubscribe(); // Stop polling on API error
            this.loading = false; // Stop the spinner
          }
        );
      });
  }
  

  getBuName() {
    this.BuName = this.sharedService.getBuName();
  }

  getProductName() {
    this.productName = this.sharedService.getProductName();
  }

  navigateToProducts() {
    this.router.navigate(['/product']);
  }

  navigateToBluePrint() {
    this.router.navigate(['/blueprint']);
  }

  openUploadPopup() {
    this.showUploadResourcePopup = true;
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  uploadFiles() {
    this.showUploadResourcePopup = false;
    this.showPopup = true;
    this.getProgressStatusForProduct();
  }

  openExternalResources(resourceType: string) {
    this.showUploadResourcePopup = false;
    this.sharedService.setResourceType(resourceType)
    this.showExternalDepedencyPopup = true;
  }

  closePopup() {
    this.getProgressStatusForProduct();
    this.getListOfFiles();
    this.loadExternalFiles();
    this.showPopup = false;
    this.showExternalDepedencyPopup = false;
  }

  onSearch(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value.toLowerCase();

    if (inputValue) {
      this.searchPerformed = true;

      // If the selected tab is internal (assuming you already have a variable for selectedTab)
      if (this.selectedtab === 'internal') {
        this.filteredDocumentNames = this.documentNames.filter(doc =>
          doc.toLowerCase().includes(inputValue)
        );
        this.filteredUploadedDate = this.filteredDocumentNames.map(docName =>
          this.uploadedDate[this.documentNames.indexOf(docName)]
        );
      }
      // If the selected tab is external
      else if (this.selectedtab === 'external') {
        // Jira search
        this.filteredJiraFiles = this.jiraFiles.filter(file =>
          file.doc_name.toLowerCase().includes(inputValue)
        );

        // Confluence search
        this.filteredConfluenceFiles = this.confluenceFiles.filter(file =>
          file.doc_name.toLowerCase().includes(inputValue)
        );

        // Website search
        this.filteredWebsiteList = this.websiteList.filter(file =>
          file.doc_name.toLowerCase().includes(inputValue)
        );
      }
    } else {
      // Reset the lists when no input is provided
      this.searchPerformed = false;

      if (this.selectedtab === 'internal') {
        this.filteredDocumentNames = [...this.documentNames];
        this.filteredUploadedDate = [...this.uploadedDate];
      } else if (this.selectedtab === 'external') {
        this.filteredJiraFiles = [...this.jiraFiles];
        this.filteredConfluenceFiles = [...this.confluenceFiles];
        this.filteredWebsiteList = [...this.websiteList];
      }
    }

    this.changePage(1); // Reset to page 1 after search
  }


  // Sorting logic
  sortBy(field: string) {
    if (this.sortField === field) {
      // Toggle sorting direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new sort field and default to ascending order
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Call sorting methods based on the field
    if (field === 'fileName') {
      this.sortDocumentsByFileName();
    } else if (field === 'uploadDate') {
      this.sortDocumentsByUploadDate();
    }
  }

  sortDocumentsByFileName() {
    const sortedArray = this.filteredDocumentNames
      .map((name, index) => ({ name, date: this.filteredUploadedDate[index] }))
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return this.sortDirection === 'asc' ? -1 : 1;
        if (nameA > nameB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

    // Update document names and corresponding dates
    this.filteredDocumentNames = sortedArray.map(item => item.name);
    this.filteredUploadedDate = sortedArray.map(item => item.date);
  }
  sortDocumentsByUploadDate() {
    const sortedArray = this.filteredUploadedDate
      .map((date, index) => ({ date, name: this.filteredDocumentNames[index] }))
      .sort((a, b) => {
        const dateA = this.convertToDate(a.date);
        const dateB = this.convertToDate(b.date);

        // Check if dates are the same, then compare hours and minutes
        const timeComparison = dateB.getTime() - dateA.getTime(); // Sort in descending order
        return this.sortDirection === 'asc' ? -timeComparison : timeComparison; // Invert for ascending
      });

    // Update document dates and corresponding names
    this.filteredUploadedDate = sortedArray.map(item => item.date);
    this.filteredDocumentNames = sortedArray.map(item => item.name);
  }


  // Helper function to convert date strings to Date objects for accurate sorting
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


  startIndex() {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  endIndex() {
    return Math.min(this.startIndex() + this.itemsPerPage, this.getCurrentFiles().length);
  }

  totalPages() {
    return Math.ceil(this.getCurrentFiles().length / this.itemsPerPage);
  }

  changePage(page: number) {
    this.currentPage = page;

    // Check if all files on the current page are selected
    const currentFiles = this.getCurrentFiles().slice(this.startIndex(), this.endIndex());
    this.isAllSelected = currentFiles.every(file => this.selectedFiles.includes(file.doc_name));
  }


  removeAllSelectedFiles() {
    this.selectedFiles = []; // Empty the selectedFiles array
    this.isAllSelected = false
  }


  toggleSelectAll(event: any): void {
    const startIndex = this.startIndex();
    const endIndex = this.endIndex();

    if (event.target.checked && this.selectedtab == "external") {
      // Select all files on the current page
      for (let i = startIndex; i < endIndex; i++) {
        const fileName = this.getCurrentFiles()[i].doc_name; // Get the doc_name for the current file
        if (!this.selectedFiles.includes(fileName)) {
          this.selectedFiles.push(fileName);
        }
      }
    } else if (event.target.checked && this.selectedtab == "internal") {
      // Select all files on the current page
      for (let i = startIndex; i < endIndex; i++) {
        const fileName = this.filteredDocumentNames[i]; // Get the doc_name for the current file
        if (!this.selectedFiles.includes(fileName)) {
          this.selectedFiles.push(fileName);
        }
      }
    }
    else if (this.selectedtab == "external") {
      // Deselect all files on the current page
      for (let i = startIndex; i < endIndex; i++) {
        const fileName = this.getCurrentFiles()[i].doc_name;
        const index = this.selectedFiles.indexOf(fileName);
        if (index > -1) {
          this.selectedFiles.splice(index, 1);
        }
      }
    }
    else if (this.selectedtab == "internal") {
      // Deselect all files on the current page
      for (let i = startIndex; i < endIndex; i++) {
        const fileName = this.filteredDocumentNames[i];
        const index = this.selectedFiles.indexOf(fileName);
        if (index > -1) {
          this.selectedFiles.splice(index, 1);
        }
      }
    }

    // Update the 'isAllSelected' state to reflect whether all files on the current page are selected
    this.isAllSelected = event.target.checked;
  }


  onFileSelection(event: any, fileName: string): void {
    if (event.target.checked) {
      // Add the selected file to the selectedFiles array if not already present
      if (!this.selectedFiles.includes(fileName)) {
        this.selectedFiles.push(fileName);
      }
    } else {
      // Remove the file from the selectedFiles array
      const index = this.selectedFiles.indexOf(fileName);
      if (index > -1) {
        this.selectedFiles.splice(index, 1);
      }
    }

    // console.log(this.selectedFiles)
  }

  deleteSelectedFiles() {
    this.isDeleting = true
    this.deletionMessage = 'Deleting the selected documents...';
    const selectedFileNames = this.selectedFiles;
    this.documentsService.deleteFiles(this.productName, selectedFileNames).subscribe(response => {

      // Update total deleted files count
      this.totalDeletedFiles += selectedFileNames.length;

      // Remove deleted files from both documentNames and uploadedDate arrays
      const indicesToRemove: number[] = [];
      this.documentNames = this.documentNames.filter((name, index) => {
        if (this.selectedFiles.includes(name)) {
          indicesToRemove.push(index); // Track indices to remove from uploadedDate
          return false; // Exclude the file from documentNames
        }
        return true;
      });

      // Remove corresponding dates based on the tracked indices
      this.uploadedDate = this.uploadedDate.filter((_, index) => !indicesToRemove.includes(index));

      this.filteredDocumentNames = [...this.documentNames];
      this.filteredUploadedDate = [...this.uploadedDate];

      // Clear selected files after deletion
      this.selectedFiles = [];
      this.isAllSelected = false;

      this.deleteStatus = true;

      this.deletionMessage = '';
      this.isDeleting = false;

      // Check if there are no more files in the filtered list, and handle any additional logic
      let filesNotpresent = this.checkIfNoFilesLeft();

      // If there are no files left, reset progress and upload status
      if (filesNotpresent) {
        this.uploadStatus = false;
        this.showProgressStatus = false;
        this.loading = false;
        this.totalDeletedFiles = 0

        // Hide progress bars after 10 seconds
        setTimeout(() => {
          this.deleteStatus = false;
          this.updateProgressStatus(this.showProgressStatus, this.uploadStatus, this.deleteStatus, this.totalDeletedFiles);
        }, 10000);

      }

      // Update progress status for the product
      this.updateProgressStatus(this.showProgressStatus, this.uploadStatus, this.deleteStatus, this.totalDeletedFiles);

      this.sortDirection = 'desc'
      this.sortDocumentsByUploadDate(); // Sort by uploaded date in descending order

      this.showDeletionConfirmation = false;

      if (this.processingError && this.filteredDocumentNames.length > 0) {
        this.processingError = false;
        this.processingErrorMessage = '';
        this.deleteStatus = false
        this.checkProcessingStatus();
      } else if (this.processingError && this.filteredDocumentNames.length == 0) { //if empty, dont check processing status
        this.processingError = false;
        this.processingErrorMessage = '';
      }

    }, error => {
      console.error('Error deleting files:', error);
      this.deletionError = true;
      this.errorMessage = `Error deleting files: ${error.message || 'An unknown error occurred.'}`;
    });
  }

  deleteSelectedExternalFiles() {
    this.isDeleting = true
    this.deletionMessage = this.selectedSecondaryTab == 'jira' ? 'Deleting the selected board(s)...' :
      this.selectedSecondaryTab == 'confluence' ? 'Deleting the selected space(s)...' : 'Deleting the selected website(s)...';
    const selectedFileNames = this.selectedFiles;
    // console.log("FOR DELETE EXT " + this.selectedFiles)



    this.documentsService.deleteExternalFiles(this.productName, this.selectedSecondaryTab, selectedFileNames).subscribe(response => {

      
      // Update total deleted files count
      this.totalDeletedFiles += selectedFileNames.length;

      // Update the filtered list depending on the selected secondary tab
      if (this.selectedSecondaryTab === 'jira') {
        this.removeDeletedFilesFromList(this.filteredJiraFiles);
      } else if (this.selectedSecondaryTab === 'confluence') {
        this.removeDeletedFilesFromList(this.filteredConfluenceFiles);
      } else if (this.selectedSecondaryTab === 'website') {
        this.removeDeletedFilesFromList(this.filteredWebsiteList);
      }

      // Clear selected files after deletion
      this.selectedFiles = [];
      this.isAllSelected = false;

      this.deleteStatus = true;

      // Check if there are no more files in the filtered list, and handle any additional logic
      let filesNotpresent = this.checkIfNoFilesLeft();

      // If there are no files left, reset progress and upload status
      if (filesNotpresent) {
        this.uploadStatus = false;
        this.showProgressStatus = false;
        this.loading = false;
        this.totalDeletedFiles = 0;

        // Hide progress bars after 10 seconds
        setTimeout(() => {
          this.deleteStatus = false;
          this.updateProgressStatus(this.showProgressStatus, this.uploadStatus, this.deleteStatus, this.totalDeletedFiles);
        }, 10000);
      }

      // Reset deletion message
      this.deletionMessage = '';

      // Update progress status for the product
      this.updateProgressStatus(this.showProgressStatus, this.uploadStatus, this.deleteStatus, this.totalDeletedFiles);

      this.sortDirection = 'desc'
      this.sortDocumentsByUploadDate(); // Sort by uploaded date in descending order

      this.showDeletionConfirmation = false;

      this.isDeleting = false

      // Re-check processing status if there was an error, and there are still files remaining
      if (this.processingError && (this.filteredJiraFiles.length > 0 || this.filteredConfluenceFiles.length > 0 ||
        this.filteredWebsiteList.length > 0)) {
        this.processingError = false;
        this.processingErrorMessage = '';
        this.deleteStatus = false
        this.checkProcessingStatus();
      } else if (this.processingError && (this.filteredJiraFiles.length == 0 && this.filteredConfluenceFiles.length == 0 &&
        this.filteredWebsiteList.length == 0)) { //if empty, dont check processing status
        this.processingError = false;
        this.processingErrorMessage = '';
      }

    }, error => {
      console.error('Error deleting files:', error);
      this.deletionError = true;
      this.errorMessage = `Error deleting files: ${error.message || 'An unknown error occurred.'}`;
    });
  }

  removeDeletedFilesFromList(filteredList: any[]): void {
    const indicesToRemove: number[] = [];

    // Filter out the deleted files and track their indices
    filteredList = filteredList.filter((file, index) => {
      if (this.selectedFiles.includes(file.doc_name)) {
        indicesToRemove.push(index);
        return false; // Exclude the file from the filtered list
      }
      return true;
    });

    // Update the corresponding filtered list
    if (this.selectedSecondaryTab === 'jira') {
      this.filteredJiraFiles = [...filteredList];
    } else if (this.selectedSecondaryTab === 'confluence') {
      this.filteredConfluenceFiles = [...filteredList];
    } else if (this.selectedSecondaryTab === 'website') {
      this.filteredWebsiteList = [...filteredList];
    }
  }

  checkIfNoFilesLeft() {
    //return true if no files for a product
    if (this.jiraFiles.length === 0 && this.confluenceFiles.length === 0 &&
      this.websiteList.length === 0 && this.documentNames.length === 0) {
      return true;
    }
    return false;
  }

  get isGenerateButtonDisabled(): boolean {
    if (this.showProgressStatus) {
      this.generateDisabledMessage = "Resources are still processing"
    }

    if (this.checkIfNoFilesLeft()) {
      this.generateDisabledMessage = "No Resources available"
    }

    return this.showProgressStatus || this.checkIfNoFilesLeft();
  }

  get isDownloadDeleteButtonDisabled(): boolean {
    return this.checkIfNoFilesLeft();
  }

  downloadSelectedFiles() {
    this.isDownloading = true
    const selectedFileNames = this.selectedFiles;

    this.documentsService.downloadFiles(this.productName, selectedFileNames).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.productName}_selected_files.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      this.isDownloading = false

      //remove selections
      this.removeAllSelectedFiles();

    }, error => {
      console.error('Error downloading files:', error);
    });
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
}
