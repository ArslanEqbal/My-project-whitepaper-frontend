import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-evaluation-kpi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluation-kpi.component.html',
  styleUrl: './evaluation-kpi.component.css'
})
export class EvaluationKpiComponent {

  constructor(
    private router: Router) { }

  ngOnInit() {
  }

  evaluationKpiData = [
    { kpi: 'Contextual Precision', description: 'Grades on how good the retrieval system is at ranking relevant nodes higher in the retrieved context for the question/ report section asked​', inference: 'Higher score means the answer has relevant information for the input provided ranked higher than the irrelevant ones​​' },
    { kpi: 'Contextual Recall', description: 'Grades how complete the generated response was for the question/ report section specified.​', inference: 'A higher score indicates that the retrieval system is better capturing relevant information from the available knowledge base​​​' },
    { kpi: 'Contextual Relevancy', description: 'Grades how relevant the provided context was for the question/ report section specified.​​', inference: 'A higher score indicates that the right amount of information with minimal irrelevant content was used to generate the output​​​' },
    { kpi: 'Answer Relevancy​', description: 'Grades how relevant the output was to the question/ report section specified​', inference: 'Higher score means greater relevancy of output to the provided input.​' },
    { kpi: 'Faithfulness', description: 'Grades how factual the generated output was​', inference: 'Higher score means less hallucination/contradiction to the facts present from the LLM retrieved context​.​' }
  ];

  navigateBack() {
    this.router.navigate(['/evaluation-table'])
  }
}
