import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NotificationPage } from './notification.page';
import { NotificationService } from 'src/app/services/notification.service';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    NotificationPage,
    LucideIconsModule,
    RouterModule.forChild([
      {
        path: '',
        component: NotificationPage,
      },
    ]),
  ],
  providers: [NotificationService],
})
export class NotificationPageModule {}
