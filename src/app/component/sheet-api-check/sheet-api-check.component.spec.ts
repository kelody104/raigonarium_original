import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SheetApiCheckComponent } from './sheet-api-check.component';

describe('SheetApiCheckComponent', () => {
  let component: SheetApiCheckComponent;
  let fixture: ComponentFixture<SheetApiCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SheetApiCheckComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SheetApiCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
