import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-splash',
  templateUrl: './custom-splash.component.html',
  styleUrls: ['./custom-splash.component.scss'],
  imports: [CommonModule]
})
export class CustomSplashComponent implements OnChanges {
  @Input() showSplash = true;
  @Input() isOnline = true;

  showOnlineMessage = false;
  private wasOffline = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOnline']) {
      if (this.isOnline && this.wasOffline) {
        this.showOnlineMessage = true;
        setTimeout(() => {
          this.showOnlineMessage = false;
        }, 1500); // Show green message for 1.5s
      }
      this.wasOffline = !this.isOnline;
    }
  }
}
