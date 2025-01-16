import { ChangeDetectorRef, Component, ElementRef, HostListener, Renderer2, ViewChild } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UploadComponent } from '../../upload/upload.component';
import { AuthService } from '../../services/auth.service';
import { UsernameService } from '../../services/username.service';
import { ChatService } from '../../services/chat.service';
import { HistoryService } from '../../services/history.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { UploadExternalService } from '../../services/upload-external.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, UploadComponent, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'

})
export class ChatComponent {

  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef

  BuName: string = '';
  productName: string = '';
  uploadedFileName: any[] = [];
  modalMessage: string = '';
  fileNamesToDisplay: string[] = [];
  showAllReferences: { [messageId: string]: boolean } = {};
  username: string = '';
  chatContainer: boolean = true;
  chatMessages: { id: string; role: string; bu_name: string, product_name: string, question: string; content: any; loading: boolean; temperature: any; filenames: string[]; }[] = [];
  feedback: boolean = false;
  newMessage: string = '';
  isInputEmpty: boolean = true;
  thumbsUpClickedIds: Set<string> = new Set();
  thumbsDownClickedIds: Set<string> = new Set();
  loading: boolean = false;
  chatData: any[] = [];
  groupedChatData: any[] = [];
  selectedDayConversations: any[] = [];
  follow_up_ques: boolean = false;
  selectedConversationIndex: number | null = null;
  temperature: number = 0.1;
  conversationalId: string = '';
  messageId: string = '';
  fileUploadCompleted: boolean = false;
  isCopied: boolean = false;

  chatOptions: string[] = [];


  isResourceAvailable: boolean = false;
  isResourceProcessed: boolean = true; // show chat options by default
  isLoading!: boolean;

  showDeletionConfirmation: boolean = false;
  deletionError: boolean = false;
  errorMessage: string = '';
  isDeleting: boolean = false;
  conversationIndexToDelete: number | null = null; // Store the index of the conversation to delete
  isModalOpen = false;
  isInfoPopupVisible: boolean = false;

  @ViewChild('answerContainer') answerContainer!: ElementRef;

  constructor(
    private sharedService: SharedService,
    private usernameService: UsernameService,
    public chatService: ChatService,
    private router: Router,
    private historyService: HistoryService,
    private renderer: Renderer2,
    private el: ElementRef,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private uploadExternalService: UploadExternalService
  ) { }

  ngOnInit(): void {
    this.getBuName();
    this.getProductName();

    this.isLoading = true;
    // console.log('Initial loading state:', this.isLoading);

    this.uploadExternalService.checkResourceStatus(this.productName.toLowerCase()).subscribe((status: any) => {
      this.isResourceAvailable = status.isFileAvailable;
      let resourceProcessedStatus = status.isFileProcessed;

      if (this.isResourceAvailable == true && resourceProcessedStatus == 'true') {
        this.isResourceProcessed = true
      }
      else {
        this.isResourceProcessed = false
      }
      this.isLoading = false;

    });

    const storedUsername = this.authService.getUsername();
    this.username = storedUsername;
    this.chatService.clearChatMessages();
    this.chatService.fetch_chat_options(this.productName).subscribe(
      (response: string[]) => {
        this.chatOptions = response;
      },
      (error) => {
        // console.error('Error fetching chat options:', error);
      }
    );

    this.conversationalId = this.usernameService.generateUUID();
    this.chatService.chatMessages$.subscribe((messages) => {
      this.chatMessages = messages;
      this.chatContainer = true;
    });

    this.fetchData();
  }

  // ngAfterViewChecked() {
  //   this.scrollToBottom();
  // }

  ngAfterViewInit(): void {
    // Apply styles to tables after view initialization
    this.applyStylesToTable();
  }

  ngAfterViewChecked() {
    if (this.answerContainer) {
      this.bindClickEventToImages();
    }
  }

