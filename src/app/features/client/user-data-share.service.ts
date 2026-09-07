import { inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { UserService } from 'src/app/core/services/user.service';


@Injectable({
  providedIn: 'root'
})
export class UserDataShareService {
  public program = signal<ProgramVM | null>(null);
  public compareProgram = signal<ProgramVM[] | null>(null);
  userService = inject(UserService);
  public staffProgramMappingIDSubject$ = new BehaviorSubject<number | null>(null);
}
