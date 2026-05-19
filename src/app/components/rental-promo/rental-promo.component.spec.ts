import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RentalPromoComponent } from './rental-promo.component';

describe('RentalPromoComponent', () => {
  let component: RentalPromoComponent;
  let fixture: ComponentFixture<RentalPromoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentalPromoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RentalPromoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
