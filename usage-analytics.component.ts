import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UsageAnalyticsService } from '../services/usage-analytics.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlotlyModule } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';

PlotlyModule.plotlyjs = PlotlyJS;

@Component({
  selector: 'app-usage-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PlotlyModule], // Import PlotlyModule here
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add CUSTOM_ELEMENTS_SCHEMA
  templateUrl: './usage-analytics.component.html',
  styleUrl: './usage-analytics.component.css'
})
export class UsageAnalyticsComponent {

  role: string = '';
  BuName: string = '';
  productName: string = '';

  isAdmin: boolean = false;
  downvotesCount = 0;
  upvotesCount = 0
  buList: string[] = [];
  products: string[] = [];

  // INPUT FIELDS
  selectedBU: string = '';
  selectedProduct: string = 'All Products';
  selectedAnalysisType: string = '';
  selectedTimePeriod: string = '';

  // BOX OUTPUT - common
  activeUsers: number = 0;
  engagementRatePercentage = 0;

  // BOX OUTPUT - OM
  reportsAvailable: number = 0;
  totalDownloads: number = 0;
  reportsGenerated: number = 0;

  // BOX OUTPUT - QNA
  averageQueryPerUser = 0;
  upvotesPercentage = 0;
  downvotesPercentage = 0;

  // PLOT - OM
  products_report_download: any                  // left - all prods
  product_report_download: any                // left - 1 prod
  om_engagement_rate_weekly_trend: any       //right - all prods
  top_five_reports: any                     // right - 1 prod

  // PLOT - CHATBOT
  products_query_no: any                         // left - all prods
  product_query_no: any                         // left - 1 prod
  qna_engagement_rate_weekly_trend: any         //right - all prods
  feedback_weekly_trend: any                     // right - 1 prod

  leftPlotAvailable: boolean = true;
  rightPlotAvailable: boolean = true;
  someDataIsPresent: boolean = false;

  loading: boolean = false;
  isAnalyzeButtonClicked: boolean = false;

  noDataMessage = ''
  exportButtonDisabled: boolean = false;
  resultsLoading = false;

  noSelection = true;

  constructor(
    private authService: AuthService,
    private sharedService: SharedService,
    private http: HttpClient,
    private router: Router,
    private analyticsService: UsageAnalyticsService) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();
    this.getProductList();

