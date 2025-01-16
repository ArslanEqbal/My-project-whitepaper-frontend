import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DocumentsService } from '../../services/documents.service';
import { catchError, forkJoin, Observable, of, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {


  BuName: string = '';
  productName: string = '';
  buProductsList: any = {};
  buProductValues: any[] = [];
  searchText: string = '';
  filteredProductValues: any[] = [];
  searchPerformed: boolean = false;
  loading: boolean = true;
  // numberOfDocs: number[] = [];
  numberOfDocs: { [key: string]: number } = {}; // Dictionary to hold counts by product name
  lastReportGenerated: { [key: string]: string } = {}; // Dictionary to hold last report dates

  role: string = '';
  nameOfUser: string = '';
  isAdmin: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 5;

  isDownloadClicked: boolean = false;

  isProductListFetched: boolean = false
  downloadingDocument: string | null = null; // Track currently downloading document


  constructor(

    private sharedService: SharedService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private documentsService: DocumentsService) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.nameOfUser = this.authService.getNameOfUser();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductList();
    this.fetchStoredDocCounts();
  }

  fetchStoredDocCounts() {
    this.numberOfDocs = this.documentsService.getDocumentCounts();
    this.lastReportGenerated = this.documentsService.getLastReportGenerated();
  }

  fetchDocumentCounts() {
    const productRequests: Observable<number>[] = this.buProductValues.map(product => {
      return this.documentsService.getNoOfDocs(this.BuName, product);
    });

    forkJoin(productRequests).pipe(
      tap(counts => {
        this.buProductValues.forEach((product, index) => {
          this.numberOfDocs[product] = counts[index];
        });
      }),
      catchError(error => {
        // console.error('Error fetching document counts:', error);
        return of([]);
      })
    ).subscribe();
  }


  fetchLastReportGenerated() {
    const productRequests: Observable<string>[] = this.buProductValues.map(product => {
      return this.documentsService.fetchLastReportDate(product);
    });

    forkJoin(productRequests).pipe(
      tap(lastReportDates => {
        this.buProductValues.forEach((product, index) => {
          this.lastReportGenerated[product] = lastReportDates[index] || 'NA';
        });
        this.loading = false;
      }),
      catchError(error => {
        // console.error('Error fetching last report dates:', error);
        this.loading = false;
        return of([]);
      })
    ).subscribe();
  }

  paginatedProductValues(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = Math.min(start + this.itemsPerPage, this.filteredProductValues.length);
    return this.filteredProductValues.slice(start, end);  // No extra rows added
  }

  changePage(page: number) {
    if (page > 0 && page <= this.totalPages()) {
      this.currentPage = page;
    }
  }

  totalPages(): number {
    return Math.ceil(this.filteredProductValues.length / this.itemsPerPage);
  }

  downloadReport(event: Event, productName: string) {
    this.downloadingDocument = productName
    this.isDownloadClicked = true;

    event.stopPropagation();
    this.loading = true
    this.documentsService.downloadReport(this.nameOfUser, this.role, this.BuName, productName, '').subscribe(
      blob => {
        this.loading = false
        // Ensure a Blob object is returned before creating a downloadable link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${productName}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        this.isDownloadClicked = false; // Reset here after successful download
        this.downloadingDocument = null;
      },
      error => {
        if (error.status === 404) {
          alert('No reports available for this product.');
        } else {
          // Print error message for debugging purposes
          console.error('Error downloading report:', error.message);
        }
        this.downloadingDocument = null;
        this.isDownloadClicked = false; // Reset on error as well
      }
    );
  }
  




  navigateToBU() {
    if (this.isAdmin) {
      this.router.navigate(['/home'])
    } else {
      this.router.navigate(['/bu'])
    }
  }

  onSearch(event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (inputValue) {
      this.searchPerformed = true;
      this.filteredProductValues = this.buProductValues.filter(product =>
        product.toLowerCase().includes(inputValue)
      );
    } else {
      this.searchPerformed = false;
      this.filteredProductValues = [...this.buProductValues];
    }
  }

  getBuName() {
    this.BuName = this.sharedService.getBuName()
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buProductsList = data;
      if (this.BuName && this.buProductsList[this.BuName]) {
        this.buProductValues = this.buProductsList[this.BuName];
        this.filteredProductValues = [...this.buProductValues]; // Initial filtered list contains all products

        this.isProductListFetched = true;
        // Fetch document counts after loading products
        this.fetchDocumentCounts();
        this.fetchLastReportGenerated();
      }
    });
  }

  navigateToDocuments(productName: string) {
    this.sharedService.setProductName(productName)
    this.router.navigate(['/documents'])
  }

}
