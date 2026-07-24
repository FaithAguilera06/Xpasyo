import * as turf from '@turf/turf';
import manilaGeo from 'src/assets/polygons/manila.geojson';
import qcGeo from 'src/assets/polygons/quezon_city.geojson';

export function getLocationBadgeByCoords(
  coordinates: { lat: number; lng: number } | undefined | null
): { text: string; color: string; textColor: string } | null {
  if (!coordinates) return null;
  const point = turf.point([coordinates.lng, coordinates.lat]);
  const manilaPoly = manilaGeo.features[0];
  const qcPoly = qcGeo.features[0];

  if (turf.booleanPointInPolygon(point, qcPoly)) {
    return { text: 'QC', color: '#222', textColor: '#fff' };
  }
  if (turf.booleanPointInPolygon(point, manilaPoly)) {
    return { text: 'Manila', color: '#ffc409', textColor: '#222' };
  }
  return null;
}