  bindClickEventToImages() {
    const answerEl = this.answerContainer.nativeElement;
    const images = answerEl.querySelectorAll('img'); // Find all img tags

    images.forEach((img: HTMLImageElement) => {
      this.renderer.listen(img, 'click', () => {
        this.openModal(img.src); // Open modal on image click
      });
    });
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

  getBuName() {
    this.BuName = this.sharedService.getBuName();
  }

  getProductName() {
    this.productName = this.sharedService.getProductName();
  }

  toggleReferences(messageId: string): void {
    this.showAllReferences[messageId] = !this.showAllReferences[messageId];
  }

  checkInput() {
    this.isInputEmpty = this.newMessage.trim() === '';
    const textarea = document.querySelector('.input_field') as HTMLTextAreaElement;
    const container = document.querySelector('.container') as HTMLElement;

    // Reset the height to auto to measure scrollHeight correctly
    textarea.style.height = 'auto';

    // Get the scrollHeight to determine the new height
    const scrollHeight = textarea.scrollHeight;

    // Set height based on content:
    if (scrollHeight <= 72) { // Assuming max height for 2 lines (72px)
      textarea.style.height = `${scrollHeight}px`;
    } else {
      textarea.style.height = '72px'; // Cap the height at 72px
    }

    // Reset to initial height (40px) if empty
    if (textarea.value.trim() === '') {
      textarea.style.height = '40px';
    }

    // Only adjust the container height if the textarea is at its max height
    if (scrollHeight > 72) {
      container.style.height = 'auto'; // Allow the container to grow
    } else {
      container.style.height = '50px'; // Keep it at the minimum height
    }
  }

  newConversation(): void {
    // this.chatService.clearChatMessages();
    this.fetchData();
    this.router.navigateByUrl('/chat');
    this.conversationalId = this.usernameService.generateUUID();
    this.selectedDayConversations = [];
    this.selectedConversationIndex = null;
    this.chatMessages = [];
    this.newMessage = ''
  }

  updateThumbsState(messageId: any, iconClicked: string, thumbsUp: boolean): void {
    if (thumbsUp) {
      this.thumbsDownClickedIds.delete(messageId);
      this.thumbsUpClickedIds.add(messageId);
    } else {
      this.thumbsUpClickedIds.delete(messageId);
      this.thumbsDownClickedIds.add(messageId);
    }
    this.updateFeedbackState();
    // Update this to send all content for messageId
    const data = {
      messageId,
      helpful_nothelpful: iconClicked,
    };
    this.historyService.updateChatHistory({ data }).subscribe();
  }

  thumbsUpClicked(i: any, iconClicked: string): void {
    this.getMessageId(i);
    this.updateThumbsState(this.messageId, iconClicked, true);
  }

  thumbsDownClicked(i: any, iconClicked: string): void {
    this.getMessageId(i);
    this.updateThumbsState(this.messageId, iconClicked, false);
  }

  getMessageId(index: number): void {
    // console.log("passed index", index)
    if (index >= 0 && index < this.selectedDayConversations.length) {
      const conversation = this.selectedDayConversations[index];
      // this.messageId = conversation.messageid;
      this.messageId = conversation.id;

      // Added else here instead of two ifs
    } else {
      if (index >= 0 && index < this.chatMessages.length) {
        const message = this.chatMessages[index];
        this.messageId = message.id;
      }
    }
  }

  isThumbsUpClicked(messageId: string): boolean {
    return this.thumbsUpClickedIds.has(messageId);
  }

  isThumbsDownClicked(messageId: string): boolean {
    return this.thumbsDownClickedIds.has(messageId);
  }

  updateFeedbackState(): void {
    this.feedback =
      this.thumbsUpClickedIds.size > 0 || this.thumbsDownClickedIds.size > 0;
  }

  feedbackPopup(messageId: string, iconClicked: string): void {
    // console.log(`Feedback popup triggered for message ID: ${messageId}`);

    const content = this.chatMessages.find((msg) => messageId.includes(msg.id));
    if (!content) {
      // console.warn(`No content found for message ID: ${messageId}`);
      return;
    }
    const response = content?.content.response;
    const question = content?.question;
    const answer = response || '';

    this.usernameService.feedback(messageId, iconClicked, question, answer, this.username);
  }

  sendMessage(follow_question?: string): void {
    let question = follow_question || this.newMessage.trim();
    if (!question) return;


    this.chatContainer = false;
    const timestamp = Date.now();
    const messageId = `${this.usernameService.generateUUID()}-${timestamp}`;
    this.newMessage = question;
    this.follow_up_ques = false;

    const lastAImessageIndex = this.chatMessages.length - 1;
    if (lastAImessageIndex >= 0 && this.chatMessages[lastAImessageIndex].role === 'AI') {
      this.chatMessages[lastAImessageIndex].content.followup_questions = [];
    }


    if (!follow_question) {
      this.chatMessages.push({
        id: messageId,
        role: 'user',
        bu_name: this.BuName,
        product_name: this.productName,
        question: this.newMessage,
        content: '',
        loading: true,
        temperature: this.temperature,
        filenames: []
      });
      this.newMessage = '';
      this.uploadedFileName = [];
    }

    this.loading = true;
    this.messageId = messageId;
    this.scrollToBottom();

    const data = {
      messageId,
      username: this.username,
      role: 'user',
      bu_name: this.BuName,
      product_name: this.productName,
      question,
      response: '',
      reference: '',
      relevance_score: 0,
      helpful_nothelpful: '',
      feedback: '',
      time_stamp: new Date(),
      temperature: this.temperature,
      conversationalId: this.conversationalId,
      filename: this.fileNamesToDisplay,
      link_filename: [],
      link_pagenumber: [],
      image_links: [],
      followup_questions: []
    };

    this.chatService.chat({
      question, messageId, username: this.username, temperature: this.temperature,
      conversationalId: this.conversationalId, bu_name: this.BuName, product_name: this.productName
    }).subscribe((response: any) => {
      // Log the response to check the structure
      console.log(response)

      if (response.followup_questions != 'NA' && response.followup_questions.length > 0) {
        this.follow_up_ques = true
        data.followup_questions = response.followup_questions
      }
      data.response = response.response;
      data.reference = response.reference;
      data.relevance_score = response.relevance_score;
      data.link_filename = response.filename;
      data.link_pagenumber = response.page_number;

      data.image_links = response.image_links

      // Push the AI response to chat messages
      this.chatMessages.push({
        id: messageId,
        role: 'AI',
        bu_name: this.BuName,
        product_name: this.productName,
        question: '',
        content: response,
        loading: false,
        temperature: this.temperature,
        filenames: []
      });


      const index = this.chatMessages.findIndex((message) => message.id === messageId);
      if (index !== -1) this.chatMessages[index].loading = false;

      // Update history with the new conversation question
      this.historyService.chatHistory({ data }).subscribe((flaskResponse: any) => {
        // Log the response from history service
        if (flaskResponse.message === 'Data inserted/updated successfully') {
          // Fetch data to refresh history view
          this.fetchData();
        }
      });

      // Force DOM changes detection, ensuring the response is rendered first
      this.cdRef.detectChanges();

      // Apply styles to tables after DOM is updated
      setTimeout(() => {
        this.applyStylesToTable();

        // After styling is applied, stop loading
        this.loading = false;
        this.fileNamesToDisplay = [];
        // Scroll to bottom after processing response and applying styles
        this.scrollToBottom();
      }, 0);

    }, (error) => {
      // console.error('Error in chat service:', error);
      this.loading = false;  // Stop loading in case of error
    });
  }

  sendButtonMessage(option: string) {
    const timestamp = Date.now();
    const messageId = `${this.usernameService.generateUUID()}-${timestamp}`;

    const lastAImessageIndex = this.chatMessages.length - 1;
    if (lastAImessageIndex >= 0 && this.chatMessages[lastAImessageIndex].role === 'AI') {
      this.chatMessages[lastAImessageIndex].content.followup_questions = [];
    }

    this.chatMessages.push({
      id: messageId,
      role: 'user',
      bu_name: this.BuName,
      product_name: this.productName,
      question: option,
      content: '',
      loading: true,
      temperature: this.temperature,
      filenames: []
    });

    this.follow_up_ques = false;

    this.chatService.chat({
      question: option, messageId, username: this.username, temperature: this.temperature,
      conversationalId: this.conversationalId, bu_name: this.BuName, product_name: this.productName
    }).subscribe((response: any) => {
      // console.log('AI Response:', response);

      const aiMessageContent = {
        response: response.response,
        reference: response.reference,
        relevance_score: response.relevance_score,
        filename: response.filename,
        page_number: response.page_number,
        followup_questions: response.followup_questions,
        image_links: response.image_links
      };

      this.chatMessages.push({
        id: messageId,
        role: 'AI',
        bu_name: this.BuName,
        product_name: this.productName,
        question: '',
        content: aiMessageContent,
        loading: false,
        temperature: this.temperature,
        filenames: []
      });

      const userMessageIndex = this.chatMessages.findIndex((message) => message.id === messageId);
      if (userMessageIndex !== -1) {
        this.chatMessages[userMessageIndex].loading = false;
      }

      if (response.followup_questions && response.followup_questions.length > 0) {
        this.follow_up_ques = true;
      }

      const data = {
        messageId,
        username: this.username,
        role: 'user',
        bu_name: this.BuName,
        product_name: this.productName,
        question: option,
        response: response.response,
        reference: response.reference,
        relevance_score: response.relevance_score,
        feedback: '',
        time_stamp: new Date(),
        temperature: this.temperature,
        conversationalId: this.conversationalId,
        filename: response.filename,
        link_filename: response.filename,
        link_pagenumber: response.page_number,
        image_links: response.image_links,
        followup_questions: response.followup_questions
      };

      this.historyService.chatHistory({ data }).subscribe((flaskResponse: any) => {
        if (flaskResponse.message === 'Data inserted/updated successfully') {
          this.fetchData();
        }
      });

      // Force DOM updates
      this.cdRef.detectChanges();

      // Apply styles to tables after response is rendered
      setTimeout(() => {
        this.applyStylesToTable();

        // Stop loading after styling
        this.loading = false;
        // Scroll to bottom after processing response and applying styles
        this.scrollToBottom();
      }, 0);


    }, (error) => {
      // console.error('Error in chat service:', error);
    });
  }


  applyStylesToTable(): void {

    const tables = this.el.nativeElement.querySelectorAll('table');
    // console.log(`Found ${tables.length} tables to style.`);

    tables.forEach((table: any) => {
      this.renderer.setStyle(table, 'width', '100%');
      this.renderer.setStyle(table, 'border-collapse', 'collapse');

      // Iterate over rows to handle empty rows or rows with unwanted content
      const trs = table.querySelectorAll('tr');
      trs.forEach((tr: any, index: number) => {
        // Get all the cell contents and check if they are empty or contain unwanted content
        const tds = Array.from(tr.querySelectorAll('td'));
        const isEmptyRow = tds.every((td: any) => !td.textContent.trim() || td.textContent.trim() === '**Resource');

        // If it's an empty or unwanted row, remove it
        if (isEmptyRow) {
          tr.remove();
          return;  // Skip the styling for this row
        }

        // Apply alternating row background colors
        if (index % 2 === 0) {
          this.renderer.setStyle(tr, 'background-color', '#f9f9f9');
        }

        // Add hover effect for rows
        this.renderer.listen(tr, 'mouseover', () => {
          this.renderer.setStyle(tr, 'background-color', '#ddd');
        });
        this.renderer.listen(tr, 'mouseout', () => {
          this.renderer.setStyle(
            tr,
            'background-color',
            index % 2 === 0 ? '#f9f9f9' : ''
          );
        });
      });

      // Apply styles to header cells
      const ths = table.querySelectorAll('th');
      ths.forEach((th: any) => {
        this.renderer.setStyle(th, 'background-color', '#f2f2f2');
        this.renderer.setStyle(th, 'text-align', 'left');
        this.renderer.setStyle(th, 'padding', '12px');
      });

      // Apply styles to data cells
      const tds = table.querySelectorAll('td');
      tds.forEach((td: any) => {
        this.renderer.setStyle(td, 'border', '1px solid #615e5e');
        this.renderer.setStyle(td, 'padding', '12px');
      });
    });
  }

  fetchData(): void {
    const storedUsername = this.username;
    if (!storedUsername) return;

    this.historyService
      .getConversationHistory({ username: storedUsername, product_name: this.productName })
      .subscribe((data: any) => {
        this.chatData = data;

        // Group and sort the chat history
        this.groupedChatData = this.groupConversationsByConversationalId(this.chatData);
        this.groupedChatData.sort((a, b) => {
          return (
            new Date(b.conversations[0].creation_time).getTime() -
            new Date(a.conversations[0].creation_time).getTime()
          );
        });

        // Call applyStylesToTable() after the history is rendered
        setTimeout(() => {
          this.applyStylesToTable();  // Ensure tables in the history are styled
        }, 100);
      });
  }


  groupConversationsByConversationalId(chatData: any[]): any[] {
    const groupedData: any[] = [];

    if (Array.isArray(chatData)) {
      chatData.forEach((conversation) => {
        const conversationalId = conversation.conversationalId;
        if (conversationalId) {
          const existingGroup = groupedData.find(
            (group) => group.conversationalId === conversationalId
          );
          if (existingGroup) {
            existingGroup.conversations.push(conversation);
          } else {
            groupedData.push({ conversationalId, conversations: [conversation] });
          }
        } else {
        }
      });
    }

    return groupedData;
  }

  selectDayConversation(dayIndex: number) {
    this.fileUploadCompleted = true;
    this.selectedConversationIndex = dayIndex;
    this.uploadedFileName = [];
    this.chatContainer = false;

    if (dayIndex >= 0 && dayIndex < this.groupedChatData.length) {
      // Sort conversations by creation_time
      this.selectedDayConversations = this.groupedChatData[dayIndex].conversations.sort(
        (
          a: { creation_time: string | number | Date },
          b: { creation_time: string | number | Date }
        ) => {
          return (
            new Date(a.creation_time).getTime() -
            new Date(b.creation_time).getTime()
          );
        }
      );

      this.chatMessages = [];

      // Get the last message id in the sorted conversations
      const lastMessageId = this.selectedDayConversations[this.selectedDayConversations.length - 1].id;

      this.selectedDayConversations.forEach((conversation) => {
        // Handle image links
        if (conversation.image_links != "None" && conversation.image_links != "") {
          if (typeof conversation.image_links === 'string') {
            conversation.image_links = conversation.image_links.split(',').map((ref: string) => ref.trim());
          }
        } else {
          conversation.image_links = [];
        }

        // Handle references
        if (conversation.reference != "") {
          conversation.referencesArray = conversation.reference.split(',').map((ref: string) => ref.trim());
        } else {
          conversation.referencesArray = [];
        }

        // Handle link filenames
        if (conversation.link_filename != "None" || conversation.link_filename == "") {
          if (typeof conversation.link_filename === 'string') {
            if (conversation.link_filename.length > 1) {
              conversation.link_filename = conversation.link_filename.split(/,\s+(?=[A-Z])/).map((ref: string) => ref.trim());
            } else {
              if (conversation.link_filename.length == 1 && conversation.link_filename != '') {
                conversation.link_filename = [conversation.link_filename];
              } else {
                conversation.link_filename = [];
              }
            }
          }
        } else {
          conversation.link_filename = [];
        }

        // Handle link page numbers
        if (conversation.link_pagenumber != "" || (conversation.link_pagenumber.length == 1 && conversation.link_pagenumber[0] === '')) {
          if (typeof conversation.link_pagenumber === 'string') {
            const regex = /\[[^\]]+\]/g;
            conversation.link_pagenumber = conversation.link_pagenumber.match(regex) || [];
          }
        } else {
          conversation.link_pagenumber = [];
        }

        this.temperature = conversation.temperature;

        // Handle filenames
        if (conversation.filenames == 'None') {
          this.fileNamesToDisplay = [];
        } else {
          this.fileNamesToDisplay = conversation.filenames;
        }
        let followupQuestions = (conversation.id === lastMessageId) ? conversation.followup_questions : [];

        // Handle follow-up questions
        if (followupQuestions && followupQuestions !== "None") {
          if (typeof followupQuestions === 'string') {
            // Regular expression to split questions based on '?,'
            const questionSeparatorRegex = /\?\s*,/g;
        
            // Use regex to split and map each question
            followupQuestions = followupQuestions.split(questionSeparatorRegex).map((question: string, index: number, arr: string[]) => {
              // Re-append '?' to all but the last question in the split array
              if (index < arr.length - 1) {
                return question.trim() + '?';
              }
              return question.trim(); // Last question does not need re-appending
            });
          } else {
            // If followup_questions is not a string, set it as an empty array
            followupQuestions = [];
          }
        } else {
          // If followup_questions is empty or invalid, set it to an empty array
          followupQuestions = [];
        }
        


        if (followupQuestions && followupQuestions.length > 0) {
          this.follow_up_ques = true;
        }
        const data = {
          response: conversation.response,
          reference: conversation.referencesArray,
          relevance_score: conversation.relevancy_score,
          filename: conversation.link_filename,
          page_number: conversation.link_pagenumber,
          image_links: conversation.image_links,
          followup_questions: followupQuestions
        };

        // console.log(data,"data")

        // Only include follow-up questions if this is the last message in the conversation

        this.chatMessages.push({
          id: conversation.id,
          role: 'user',
          bu_name: this.BuName,
          product_name: this.productName,
          question: conversation.question,
          content: data,
          loading: false,
          temperature: this.temperature,
          filenames: this.fileNamesToDisplay,
        });
      });

      this.loadConversationDetails(dayIndex); // Implement this method to load specific conversation details
    }
  }


