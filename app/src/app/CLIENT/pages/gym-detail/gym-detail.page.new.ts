import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GymService, Gym, Schedule as GymServiceSchedule } from '../../../services/gym.service';

// Class schedule interfaces
interface ClassItem {
  time: string;
  className: string;
  day?: string;
  classes?: ClassItem[];
}

interface ScheduleDay {
  isOpen: boolean;
  open?: string;
  close?: string;
  classes?: ClassItem[];
}

type DaySchedule = ClassItem[] | ScheduleDay;

interface GymSchedule {
  [day: string]: DaySchedule;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface GymInfo {
  name: string;
  address: string;
  district: string;
  businessHours: string;
  description?: string;
  gym_description?: string;
  schedule?: GymServiceSchedule | GymSchedule;
  fitnessType?: string;
  classTypes?: any[];
  status?: string;
  image?: string;
}

interface GymDetail {
  id: string;
  gymInfo: GymInfo;
  coordinates?: Coordinates;
  gym_logo?: {
    data?: string;
  };
  schedule?: GymServiceSchedule | GymSchedule;
  [key: string]: any;
}

@Component({
  selector: 'app-gym-detail',
  templateUrl: './gym-detail.page.html',
  styleUrls: ['./gym-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideAngularModule]
})
export class GymDetailPage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  
  gym: GymDetail | null = null;
  isLoading = true;
  currentDay: string;
  map: any;
  daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    spaceBetween: 10,
    slidesPerView: 1.2,
    centeredSlides: true,
    autoplay: {
      delay: 3000,
    },
    loop: true
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private gymService: GymService
  ) {
    const today = new Date().getDay();
    this.currentDay = this.daysOfWeek[today];
  }

  ngOnInit() {
    const gymId = this.route.snapshot.paramMap.get('id');
    if (gymId) {
      this.loadGymDetails(gymId);
    } else {
      this.router.navigate(['/client/home']);
    }
  }

  ngAfterViewInit() {
    // Initialize map after view is ready
    if (this.gym?.coordinates) {
      this.initializeMap();
    }
  }

  loadGymDetails(gymId: string) {
    this.isLoading = true;
    this.gymService.getGymById(gymId)
      .then((gym: Gym | null) => {
        this.gym = gym as GymDetail;
        this.isLoading = false;
        // Initialize map if coordinates are available
        if (this.gym && this.gym.coordinates) {
          setTimeout(() => this.initializeMap(), 100);
        }
      })
      .catch((error: any) => {
        console.error('Error loading gym details:', error);
        this.isLoading = false;
        this.router.navigate(['/client/home']);
      });
  }

  // Check if the schedule is in the class format (array of classes)
  isClassSchedule(schedule: any): schedule is GymSchedule {
    if (!schedule) return false;
    
    // Check if any day has an array of classes
    return Object.values(schedule).some(daySchedule => {
      return Array.isArray(daySchedule) || 
             (daySchedule && typeof daySchedule === 'object' && 'classes' in daySchedule);
    });
  }

  // Check if there are any classes scheduled
  hasClassSchedule(): boolean {
    if (!this.gym?.gymInfo?.schedule) return false;
    
    const schedule = this.gym.gymInfo.schedule;
    
    // Check if any day has classes
    return Object.values(schedule).some(daySchedule => {
      if (!daySchedule) return false;
      
      // Handle array of classes
      if (Array.isArray(daySchedule)) {
        return daySchedule.length > 0;
      }
      
      // Handle object with classes array
      if (daySchedule && typeof daySchedule === 'object') {
        return daySchedule.classes && daySchedule.classes.length > 0;
      }
      
      return false;
    });
  }

  // Check if there are any classes scheduled across all days
  hasAnyClasses(): boolean {
    if (!this.gym?.gymInfo?.schedule) return false;
    
    // Check all days to see if any have classes
    return this.daysOfWeek.some(day => 
      this.getClassesForDay(day).length > 0
    );
  }

  // Get classes for a specific day
  getClassesForDay(day: string): Array<{time: string, className: string, day: string}> {
    if (!this.gym?.gymInfo?.schedule) return [];
    const daySchedule = this.gym.gymInfo.schedule[day.toLowerCase()];
    if (!daySchedule) return [];
    const result: Array<{time: string, className: string, day: string}> = [];
    // Handle array of classes
    if (Array.isArray(daySchedule)) {
      daySchedule.forEach((classItem: any) => {
        if (classItem?.time && classItem?.className) {
          result.push({
            time: classItem.time,
            className: classItem.className,
            day: day
          });
        }
      });
    }
    // Handle object with classes array
    else if (typeof daySchedule === 'object' && Array.isArray((daySchedule as any).classes)) {
      (daySchedule as any).classes.forEach((classItem: any) => {
        if (classItem?.time && classItem?.className) {
          result.push({
            time: classItem.time,
            className: classItem.className,
            day: day
          });
        }
      });
    }
    return result;
  }

  // Handle image loading errors
  onImageError(event: any) {
    event.target.src = 'assets/images/gym-placeholder.jpg';
  }

  // Navigate back to previous page
  goBack() {
    const currentPath = this.location.path();
    if (currentPath.includes('client/home')) {
      this.router.navigate(['/client/home']);
    } else {
      this.location.back();
    }
  }

  // Initialize map with gym location
  private initializeMap() {
    if (!this.gym?.coordinates || !this.mapContainer) return;
    // TODO: Implement map display here using a different library or custom solution.
    // Example: Use MapLibre GL, Google Maps, or simply show coordinates as text.
    // For now, this is a placeholder.
  }

  // Navigate to booking page
  bookNow() {
    if (this.gym?.id) {
      this.router.navigate(['/client/booking', this.gym.id]);
    }
  }
}
