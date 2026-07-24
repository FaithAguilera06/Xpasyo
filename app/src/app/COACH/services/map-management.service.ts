import { Injectable, NgZone } from '@angular/core';
@Injectable({
  providedIn: 'root',
})
export class MapManagementService {
  private map: any = null;
  private userMarker: any = null;
  private userMarkerPopup: any = null;
  private gymMarkers: any[] = [];

  constructor(private zone: NgZone) {}

  getMapInstance() {
    return this.map;
  }

  setMapInstance(mapInstance: any) {
    this.map = mapInstance;
  }

  addUserLocationMarker(lng: number, lat: number, address: string) {
    if (!this.map) return;

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) return;

    if (this.userMarker) {
      this.userMarker.remove();
      if (this.userMarkerPopup) {
        this.userMarkerPopup.remove();
      }
    }

    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML =
      '<div class="location-pin"><div class="pin-inner"></div><div class="pin-ripple"></div></div>';

    const popup = new maplibregl.Popup({
      offset: [0, 60],
      closeButton: false,
      closeOnClick: false,
      className: 'user-location-popup',
    }).setHTML(`<b>Address:</b><br>${address}`);

    this.userMarker = new maplibregl.Marker({
      element: el,
    })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(this.map);

    popup.addTo(this.map);
    this.userMarkerPopup = popup;

    // Listen for zoom events to update popup content
    this.map.on('zoom', () => {
      this.updateUserLocationPopup(address);
    });
  }

  updateUserLocationPopup(address: string) {
    if (this.userMarkerPopup) {
      this.userMarkerPopup.setHTML(`<b>Address:</b><br>${address}`);
      this.userMarkerPopup.addTo(this.map); // Ensure it stays open
    }
  }

  updateUserLocationMarker(lng: number, lat: number) {
    if (!this.map) return;
    if (!this.userMarker) {
      this.addUserLocationMarker(lng, lat, '');
      return;
    }
    this.userMarker.setLngLat([lng, lat]);
    if (this.userMarkerPopup) {
      this.userMarkerPopup.setLngLat([lng, lat]);
    }
  }

  addGymMarkers(gyms: any[]) {
    if (!this.map) return;

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) return;

    // Clear existing markers
    this.gymMarkers.forEach((marker) => marker.remove());
    this.gymMarkers = [];

    gyms.forEach((gym) => {
      const lng = gym.coordinates?.lng || gym.longitude;
      const lat = gym.coordinates?.lat || gym.latitude;

      if (lat && lng) {
        const el = document.createElement('div');
        el.className = 'gym-marker';
        if (gym.isQuezonCity) {
          el.classList.add('quezon-city-marker');
        }

        el.innerHTML =
          '<div class="gym-marker-inner"><span class="gym-name">' +
          (gym.name || 'Gym') +
          '</span>' +
          (gym.distance
            ? '<span class="distance">' + gym.distance.toFixed(1) + ' km</span>'
            : '') +
          '</div>';

        const marker = new maplibregl.Marker({
          element: el,
        })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup().setHTML(
              '<div class="gym-popup">' +
                '<h3>' +
                (gym.name || 'Gym') +
                '</h3>' +
                '<p>' +
                (gym.gym_address || gym.address || '') +
                '</p>' +
                (gym.distance
                  ? '<p class="distance">' +
                    gym.distance.toFixed(1) +
                    ' km away</p>'
                  : '') +
                (gym.isQuezonCity
                  ? '<span class="qc-badge">Quezon City</span>'
                  : '') +
                '<button class="view-gym-btn" onclick="document.querySelector(\'app-coach-explore\').viewGymDetails(\'' +
                gym.id +
                '\')">View Details</button>' +
                '</div>'
            )
          )
          .addTo(this.map);

        this.gymMarkers.push(marker);
      }
    });
  }

  cleanupMapResources() {
    if (this.gymMarkers && this.gymMarkers.length > 0) {
      this.gymMarkers.forEach((marker) => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      this.gymMarkers = [];
    }

    if (this.userMarker && this.userMarker.remove) {
      this.userMarker.remove();
      this.userMarker = null;
    }

    if (this.userMarkerPopup && this.userMarkerPopup.remove) {
      this.userMarkerPopup.remove();
      this.userMarkerPopup = null;
    }

    if (this.map && this.map.remove) {
      this.map.remove();
      this.map = null;
    }
  }
}
