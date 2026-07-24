import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as turf from '@turf/turf';

@Injectable({ providedIn: 'root' })
export class CityPolygonService {
  private manilaPolygon: any = null;
  private qcPolygon: any = null;
  private polygonsLoaded = false;

  constructor(private http: HttpClient) {}

  async loadPolygons(): Promise<void> {
    if (this.polygonsLoaded) return;
    const [manila, qc] = await Promise.all([
      this.http.get('/assets/polygons/manila.geojson').toPromise(),
      this.http.get('/assets/polygons/quezon_city.geojson').toPromise()
    ]);
    this.manilaPolygon = manila;
    this.qcPolygon = qc;
    this.polygonsLoaded = true;
  }

  getLocationBadgeByCoords(
    coordinates: { lat: number; lng: number } | undefined | null
  ): { text: string; color: string; textColor: string } | null {
    if (!coordinates || !this.manilaPolygon || !this.qcPolygon) return null;
    const point = turf.point([coordinates.lng, coordinates.lat]);
    const manilaPoly = this.manilaPolygon.features[0];
    const qcPoly = this.qcPolygon.features[0];

    if (turf.booleanPointInPolygon(point, qcPoly)) {
      return { text: 'QC', color: '#222', textColor: '#fff' };
    }
    if (turf.booleanPointInPolygon(point, manilaPoly)) {
      return { text: 'Manila', color: '#ffc409', textColor: '#222' };
    }
    return null;
  }
} 