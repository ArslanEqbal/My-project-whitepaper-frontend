import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SharedService } from '../../services/shared.service';
import { DocumentsService } from '../../services/documents.service';
import { UploadService } from '../../services/upload.service';
import { BlueprintService } from '../../services/blueprint.service';
import { AuthService } from '../../services/auth.service';
import { UploadExternalService } from '../../services/upload-external.service';

interface SubSection {
  form: FormGroup;
}

interface Section {
  form: FormGroup;
  subSections: SubSection[];
}

@Component({
  selector: 'app-blueprint',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './blueprint.component.html',
  styleUrl: './blueprint.component.css'
})
export class BlueprintComponent {

  BuName: string = '';
  productName: string = '';
  sections: Section[] = [];
  isCollapsed: boolean[] = [];
  showGenerationConfirmation: boolean = false;
  editReportName: boolean = false;
  loading: boolean = false; // Spinner control
  reportName: string = '';
  reportJson: any = {}
  defaultBlueprint: any = {
    "Strategic Goals and Objectives": {
      "How utility business unit deals with major challenges": "Description of major challenges and strategies."
    },
    "Xellent Product Spotlight": {
      "Introduction to Xellent": "An introduction to Xellent, covering the product's purpose, key features, and market positioning.",
      "Recent Updates and Roadmap": "Outlines recent updates to the Xellent product and highlights the future roadmap for upcoming features.",
      "Development Lifecycle of Xellent": "Explains the various stages of Xellent's development lifecycle, from initial design to final deployment.",
      "How to Create and Update Jira": "Provide an overview about creating and updating issues in Jira that are related to EG utility Xellent."
    },
    "Processes and Events in Xellent": {
      "Processes in Xellent": "All different types of delivery processes in EG utility Xellent.",
      "Development Team Events": "All different Development team events, time taken, and purpose of the event."
    }
  };

  role: string = '';
  nameOfUser: string = '';

  isAdmin: boolean = false;

  areResourceProcessed: boolean = false;
  reportNameError = '';
  reportNameMessage = '';
  isReportNameValid = false;


  constructor(private sharedService: SharedService, private uploadService: UploadService, private documentService: DocumentsService, private uploadExternalService: UploadExternalService,
    private authService: AuthService, private fb: FormBuilder, private http: HttpClient, private router: Router, private blueprintService: BlueprintService) { }

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.nameOfUser = this.authService.getNameOfUser();
    this.isAdmin = this.role === 'admin';
    this.getBuName();
    this.getProductName();

