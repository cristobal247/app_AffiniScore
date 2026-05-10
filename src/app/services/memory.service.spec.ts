import { TestBed } from '@angular/core/testing';
import { MemoryService } from './memory.service';
import { SupabaseClientService } from './supabase-client.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let supabaseClientService: jasmine.SpyObj<SupabaseClientService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseClientService', ['getCurrentUser', 'getClient']);

    TestBed.configureTestingModule({
      providers: [
        MemoryService,
        { provide: SupabaseClientService, useValue: spy }
      ]
    });

    service = TestBed.inject(MemoryService);
    supabaseClientService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getSharedMemories method', () => {
    expect(service.getSharedMemories).toBeDefined();
  });

  it('should have uploadMemoryImage method', () => {
    expect(service.uploadMemoryImage).toBeDefined();
  });

  it('should have saveSharedMemory method', () => {
    expect(service.saveSharedMemory).toBeDefined();
  });

  it('should have uploadMemoryVoiceNote method', () => {
    expect(service.uploadMemoryVoiceNote).toBeDefined();
  });

  it('should have updateMemoryNotes method', () => {
    expect(service.updateMemoryNotes).toBeDefined();
  });

  it('should have updateMemoryVoiceNote method', () => {
    expect(service.updateMemoryVoiceNote).toBeDefined();
  });
});
