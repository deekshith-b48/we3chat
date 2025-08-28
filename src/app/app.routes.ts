import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard';
import { LoginComponent } from './components/login';
import { SignupComponent } from './components/signup';
import { ProfileComponent } from './components/profile';
import { SettingsComponent } from './components/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '/dashboard' }
];
