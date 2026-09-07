import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrl: './client.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ClientComponent {
  constructor() {}
  logout(): void { 
  }
} 