import { Component, OnDestroy, OnInit } from "@angular/core";
import { AdminService } from "../../admin.service";
import { CountryVM } from "../../../../core/models/CountryVM";
import { PaginationResponse } from "src/app/core/models/PaginationResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import {
  GetUserByRoleRequestDto,
  GetUserByRoleResponse,
} from "../../../../core/models/GetUserByRoleResponse";
import { UserRoleValue } from "src/app/core/enums/UserRole";
import {
  InviteBulkUserDto,
  UpdateInviteUserDto,
} from "../../../../core/models/AnalystVM";
import { SortDirection } from "src/app/core/enums/SortDirection";
import { ActivatedRoute } from "@angular/router";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { CountryUserService } from "src/app/features/city-user/country-user.service";
declare var bootstrap: any;

interface CountryUserRow extends GetUserByRoleResponse {
  countriesText?: string;
  countriesExpand?: boolean;
  showCountriesToggle?: boolean;
}

@Component({
  selector: "app-country-user-view",
  templateUrl: "./country-user-view.component.html",
  styleUrl: "./country-user-view.component.css",
})
export class CountryUserViewComponent implements OnInit, OnDestroy {
  isLoader: boolean = true;
  selectedCountryUser: GetUserByRoleResponse | null = null;
  selectedCity: CountryVM | null = null;
  countryUserResponse: PaginationResponse<CountryUserRow> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  countries: CountryVM[] | null = [];
  loading: boolean = false;
  isOpendialog: boolean = false;
  roleId: number | any = 0;
  selectedRoleID: UserRoleValue | any = "";
  selectedIndex?:number;
  rolesList = [
    { name: "Evaluator", role: UserRoleValue.Evaluator },
    { name: "CountryUser", role: UserRoleValue.CountryUser },
  ];
   pillars: PillarsVM[] = [];

  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    private route: ActivatedRoute,
    private countryUserService:CountryUserService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.roleId = params.get("roleID");
      this.selectedRoleID = this.roleId;
    });
    this.getCountryUser();
    this.getAllCountriesByUserId();
    this.getAllPillars()
  }
   getAllPillars() {
    this.countryUserService.getAllPillars().subscribe({
      next: (res) => {
        this.pillars = res.result ?? [];
      },
    });
  }

  getAllCountriesByUserId() {
    this.adminService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result;          
        },
      });
  }
  getCountryUser(currentPage: number = 1) {
    this.countryUserResponse = undefined;
    this.isLoader = true;
    let payload: GetUserByRoleRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "userID",
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userID: this.userService?.userInfo?.userID,
    };
    if (!this.roleId) {
      payload.getUserRole = UserRoleValue.CountryUser;
    }
    this.adminService.getUserListByRole(payload).subscribe((countryUserList) => {
      this.countryUserResponse = {
        ...countryUserList,
        data: (countryUserList.data ?? []).map((user) => this.mapCountryUserRow(user)),
      };
      this.totalRecords = countryUserList.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = countryUserList.pageSize;
      this.isLoader = false;
    });
  }
  private mapCountryUserRow(user: GetUserByRoleResponse): CountryUserRow {
    const countriesText = this.getCountriesText(user);
    return {
      ...user,
      countriesText,
      countriesExpand: false,
      showCountriesToggle: this.isLongCountryText(countriesText),
    };
  }

  getCountriesText(user: GetUserByRoleResponse): string {
    return (user.countries ?? [])
      .map((country) => country?.countryName)
      .filter((name): name is string => !!name)
      .join(", ");
  }

  isLongCountryText(text: string): boolean {
    if (!text) {
      return false;
    }
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length > 16 || text.length > 72;
  }

  toggleCountries(countryuser: CountryUserRow): void {
    countryuser.countriesExpand = !countryuser.countriesExpand;
  }

  editCountryUser(countryuser: GetUserByRoleResponse | null, isOpen: boolean = true) {
    this.selectedCountryUser = countryuser;     
    if (isOpen) {
      this.opendialog();
    }
  }
  deleteCountryUser() {
    if (this.selectedCountryUser === null) {
      this.toaster.showError("No client account selected for deletion");
      return;
    }
    this.adminService.deleteUser(this.selectedCountryUser.userID).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.getCountryUser(this.currentPage);
          this.toaster.showSuccess(res?.messages.join(", "));
        } else {
          this.toaster.showError(res?.errors.join(", "));
        }
      },
      error: () => {
        this.toaster.showError("Failed to delete client account");
      },
    });
  }

  ResendInvitaion(countryuser: GetUserByRoleResponse, i :number) {
    this.selectedIndex =i;
    let payload: UpdateInviteUserDto = {
      fullName: countryuser.fullName,
      email: countryuser.email,
      phone: countryuser.phone ?? "",
      password: "",
      role: UserRoleValue.Analyst,
      invitedUserID: this.userService.userInfo?.userID ?? 0,
      countryID: countryuser.countries.map((x) => x.countryID),
      userID: countryuser.userID,
      pillars:countryuser.pillars,
    };
    this.addUpdateCountryUser(payload);
  }

  addUpdateCountryUser(countryuser: UpdateInviteUserDto | null) {
    if (!countryuser) {
      return;
    }   
    this.loading = true;
    let payload: UpdateInviteUserDto = {
      fullName: countryuser.fullName,
      email: countryuser.email,
      phone: countryuser.phone,
      password: countryuser.password,
      role: UserRoleValue.CountryUser,
      invitedUserID: this.userService.userInfo?.userID ?? 0,
      countryID: countryuser.isAllCountries ? [] : countryuser.countryID,
      isAllCountries: !!countryuser.isAllCountries,
      userID: countryuser.userID,
      tier :countryuser.tier,
      pillars:countryuser.pillars
    };
    payload.tier = payload.tier ? Number(payload.tier) : 0;
    if (countryuser.userID > 0) {
      this.adminService.editUser(payload).subscribe({
        next: (res) => {
          this.closeModal();
          if (res.succeeded) {           
            this.toaster.showSuccess(res?.messages.join(", "));
          } else {
            this.toaster.showError(res?.errors.join(", "));
          }
           this.getCountryUser(this.currentPage);
        },
        error: () => {
          this.closeModal();
          this.toaster.showError("Failed to edit client account");
        },
      });
    } else {
      this.adminService.addAnalyst(payload).subscribe({
        next: (res) => {
          this.closeModal();
          if (res.succeeded) {           
            this.toaster.showSuccess(res?.messages.join(", "));
          } else {            
            this.toaster.showError(res?.errors.join(", "));
          }
          this.getCountryUser();
        },
        error: () => {
          this.closeModal();
          this.toaster.showError("Failed to add client account");
        },
      });
    }
  }

  opendialog() {
    this.isOpendialog = true;
    setTimeout(() => {
      const modalEl = document.getElementById("exampleModal");
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show(); // ✅ use show()
      }
    }, 100);
  }

  closeModal() {
    this.selectedIndex =undefined;
    this.loading = false;
    const homeTab = document.querySelector("#pills-home-tab") as HTMLElement;
    if (homeTab) {
      homeTab.click();
    }
    const modalEl = document.getElementById("exampleModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    this.isOpendialog = false;   
  }
  ngOnDestroy(): void {}

  addBulkCountryUser(countryUsers: UpdateInviteUserDto[] | null) {
    if (!countryUsers) return;
    let payload: InviteBulkUserDto = {
      users: countryUsers,
    };
    this.loading = true;
    this.adminService.addBulkAnalyst(payload).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getCountryUser();
          this.toaster.showSuccess(res?.messages.join(", "));
        } else {
          this.toaster.showError(res?.errors.join(", "));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError("Failed to add client account");
      },
    });
  }
}
