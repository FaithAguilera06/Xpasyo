import { Component, OnInit, ViewChild, inject } from '@angular/core';
import {
  AnimationController,
  GestureController,
  Platform,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { NgForOf, CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import {
  IonContent,
  IonButton,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonLoading,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonFooter,
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  imports: [
    IonLoading,
    IonCol,
    IonRow,
    IonGrid,
    IonText,
    IonTitle,
    IonToolbar,
    IonHeader,
    IonContent,
    IonButton,
    IonFooter,
    IonCard,
    IonCardContent,
    IonCardTitle,
    LucideIconsModule,
    NgForOf,
    CommonModule,
    RouterLink,
  ],
  animations: [],
})
export class LandingPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  private animationCtrl = inject(AnimationController);
  private gestureCtrl = inject(GestureController);
  private platform = inject(Platform);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  isLoading = false;
  presentingElement: HTMLElement | null = null;

  features: Feature[] = [
    {
      icon: 'HeartPlus',
      title: 'Community Support',
      description: 'Connect with like-minded fitness enthusiasts.',
      color: 'black',
    },
    {
      icon: 'MapPinned',
      title: 'Best Gyms Nearby',
      description: 'Find top-rated gyms in your area easily.',
      color: 'black',
    },
  ];

  ngOnInit() {
    this.presentingElement = document.querySelector('.ion-page');
    setTimeout(() => {
      this.initializeAnimations();
    }, 500);
  }

  ionViewWillEnter() {}

  async handleJoinNow() {
    try {
      if (this.platform.is('capacitor')) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
      this.isLoading = true;
      await this.simulateSignUpProcess();
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      await this.showErrorAlert('Something went wrong. Please try again.');
    }
  }

  navigateToRoleSelection() {
    this.router.navigate(['/login']);
  }

  private async simulateSignUpProcess(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
      mode: 'md', // Android style alert
    });
    await alert.present();
  }

  private initializeAnimations() {
    // No floating circles or feature animations to initialize
  }

  private animateHeroContent() {
    const heroElements = document.querySelectorAll('.hero-content > *');
    heroElements.forEach((element, index) => {
      const animation = this.animationCtrl
        .create()
        .addElement(element)
        .duration(600)
        .delay(index * 150)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(30px)', 'translateY(0)');
      animation.play();
    });
  }
}
