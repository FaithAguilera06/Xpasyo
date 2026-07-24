import { Component, Input } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'android/app/src/main/assets/public/assets/icon/lucide-icons.module';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,LucideAngularModule,LucideIconsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Terms and Conditions</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <lucide-icon name="x"></lucide-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <div class="modal-body">
      <div class="terms-content">
        <p style="white-space: pre-line;">{{ termsText }}</p>
      </div>
    </div>
    
    <div class="fixed-bottom">
      <ion-item lines="none">
        <ion-checkbox slot="start" [(ngModel)]="agreed"></ion-checkbox>
        <ion-label>I agree to the terms and conditions</ion-label>
      </ion-item>
      <ion-button expand="block" color="primary" [disabled]="!agreed" (click)="proceed()">
        Proceed
      </ion-button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 90vh;
    }
    
    ion-header {
      flex-shrink: 0;
    }
    
    .modal-body {
      flex: 1;
      overflow: hidden;
      padding: 16px;
    }
    
    .terms-content {
      height: 100%;
      overflow-y: auto;
      font-size: 0.9rem;
      line-height: 1.4;
      padding-right: 8px;
    }
    
    .terms-content::-webkit-scrollbar {
      width: 6px;
    }
    
    .terms-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .terms-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    .terms-content::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    .fixed-bottom {
      flex-shrink: 0;
      padding: 16px;
      background: white;
      border-top: 1px solid #e0e0e0;
    }
    
    ion-item {
      margin-bottom: 16px;
    }
    
    ion-button {
      margin: 0;
    }
  `]
})
export class TermsModalComponent {
  @Input() termsText: string = `XPASYO – Terms and Conditions\nBy using the XPASYO application and participating in any class or group activity as a Client, you agree to the following terms and conditions:\n\n1. Fee Structure\n1.1. When you join a class or activity, the initial fee displayed is an estimate. This estimate is calculated by dividing the total class fee by the projected number of participants.\n\n1.2. You will receive an official in-app notification with the final, exact amount due once enrollment for the class is complete. This final amount is based on the actual number of enrollees.\n\n1.3. Minimum Participant Fee Adjustment: If a class does not meet its projected total number of participants, the existing clients within that class may be required to pay an additional amount. This adjustment ensures that the coach's total required fee for the class is fulfilled. The specific additional amount will be communicated to you in the final fee notification.\n\n2. Payment Requirements & Deadline\n2.1. All users are required to pay the full and exact amount specified in the final notification. Overpayments and underpayments are not permitted. XPASYO is committed to maintaining fairness and transparency for all users.\n\n2.2. Deadline of Payment: Payment for a confirmed class enrollment must be completed at least two (2) days before the scheduled class date. You will receive an in-app notification confirming receipt of your payment or if your payment has been rejected. Failure to meet this payment deadline may result in the cancellation of your enrollment.\n\n2.3. Payment Details: All necessary payment details will be made visible within the XPASYO app when you proceed with the payment process.\n\n3. Cancellation and Refund Policy (Client)\n3.1. Payment Verification for Refunds: All refund requests are subject to verification of the submitted payment receipt. If the provided receipt is deemed illegitimate or if the Coach/XPASYO has not received the corresponding payment for the class, your refund request may be rejected, and your participation in the class may be revoked, even if you previously joined in the app. You must submit a legitimate picture of your official receipt for all payment-related inquiries, including refund requests.\n\n3.2. Client-Initiated Cancellation:\n* Prior to Class Start: If you cancel your enrollment before the official start date of the class and a significant percentage of class slots are still open (as determined by XPASYO's policy), you may be eligible for a full refund.\n* Within 24 Hours of Class Start: Cancellations made within 24 hours of the scheduled class start time, or after the class has officially begun, are generally non-refundable.\n* All cancellation requests must be submitted through the XPASYO app's designated cancellation feature.\n\n3.3. XPASYO or Coach-Initiated Cancellation:\n* In the event that XPASYO or the Coach cancels a class (e.g., due to insufficient enrollment, coach unavailability, unforeseen circumstances, or a venue issue), registered clients will receive a full refund for the fees paid for that specific class.\n* Refunds for such cancellations will be processed automatically within [Insert Number] business days.\n\n3.4. Refund Processing: Approved refunds will be processed via your original payment method. Please allow [Insert Number] business days for the refund to reflect in your account, depending on your bank or payment provider.\n\n4. Client Journey (Process)\n4.1. Selecting a Class: As a client, you'll first browse available gyms and classes within the XPASYO app based on your preferences.\n\n4.2. Joining and Payment: After selecting a class, you'll join it within the app and be required to pay the class fee. Remember that payment is due at least two (2) days before the scheduled class. You'll receive notifications confirming if your payment is accepted or rejected.\n\n4.3. Class Day: On the day of the class, you must bring your XPASYO app and present your class confirmation to the Coach and/or the facility owner to verify your participation. Then, you can enjoy the class and stay fit!\n\n5. Prohibited Conduct\n5.1. XPASYO has a zero-tolerance policy for fraud. Scamming, using dummy accounts, or engaging in any fraudulent behavior (including but not limited to misrepresenting payment, submitting illegitimate receipts, false refund claims, or disrupting class activities) will result in immediate suspension or permanent banning from the application.\n\n6. Governing Law & Dispute Resolution (Ruling)\n6.1. These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines.\n\n6.2. Any dispute, controversy, or claim arising out of or relating to these Terms and Conditions, or the breach, termination, or invalidity thereof, shall first be attempted to be settled amicably between the parties. If an amicable resolution cannot be reached within thirty (30) days, the dispute shall be submitted to the competent courts of Metro Manila, Philippines, to the exclusion of all other courts.`;
  agreed = false;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss(false);
  }

  proceed() {
    this.modalCtrl.dismiss(true);
  }
} 