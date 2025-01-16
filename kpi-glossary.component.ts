import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-kpi-glossary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-glossary.component.html',
  styleUrl: './kpi-glossary.component.css'
})
export class KpiGlossaryComponent {

  constructor(
    private router: Router) { }

  ngOnInit() {
  }

  sections = {
    onboarding: true,
    chatbot: false
  };
  
  onboardingData = [
    { kpi: 'Total Users', description: 'Total no. of people with access to application, includes both Admin & Users' },
    { kpi: 'Active Users', description: 'Total no. of users who have downloaded/generated atleast 1 report during the selected time period' },
    { kpi: 'User Engagement Rate', description: 'Active Users [Selected time period filter]/ Total Users [All Time]' },
    { kpi: 'Total Downloads', description: 'Total no. of reports downloaded' },
    { kpi: 'Reports Generated', description: 'Total no. of reports generated' },
    { kpi: 'Reports Available', description: 'Total no. of reports available in Admin Dashboard' },
    { kpi: 'Top 5 Reports', description: 'Gives the Top 5 Reports with the highest no of downloads along with respective count of downloads for each report' },
    { kpi: 'Report Download Weekly Trend', description: 'No of report downloaded week-on-week trend. Weeks are denoted by the ending date for the week.' }
  ];
  
  chatbotData = [
    { kpi: 'Total Users', description: 'Total no. of people with access to application, includes both Admin & Users' },
    { kpi: 'Active Users', description: 'Total no of users who have asked atleast 1 query to chatbot during the selected time period' },
    { kpi: 'User Engagement Rate', description: 'Active Users [Selected time period filter]/ Total Users [All Time]' },
    { kpi: 'Average Queries per user', description: 'Average no. of queries asked to chatbot per user based on the selected filters. Total No of queries/Active Users' },
    { kpi: 'Feedback Score (based on responses receiving feedback)', description: 'Upvotes % gives percentage of responses receiving upvote out of Total responses receiving feedback (upvote/ downvote). The adjacent bracket indicates count of upvotes. Downvotes % gives percentage of responses receiving downvote out of Total responses receiving feedback (upvote/ downvote). The adjacent bracket indicates count of downvotes.' },
    { kpi: 'No of Queries –Weekly Trend', description: 'Week-on-week trend for the number of queries asked to chatbot. Weeks are denoted by the ending date for the week.' },
    { kpi: 'Feedback % -Weekly Trend (based on responses receiving feedback)', description: 'Week-on-week trend for the feedback provided-upvote and downvote %. Weeks are denoted by the ending date for the week.' }
  ];
  toggleSection(section: keyof typeof this.sections) {
    this.sections[section] = !this.sections[section];
  }  

  navigateToAnalytics() {
    this.router.navigate(['/usage-analytics'])
  }

}
