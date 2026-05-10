import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { SupabaseClientService } from './supabase-client.service';

describe('LocationService', () => {
  let service: LocationService;
  let supabaseClientService: jasmine.SpyObj<SupabaseClientService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseClientService', ['getCurrentUser', 'getClient']);

    TestBed.configureTestingModule({
      providers: [
        LocationService,
        { provide: SupabaseClientService, useValue: spy }
      ]
    });

    service = TestBed.inject(LocationService);
    supabaseClientService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateHaversineDistance', () => {
    it('should calculate distance between two points', () => {
      // Coordenadas cercanas (distancia ~1.4 km)
      const distance = service.calculateHaversineDistance(
        40.7128, // New York lat
        -74.0060, // New York lon
        40.7580, // Más arriba
        -73.9855 // Más a la derecha
      );

      // Debería ser aproximadamente 5000-6000 metros
      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(6000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateHaversineDistance(40, -74, 40, -74);
      expect(distance).toBeLessThan(1); // Prácticamente 0
    });

    it('should handle different quadrants', () => {
      // Dos puntos en diferentes hemisferios
      const distance = service.calculateHaversineDistance(
        0, 0,     // Ecuador, Meridiano de Greenwich
        40, -74   // New York
      );

      // Debería ser varios miles de kilómetros
      expect(distance).toBeGreaterThan(1000000);
    });
  });

  describe('checkProximity', () => {
    it('should detect if points are within 50m radius', async () => {
      // Dos puntos muy cercanos (simulamos < 50m)
      const result = await service.checkProximity(
        40.712776, -74.005974,  // Punto 1
        40.712776, -74.005974   // Mismo punto (0m de distancia)
      );

      expect(result.isNear).toBe(true);
      expect(result.distance).toBeLessThan(50);
      expect(result.error).toBeNull();
    });

    it('should return false for distant points', async () => {
      // Nueva York a Los Ángeles
      const result = await service.checkProximity(
        40.7128, -74.0060,   // Nueva York
        34.0522, -118.2437   // Los Ángeles
      );

      expect(result.isNear).toBe(false);
      expect(result.distance).toBeGreaterThan(4000000); // > 4000 km
      expect(result.error).toBeNull();
    });
  });
});
