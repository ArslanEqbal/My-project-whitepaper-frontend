import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChatService } from '../../services/chat.service';
import { HistoryService } from '../../services/history.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.css'
})
export class FeedbackComponent {

  showPopup: boolean = true;
  feedbackText: string = '';
  isSubmitDisabled: boolean = true;
  successMessage: string | null = null; // New variable to hold success message

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private _snackBar: MatSnackBar,
    private historyService: HistoryService
  ) { }

  updateSubmitButtonState() {
    this.isSubmitDisabled = this.feedbackText.trim() === '';
  }

  cancelButton() {
    this.showPopup = false;
  }
  submitFeedback(feedbackText: string) {
    const messageId = this.data.messageId;
    const helpfulOrNotHelpful = this.data.helpful_nothelpful;

    this.feedbackText = feedbackText;

    this.router.navigateByUrl('/chat');

    // Data to send to the backend
    const data = {
      messageId: messageId,
      helpful_nothelpful: helpfulOrNotHelpful,
      feedback: this.feedbackText,
    };

    // Call the updateChatHistory method to update feedback
    this.historyService.updateChatHistory({ data: data })
      .subscribe((response: any) => {
        this.successMessage = "Feedback submitted successfully!"

        // Automatically close the popup after 3 seconds
        setTimeout(() => {
          this.showPopup = false;
          this.successMessage = null; // Optionally reset the message
        }, 3000);
      }, (error) => {
        console.error('Error updating feedback:', error);
      });
  }



  ngOnInit(): void {
  }

}