    this.checkResourcesProcessStatus();
    // this.onAddSection();
    this.initializeDefaultBlueprint();
    // Check if a report was previously generated
    this.checkForExistingBlueprint();
  }

  checkReportName(): void {
    // Reset the error message
    this.reportNameError = '';
    this.reportNameMessage = '';

    if (!this.reportName) {
      this.reportNameMessage = '';
      this.isReportNameValid = false;
      return;
    }

    this.isReportNameValid = true;

    // Check if the report name length is between 3 and 40
    if (this.reportName.length < 3 || this.reportName.length > 40) {
      this.reportNameError = 'Report Name must be between 3 and 40 characters.';
      this.reportNameMessage = '';
      this.isReportNameValid = false;
      return;
    }

    // Regular expression to allow letters, numbers, hyphens, underscores, and spaces
    let reportNamePattern: RegExp = /^[A-Za-z0-9 _-]+$/;

    // Check if the report name matches the allowed pattern
    if (!reportNamePattern.test(this.reportName)) {
      this.reportNameError = 'Name can only contain letters, numbers, hyphens, underscores, and spaces.';
      this.reportNameMessage = '';
      this.isReportNameValid = false;
      return;
    }

    this.isReportNameValid = true;
  }

  checkResourcesProcessStatus() {
    this.uploadExternalService.checkResourceStatus(this.productName.toLowerCase()).subscribe((status: any) => {
      let isResourceAvailable = status.isFileAvailable;
      let resourceProcessedStatus = status.isFileProcessed;

      if (isResourceAvailable == true && resourceProcessedStatus == 'true') {
        this.areResourceProcessed = true
      }
      else {
        this.areResourceProcessed = false
      }
    });
  }

  navigateToBUList() {
    if (this.isAdmin) {
      this.router.navigate(['/home'])
    } else {
      this.router.navigate(['/bu'])
    }
  }

  navigateToProducts() {
    this.router.navigate(['/product']);
  }

  navigateToDocuments() {
    this.router.navigate(['/documents'])
  }

  initializeDefaultBlueprint() {
    this.defaultBlueprint = {
      [this.BuName + " Goals and Objectives"]: {
        ["How " + this.BuName + " deals with major challenges"]: "Description of major challenges and strategies."
      },
      [this.productName + " Product Spotlight"]: {
        ["Introduction to " + this.productName]: "An introduction to " + this.productName + ", covering the product's purpose, key features, and market positioning.",
        ["Recent Updates and Roadmap"]: "Outlines recent updates to the " + this.productName + " product and highlights the future roadmap for upcoming features.",
        ["Development Lifecycle of " + this.productName]: "Explains the various stages of " + this.productName + "'s development lifecycle, from initial design to final deployment.",
        ["How to Create and Update Jira"]: "Provide an overview about creating and updating issues in Jira that are related to EG " + this.BuName + " " + this.productName + "."
      },
      ["Processes and Events in " + this.productName]: {
        ["Processes in " + this.productName]: "All different types of delivery processes in EG " + this.BuName + " " + this.productName + ".",
        ["Development Team Events"]: "All different Development team events, time taken, and purpose of the event."
      }
    };
  }

  getBuName() {
    this.BuName = this.sharedService.getBuName();
  }

  getProductName() {
    this.productName = this.sharedService.getProductName();
  }

  onRemoveSubSection(sectionIndex: number, subSectionIndex: number) {
    if (this.sections[sectionIndex].subSections.length > 1) {
      this.sections[sectionIndex].subSections.splice(subSectionIndex, 1);
    }
  }

  onDeleteSection(sectionIndex: number) {
    if (this.sections.length > 1) {
      this.sections.splice(sectionIndex, 1);
      this.isCollapsed.splice(sectionIndex, 1);
    } else {
      alert('At least one section must be present.');
    }
  }

  toggleCollapse(index: number) {
    this.isCollapsed[index] = !this.isCollapsed[index];
  }

  onAddSubSection(index: number) {
    const subSectionForm = this.fb.group({
      subheading: [''],
      description: ['']
    });
    this.sections[index].subSections.push({ form: subSectionForm });
    this.isCollapsed.push(true);
  }

  onAddSection() {
    const sectionForm = this.fb.group({
      heading: ['', Validators.required]
    });
    const defaultSubSection = this.fb.group({
      subheading: ['', Validators.required],
      description: ['', Validators.required]
    });

    this.sections.push({ form: sectionForm, subSections: [{ form: defaultSubSection }] });
  }


  checkForExistingBlueprint() {
    this.uploadService.fetchBlueprint(this.productName.toLowerCase()).subscribe(
      (data) => {
        this.populateBlueprintSections(data);
      },
      (error) => {
        // Check if error is 404 (not found)
        if (error.status === 404) {
          this.populateBlueprintSections(this.defaultBlueprint);
        } else {
          console.error('Error fetching blueprint:', error);
        }
      }
    );
  }


  populateBlueprintSections(data: any) {
    // Clear out any existing sections first
    this.sections = [];

    // Use data or default blueprint directly
    const blueprint = data;


    // Loop through each section in the blueprint
    for (const heading in blueprint) {
      if (blueprint.hasOwnProperty(heading)) {
        // Create a new form group for the section
        const sectionForm = this.fb.group({
          heading: [heading, Validators.required]  // Bind the heading
        });

        // Create sub-sections
        const subSections = [];
        for (const subHeading in blueprint[heading]) {
          if (blueprint[heading].hasOwnProperty(subHeading)) {
            // Create a form group for each sub-section
            const subSectionForm = this.fb.group({
              subheading: [subHeading, Validators.required],  // Bind the subheading
              description: [blueprint[heading][subHeading], Validators.required]  // Bind the description
            });
            subSections.push({ form: subSectionForm });
          }
        }

        // Add the section and its subsections to the sections array
        this.sections.push({ form: sectionForm, subSections: subSections });
        this.isCollapsed.push(true);
      }
    }
  }

  enableEditReportName() {
    this.editReportName = true;
  }


  // Save the blueprint back to Flask/Azure
  saveBlueprint() {
    this.loading = true; // Show the spinner when saving starts
    const blueprint = this.buildReportJson();

    if (blueprint == "Invalid Json. Please check all fields") {
      alert("Invalid JSON. Please check all fields")
      this.loading = false; // Hide the spinner if there's an error
      return
    }
    else {
      this.uploadService.saveBlueprint(this.productName.toLowerCase(), blueprint).subscribe(
        (response) => {
          const timestamp = this.formatDate(new Date());
          this.reportName = `${this.productName}_Report_${timestamp}`;
          this.showGenerationConfirmation = true;
        },
        (error) => {
          console.error('Error saving blueprint:', error);
          this.loading = false; // Hide the spinner if there's an error
        }
      );
    }
  }

  abortSave() {
    this.showGenerationConfirmation = false
    this.loading = false;
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }
  buildReportJson() {
    const templateJson: any = {}; // Initialize the template_json object

    for (const section of this.sections) {
      const heading = section.form.get('heading')?.value;

      if (heading.trim() === '') {
        this.reportJson = "Invalid JSON. Please check all fields";
        return this.reportJson; // Stop processing and return the error message
      }

      templateJson[heading] = {}; // Create a new object for each heading

      for (const subSection of section.subSections) {
        const subHeading = subSection.form.get('subheading')?.value;
        const description = subSection.form.get('description')?.value;

        if (subHeading.trim() === '' || description.trim() === '') {
          this.reportJson = "Invalid JSON. Please check all fields";
          return this.reportJson; // Stop processing and return the error message
        }

        templateJson[heading][subHeading] = description; // Add subheading and description to the heading
      }
    }

    this.reportJson = templateJson; // Store the reportJson with the template_json structure
    return this.reportJson; // Return the constructed reportJson
  }


  generateReport() {
    this.showGenerationConfirmation = false;
    this.blueprintService.generateReport(this.reportJson, this.BuName, this.productName, this.reportName, this.nameOfUser, this.role).subscribe(
      (response) => {
        this.documentService.setProgressStatusForProduct(this.productName, false, false, false, 0);

        this.loading = false; // Hide the spinner after successful generation
        this.showGenerationConfirmation = false;
        this.router.navigate(['/onboarding-report'])
      },
      (error) => {
        this.loading = false; // Hide the spinner if there's an error
        console.error('Error generating onboarding material:', error);
        alert("Error generating onboarding material. Contact administrator")
        this.router.navigate(['/documents'])
      }
    );
  }


  // Add a new method to check the form's validity
  isFormInvalid() {
    // Check if any section or its sub-sections have invalid forms
    for (const section of this.sections) {
      if (section.form.invalid) {
        return true; // At least one section's heading is invalid
      }

      for (const subSection of section.subSections) {
        if (subSection.form.invalid) {
          return true; // At least one sub-section is invalid
        }
      }
    }

    return false; // All forms are valid
  }


}
