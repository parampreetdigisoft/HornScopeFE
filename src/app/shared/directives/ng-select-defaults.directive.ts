import { Directive } from '@angular/core';
import { NgSelectComponent } from '@ng-select/ng-select';

@Directive({
  selector: 'ng-select',
  standalone: true,
})
export class NgSelectDefaultsDirective {
  constructor(ngSelect: NgSelectComponent) {
    ngSelect.markFirst = false;
  }
}
