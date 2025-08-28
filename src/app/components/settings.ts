import { Component } from '@angular/core';
import { PlaceholderComponent } from './placeholder';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PlaceholderComponent],
  template: `<app-placeholder pageTitle="Settings"></app-placeholder>`
})
export class SettingsComponent {}