    if (this.selectedBU && this.selectedProduct && this.selectedTimePeriod && this.selectedAnalysisType) {
      this.noSelection = false;
      this.getUsageBoxData();
    }
  }

  getProductList() {
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.buList = Object.keys(data);
    });
  }

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
    this.selectedProduct = this.productName ? this.productName : "All Products";
  }

  resetResults() {
    this.isAnalyzeButtonClicked = false;
    this.activeUsers = 0;
    this.engagementRatePercentage = 0
    this.reportsAvailable = 0
    this.totalDownloads = 0
    this.reportsGenerated = 0
    this.averageQueryPerUser = 0;
    this.upvotesPercentage = 0
    this.downvotesPercentage = 0
    this.leftPlotAvailable = true
    this.rightPlotAvailable = true
    this.exportButtonDisabled = false
    this.noDataMessage = ''
    this.someDataIsPresent = false
    this.noSelection = true
  }


  onBUChange(event: any) {
    this.resetResults();
    const selectedBU = event.target.value;
    this.selectedBU = selectedBU;
    this.sharedService.setSelectedBuName(this.selectedBU)
    this.sharedService.setBuName(this.selectedBU)
    this.selectedProduct = "All Products"
    this.http.get<any>('product_list.json').subscribe((data) => {
      this.products = data[selectedBU] || [];
    });
    this.selectedProduct = "All Products"
    this.exportButtonDisabled = false
    this.noDataMessage = ''
    if (this.selectedBU && this.selectedProduct && this.selectedTimePeriod && this.selectedAnalysisType) {
      this.noSelection = false;
      this.getUsageBoxData();
    }
  }

  onProductChange(event: any) {
    this.resetResults();
    const selectedProduct = event.target.value;
    this.selectedProduct = selectedProduct;
    this.sharedService.setSelectedProductName(this.selectedProduct)
    this.sharedService.setProductName(this.selectedProduct)
    this.productName = this.selectedProduct
    this.exportButtonDisabled = false
    this.noDataMessage = ''
    if (this.selectedBU && this.selectedProduct && this.selectedTimePeriod && this.selectedAnalysisType) {
      this.noSelection = false;
      this.getUsageBoxData();
    }
  }

  getUsageBoxData() {
    this.loading = true;
    this.resultsLoading = true;
    this.exportButtonDisabled = false
    this.noDataMessage = ''
    this.analyticsService.fetchUsageBoxData(this.selectedBU, this.selectedProduct.toLowerCase(), this.selectedAnalysisType, this.selectedTimePeriod).subscribe(response => {
      this.isAnalyzeButtonClicked = true;
      if (this.selectedAnalysisType === 'Onboarding Material') {
        this.activeUsers = response.active_users;
        this.engagementRatePercentage = Math.ceil(response.engagement_rate * 100);
        this.reportsAvailable = response.reports_avaliable;
        this.totalDownloads = response.total_downloads;
        this.reportsGenerated = response.reports_generated;

        if(this.activeUsers >0 || this.engagementRatePercentage >0|| this.reportsAvailable >0|| this.totalDownloads >0|| this.reportsGenerated >0 ) {
          this.someDataIsPresent = true;
        }

      } else if (this.selectedAnalysisType === 'Q&A Chatbot') {
        this.activeUsers = response.active_users;
        this.engagementRatePercentage = Math.ceil(response.engagement_rate * 100);
        this.averageQueryPerUser = response.queries_per_user.toFixed(1);
        this.upvotesPercentage = Math.round(response.upvotes * 100);
        this.downvotesPercentage = Math.min(100 - this.upvotesPercentage, Math.round(response.downvotes * 100));
        this.downvotesCount = response.downvotes_count
        this.upvotesCount = response.upvotes_count

        if(this.activeUsers>0 || this.engagementRatePercentage >0|| this.averageQueryPerUser >0|| this.upvotesCount >0|| this.downvotesCount>0 ) {
          this.someDataIsPresent = true;
        }
      }
      this.getLeftPlotData();
    }, error => {
      console.error('Error fetching usage data:', error);
      this.loading = false;
      this.resultsLoading = false; // Stop loading on error
    });
  }

  getLeftPlotData() {
    this.analyticsService.fetchLeftPlotData(this.selectedBU, this.selectedProduct.toLowerCase(), this.selectedAnalysisType, this.selectedTimePeriod)
      .subscribe(response => {
        if (response.message) {
          this.leftPlotAvailable = false;
        }
        else if (this.selectedAnalysisType === 'Onboarding Material') {
          // all products
          let parsedResponseAllProd = JSON.parse(response.stats_plot)
          this.products_report_download = {
            data: parsedResponseAllProd.data,
            layout: parsedResponseAllProd.layout
          };

          // one product
          let parsedResponse = JSON.parse(response.stats_plot)
          console.log(parsedResponse)
          this.product_report_download = {
            data: parsedResponse.data,
            layout: parsedResponse.layout
          };

        } else if (this.selectedAnalysisType === 'Q&A Chatbot') {
          // all products
          let parsedResponseAllProd = JSON.parse(response.stats_plot)
          this.products_query_no = {
            data: parsedResponseAllProd.data,
            layout: parsedResponseAllProd.layout
          };

          // one product
          let parsedResponse = JSON.parse(response.stats_plot)
          this.product_query_no = {
            data: parsedResponse.data,
            layout: parsedResponse.layout
          };
        }
        this.getRightPlotData();
      }, error => {
        console.error('Error fetching plot data:', error);
        this.resultsLoading = false;
      });
  }

  getRightPlotData() {
    this.analyticsService.fetchRightPlotData(this.selectedBU, this.selectedProduct.toLowerCase(), this.selectedAnalysisType, this.selectedTimePeriod)
      .subscribe(response => {

        if (response.message) {
          this.rightPlotAvailable = false;
        }
        else if (this.selectedAnalysisType === 'Onboarding Material') {
          // all products
          let parsedResponseAllProd = JSON.parse(response.stats_plot)
          this.om_engagement_rate_weekly_trend = {
            data: parsedResponseAllProd.data,
            layout: parsedResponseAllProd.layout
          };

          // one product
          let parsedResponse = JSON.parse(response.stats_plot)
          this.top_five_reports = {
            data: parsedResponse.data,
            layout: parsedResponse.layout
          };

        } else if (this.selectedAnalysisType === 'Q&A Chatbot') {
          // all products
          let parsedResponseAllProd = JSON.parse(response.stats_plot)
          this.qna_engagement_rate_weekly_trend = {
            data: parsedResponseAllProd.data,
            layout: parsedResponseAllProd.layout
          };

          // one product
          let parsedResponse = JSON.parse(response.stats_plot)
          this.feedback_weekly_trend = {
            data: parsedResponse.data,
            layout: parsedResponse.layout
          };
        }
        this.resultsLoading = false;
        this.loading = false;
      }, error => {
        console.error('Error fetching plot data:', error);
        this.resultsLoading = false;
      });
  }

  onFieldChange(){
    this.resetResults();
    if (this.selectedBU && this.selectedProduct && this.selectedTimePeriod && this.selectedAnalysisType) {
      this.noSelection = false;
      this.getUsageBoxData();
    }
  }

  async exportResults() {
    this.loading = true;

    try {
      const response: any = await this.analyticsService.exportStatistics(
        this.selectedBU,
        this.selectedProduct.toLowerCase(),
        this.selectedAnalysisType,
        this.selectedTimePeriod
      );

      this.loading = false;

      // If the response contains a message (no data case)
      if (response.message) {
        console.log('Message from server:', response.message);
        this.noDataMessage = response.message; // Update UI
        this.exportButtonDisabled = true; // Disable export button
      } else {
        // If the response is a Blob (CSV), trigger download
        const blob = response;
        const filename = `Usage_Analytics-${this.selectedAnalysisType}-${this.selectedBU}-${this.selectedProduct}-${this.selectedTimePeriod}.csv`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        URL.revokeObjectURL(link.href); // Clean up the URL object
      }
    } catch (error) {
      this.loading = false;
      console.error('Error exporting data:', error);
      this.exportButtonDisabled = true; // Disable export button
      this.noDataMessage = 'Failed to export data. Please try again later.';
    }
  }


  getAnalyseButtonTooltip(): string {
    if (!this.selectedAnalysisType) {
      return "Please select Analysis Type";
    }
    if (!this.selectedTimePeriod) {
      return "Please select a Time Period";
    }
    if (!this.selectedBU) {
      return "Please select a Business Unit";
    }
    if (!this.selectedProduct) {
      return "Please select a Product";
    }
    return "Click to Analyse";
  }

  navigateToHome() {
    this.router.navigate(['/home'])
  }

  navigateToGlossary() {
    this.router.navigate(['/kpi-glossary'])
  }
}
