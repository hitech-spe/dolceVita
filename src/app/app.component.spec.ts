import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { WarmupService } from './services/warmup.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockWarmupService: jasmine.SpyObj<WarmupService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      user$: of(null)
    });
    mockWarmupService = jasmine.createSpyObj('WarmupService', ['startKeepAlive', 'stopKeepAlive']);

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: WarmupService, useValue: mockWarmupService }
      ]
    }).compileComponents();
  });

  it('should create the app and start keep-alive', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.title).toEqual('hi-tech');
    expect(mockWarmupService.startKeepAlive).toHaveBeenCalledWith(10);
  });

  it('should stop keep-alive on destroy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.destroy();
    expect(mockWarmupService.stopKeepAlive).toHaveBeenCalled();
  });
});
