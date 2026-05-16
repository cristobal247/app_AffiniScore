import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly PROXIMITY_RADIUS_METERS = 50;

  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadius = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  async checkProximity(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<{ isNear: boolean; distance: number; error: any }> {
    try {
      const distance = this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
      return {
        isNear: distance < this.PROXIMITY_RADIUS_METERS,
        distance,
        error: null
      };
    } catch (error) {
      return { isNear: false, distance: -1, error };
    }
  }
}