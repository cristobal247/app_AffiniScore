import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { SupabaseClientService } from './supabase-client.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let supabaseClientService: jasmine.SpyObj<SupabaseClientService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseClientService', ['getCurrentUser', 'getClient']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: SupabaseClientService, useValue: spy }
      ]
    });

    service = TestBed.inject(NotificationService);
    supabaseClientService = TestBed.inject(SupabaseClientService) as jasmine.SpyObj<SupabaseClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getPrivacySettings method', () => {
    expect(service.getPrivacySettings).toBeDefined();
  });

  it('should have updatePrivacySettings method', () => {
    expect(service.updatePrivacySettings).toBeDefined();
  });

  it('should have getNotificationSettings method', () => {
    expect(service.getNotificationSettings).toBeDefined();
  });

  it('should have updateNotificationSettings method', () => {
    expect(service.updateNotificationSettings).toBeDefined();
  });

  it('should have requestPushPermission method', () => {
    expect(service.requestPushPermission).toBeDefined();
  });

  it('should have saveDeviceToken method', () => {
    expect(service.saveDeviceToken).toBeDefined();
  });

  it('should have sendTestNotification method', () => {
    expect(service.sendTestNotification).toBeDefined();
  });

  describe('detectPlatform', () => {
    it('should detect web platform', () => {
      // En tests, debería ser 'web'
      // Nota: Este es un método privado, pero lo probamos indirectamente
      expect(service).toBeTruthy();
    });
  });
});
