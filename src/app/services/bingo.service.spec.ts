import { TestBed } from '@angular/core/testing';
import { BingoService } from './bingo.service';
import { SupabaseClientService } from './supabase-client.service';

describe('BingoService', () => {
  let service: BingoService;
  let supabaseClientService: jasmine.SpyObj<SupabaseClientService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseClientService', ['getCurrentUser', 'getClient']);

    TestBed.configureTestingModule({
      providers: [
        BingoService,
        { provide: SupabaseClientService, useValue: spy }
      ]
    });

    service = TestBed.inject(BingoService);
    supabaseClientService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkBingoWin', () => {
    it('should detect horizontal win', () => {
      const completedCells = ['c1', 'c2', 'c3']; // Primera fila
      expect(service.checkBingoWin(completedCells)).toBe(true);
    });

    it('should detect vertical win', () => {
      const completedCells = ['c1', 'c4', 'c7']; // Primera columna
      expect(service.checkBingoWin(completedCells)).toBe(true);
    });

    it('should detect diagonal win', () => {
      const completedCells = ['c1', 'c5', 'c9']; // Diagonal principal
      expect(service.checkBingoWin(completedCells)).toBe(true);
    });

    it('should return false if no win', () => {
      const completedCells = ['c1', 'c2', 'c4']; // No forma línea
      expect(service.checkBingoWin(completedCells)).toBe(false);
    });

    it('should handle empty array', () => {
      expect(service.checkBingoWin([])).toBe(false);
    });
  });

  describe('calculateBingoPoints', () => {
    it('should calculate points correctly', () => {
      const completedCells = ['c1', 'c2', 'c3'];
      expect(service.calculateBingoPoints(completedCells)).toBe(30); // 3 * 10
    });

    it('should return 0 for empty array', () => {
      expect(service.calculateBingoPoints([])).toBe(0);
    });
  });
});