  loadConversationDetails(index: number) {
    const selectedConversation = this.groupedChatData[index];
    // Assuming selectedConversation contains the necessary details for rendering
    // this.chatMessages = selectedConversation.conversations; // Update chatMessages to render
    this.cdRef.detectChanges();
    // Now call applyStylesToTable() after rendering the new data
    setTimeout(() => {
      this.applyStylesToTable();
      this.scrollToBottom();
    }, 0);
  }


  truncateQuestion(question: string): string {
    const maxLength = 40;
    return question.length > maxLength
      ? question.substring(0, maxLength) + '...'
      : question;
  }

  // Show the deletion confirmation popup
  showDeletionPopup(event: Event, index: number): void {
    event.stopPropagation();
    this.conversationIndexToDelete = index;
    this.showDeletionConfirmation = true;
  }

  deleteConversation(): void {
    if (this.conversationIndexToDelete === null) return;
    let index = this.conversationIndexToDelete
    if (index < 0 || index >= this.groupedChatData.length) { return; }
    this.isDeleting = true; // Show deleting message
    const selectedGroup = this.groupedChatData[this.conversationIndexToDelete];
    const conversationalId = selectedGroup.conversationalId;
    const storedUsername = this.username;
    if (!storedUsername) return;
    this.historyService.deleteConversationHistory({ username: storedUsername, conversationalId: conversationalId, })
      .subscribe((response: any) => {
        this.isDeleting = false;
        if (response.message === 'Data deleted successfully') {
          this.groupedChatData.splice(index, 1);
          this.selectedDayConversations = [];
          this.chatMessages = [];
          this.newConversation()
          this.showDeletionConfirmation = false; // Hide confirmation popup
        } else {
          this.deletionError = true; // Show error popup
          this.errorMessage = response.message; // Set error message
        }
      }, (error) => {
        this.isDeleting = false; // Hide deleting message
        this.deletionError = true; // Show error popup
        this.errorMessage = 'Failed to delete the conversation. Please try again.'; // Default error message
      });
  }

