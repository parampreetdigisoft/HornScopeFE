import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import { catchError, debounceTime, map, Observable, of, switchMap } from "rxjs";
import { ElementRef, ViewChild } from "@angular/core";
import { UserInfo } from "src/app/core/models/UserInfo";
import { AdminService } from "src/app/features/admin/admin.service";
import { environment } from "src/environments/environment";

@Component({
  selector: "app-update-profile",
  templateUrl: "./update-profile.component.html",
  styleUrl: "./update-profile.component.css",
})
export class UpdateProfileComponent implements OnInit, OnChanges {
  selectedFile: any;
  @Input() loading: boolean = false;
  isSubmitted = false;
  @Input() userinfo: UserInfo | undefined | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef;
  @Output() updateUserEvent: any = new EventEmitter();
  @Output() closeModelEvent: any = new EventEmitter();
  
  selectedImage: string | ArrayBuffer | null = null;
  userForm: FormGroup<any> = this.fb.group({});
  urlBase = environment.apiUrl;
  constructor(private fb: FormBuilder, private adminService:AdminService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedImage = null;
    //this.initializeForm();
  }

  ngOnInit(): void {
    this.initializeForm();
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/default-profile.png';
  }
  initializeForm() {
    if (this.userinfo) {
      this.userForm = this.fb.group({
        fullName: [this.userinfo.fullName, [Validators.required]],
        phone: [this.userinfo.phone, [Validators.required]],
        email: this.fb.control(
        this.userinfo?.email,
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [this.emailExistsValidator()],
          updateOn: 'blur'
        }
      ),
        profileImage: [],
        is2FAEnabled:[this.userinfo.is2FAEnabled]
      });
    }
  }
  emailExistsValidator(): AsyncValidatorFn {
      return (control: AbstractControl): Observable<ValidationErrors | null> => {
    
        if (!control.value) {
          return of(null);
        }
    
        return of(control.value).pipe(
          debounceTime(500),
          switchMap(email =>
            this.adminService.checkEmailExist({
              email: email,
              userId: this.userinfo?.userID ?? 0
            })
          ),
          map((exists: boolean) => {      
            return exists ? { emailExists: true } : null;
          }),
          catchError(() => of(null))
        );
      };
    }
  updateUser(fullName: string, email: string, phone:string,is2FAEnabled:boolean, profileImage?: File) {  
    const formData = new FormData();
    formData.append("FullName", fullName);
    formData.append("Email", email);
    formData.append("Phone", phone);
    formData.append("UserID", `${this.userinfo?.userID ?? 0}`);
    formData.append("Is2FAEnabled", `${is2FAEnabled ?? 0}`);
    if (profileImage) {
      formData.append("ProfileImage", this.selectedFile);
    }
    this.updateUserEvent.emit(formData);
  }

  onSubmit() {
    this.isSubmitted = true;
    if (this.userForm.valid) {
      var form = this.userForm.value;
      this.updateUser(form.fullName, form.email, form.phone,form.is2FAEnabled, form.profileImage);
    }
  }

  onFileSelected(event: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result;
    };
    reader.readAsDataURL(file);
  }

  closeModel() {
    this.closeModelEvent.emit();
  }
    numberOnly(event: KeyboardEvent): void {
  const key = event.key;
  if (!/^[0-9+]$/.test(key)) {
    event.preventDefault();
  }
}
}
