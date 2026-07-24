import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  templateUrl: './role-selection.page.html',
  styleUrls: ['./role-selection.page.scss'],
  imports: [LucideIconsModule, IonicModule, FormsModule, CommonModule],
})
export class RoleSelectionPage implements OnInit {
  selectedRole: string | undefined;
  features: Feature[] = [
    {
      title: 'Client',
      description: 'Find and book gym sessions with certified coaches in your area.',
      icon: 'user',
    },
    {
      title: 'Coach',
      description: 'Offer your training services and manage your fitness classes.',
      icon: 'user',
    },
  ];

  private router = inject(Router);

  constructor() {}

  ngOnInit() {}

  async onRoleSelect(feature: Feature) {
    this.selectedRole = feature.title;

    await new Promise(resolve => setTimeout(resolve, 300));

    const routeToNavigate = feature.title.toLowerCase() === 'client' 
      ? '/cl-registration' 
      : '/coach-registration';
      
    await this.router.navigate([routeToNavigate]);
    
    // Reset selection after navigation for a clean state if the user navigates back
    this.selectedRole = undefined;
  }

  async goToLogin() {
    await this.router.navigate(['/login']);
  }
}