  renderTable(response: string): string {
    const tableContent = response.replace(/<br>/g, '\n');
    return tableContent;
  }
  copyResponse(i: any) {
    this.getMessageId(i);
    const messageId = this.messageId;

    if (!messageId) {
      console.error("Message ID is undefined or null.");
      return;
    }

    // Locate the response
    let response = this.selectedDayConversations.find(msg => msg.id === messageId && msg.user_role === 'user');

    if (!response) {
      response = this.chatMessages.find(msg => msg.id === messageId && msg.role === 'AI');
      response = response.content
    }

    if (!response) {
      console.error(`Message with ID ${messageId} not found.`);
      return;
    }

    // Get the HTML content and images from the response
    const content = response.response;
    const imageLinks = response.image_links;

    if (!content) {
      console.error("Response content is undefined or null.");
      return;
    }

    // Define styles to include in the HTML
    const styles = `
        <style>
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid #615e5e;
                padding: 12px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            tr:hover {
                background-color: #ddd;
            }
            .image-link {
                max-width: 100%;
                height: auto;
                margin-bottom: 10px;
            }
        </style>
    `;

    // Create HTML for the images
    let imagesHtml = '';
    if (imageLinks.length > 0) {
      imagesHtml = `<div>Relevant Images:</div><ul>`;
      imageLinks.forEach((image: any) => {
        imagesHtml += `<li><img src="${image}" alt="Image" class="image-link"></li>`;
      });
      imagesHtml += `</ul>`;
    }

    // Combine styles, content, and images into a single HTML string
    const html = `${styles}<div>${content}</div>${imagesHtml}`;

    // Create a Blob from the HTML content
    const blob = new Blob([html], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });

