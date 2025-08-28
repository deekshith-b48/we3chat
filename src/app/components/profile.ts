import { Component } from '@angular/core';
import { PlaceholderComponent } from './placeholder';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PlaceholderComponent],
  template: `<app-placeholder pageTitle="Profile"></app-placeholder>`
})
export class ProfileComponent {}
