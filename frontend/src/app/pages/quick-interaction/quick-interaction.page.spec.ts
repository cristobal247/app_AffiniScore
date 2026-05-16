import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickInteractionPage } from './quick-interaction.page';

describe('QuickInteractionPage', () => {
  let component: QuickInteractionPage;
  let fixture: ComponentFixture<QuickInteractionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickInteractionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickInteractionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});