    // Use the Clipboard API to copy the content
    navigator.clipboard.write([clipboardItem]).then(() => {
      this.isCopied = true;
      // Reset the isCopied state after 2 seconds
      setTimeout(() => {
        this.isCopied = false;
      }, 2000); // Reset after 2000 milliseconds
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  }


  extractTextContent(html: string): string {
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Extract text content recursively
    return tempDiv.textContent || tempDiv.innerText || '';
  }


  displaySuccessMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 2000,
      panelClass: ['custom-snackbar']
    });
  }

  displayErrorMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 2000,
      panelClass: ['error-snackbar']
    });
  }

  getQuestionByMessageId(messageId: string): string {
    const message = this.chatMessages.find(msg => msg.id === messageId);
    if (message)
      return message.question;
    else
      return ''
  }
  regenerateResponse(i: any) {
    this.getMessageId(i);
    const messageId = this.messageId;
    const question = this.getQuestionByMessageId(messageId);

    const data = {
      username: this.username,
      messageId: messageId,
      question: question,
      response: '',
      reference: '',
      link_filename: '',
      link_pagenumber: '',
      image_links: ''
    };

    this.historyService.updateResponse({ data }).subscribe((resp: any) => {
      if (resp.message === 'Data inserted/updated successfully') {
        if (this.chatMessages[i].id) {
          this.chatMessages[i].content = '';
          this.chatMessages[i].loading = true;
        }

        this.chatService.chat({
          question, messageId, username: this.username, temperature: this.chatMessages[i].temperature,
          conversationalId: this.conversationalId, bu_name: this.BuName, product_name: this.productName
        }).subscribe((response: any) => {
          data.response = response.response;
          data.reference = response.reference;
          data.link_filename = response.filename;
          data.link_pagenumber = response.page_number;
          data.image_links = response.image_links;

          if (this.chatMessages[i].id) {
            this.chatMessages[i].content = response;
            this.chatMessages[i].loading = false;
          }

          // Force DOM updates
          this.cdRef.detectChanges();

          // Apply styles to tables after response is rendered
          setTimeout(() => {
            this.applyStylesToTable();

            // Stop loading after styling
            this.loading = false;

            // Scroll to bottom after processing response and applying styles
            this.scrollToBottom();
          }, 0);

          this.historyService.updateResponse({ data }).subscribe((resp: any) => {
            // console.log(resp);
          });
        });
      }
    });
  }


  navigateToHome() {
    this.router.navigate(['/home'])
  }

  modalImageUrl: string = '';
  @ViewChild('imageModal') imageModal!: ElementRef;
  @ViewChild('modalImage') modalImage!: ElementRef;

  openModal(imageUrl: string) {
    this.modalImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.modalImageUrl = '';
  }


  toggleInfoPopup() {
    this.isInfoPopupVisible = !this.isInfoPopupVisible;
  }

  // Close the popup when clicking outside of it
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isClickInside = target.closest('.info-popup') || target.classList.contains('info-icon');

    if (!isClickInside && this.isInfoPopupVisible) {
      this.isInfoPopupVisible = false;
    }
  }


}
