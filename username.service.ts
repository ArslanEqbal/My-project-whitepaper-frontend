import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { v4 as uuidv4 } from 'uuid';
import { FeedbackComponent } from '../chatbot/feedback/feedback.component';

@Injectable({
  providedIn: 'root'
})
export class UsernameService {

  constructor(private dialog: MatDialog) { }

  feedback(messageId: string, helpfulNotHelpful: string, question: string, answer: string, username: string) {
    
    const dialogRef = this.dialog.open(FeedbackComponent, {
      data: { messageId, helpful_nothelpful: helpfulNotHelpful, question, answer, username },
    });
  }

  generateUUID(): string {
    return uuidv4();
  }
}


