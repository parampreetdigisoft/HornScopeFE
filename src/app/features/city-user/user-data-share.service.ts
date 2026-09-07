import { inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { UserService } from 'src/app/core/services/user.service';


@Injectable({
  providedIn: 'root'
})
export class UserDataShareService {

  public country = signal<CountryVM | null>(null);

  public compareCountry = signal<CountryVM[] | null>(null);

  userService = inject(UserService);

  public userCountryMappingIDSubject$ = new BehaviorSubject<number | null>(null);



}
