import { Component, OnDestroy, OnInit } from "@angular/core";
import { AdminService } from "../../admin.service";
import { ProgramVM } from "../../../../core/models/ProgramVM";
import { ProgramUserRow } from "src/app/core/models/ProgramUserRow";
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
import { ClientService } from "src/app/features/client/client.service";
import { CommonService } from "src/app/core/services/common.service";
declare var bootstrap: any;

@Component({
  selector: "app-client-view",
  templateUrl: "./client-view.component.html",
  styleUrl: "./client-view.component.css",
})
export class ClientViewComponent implements OnInit, OnDestroy {
  isLoader: boolean = false;
  selectedProgramUser: GetUserByRoleResponse | null = null;
  selectedCity: ProgramVM | null = null;
  clientResponse: PaginationResponse<ProgramUserRow> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  programs: ProgramVM[] | null = [];
  loading: boolean = false;
  isOpendialog: boolean = false;
  roleId: number | any = 0;
  selectedRoleID: UserRoleValue | any = "";
  selectedIndex?:number;
  rolesList = [
    { name: "Evaluator", role: UserRoleValue.Evaluator },
    { name: "ProgramUser", role: UserRoleValue.ProgramUser },
  ];
   pillars: PillarsVM[] = [];

  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    private route: ActivatedRoute,
    private clientService: ClientService,
    private commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.roleId = params.get("roleID");
      this.selectedRoleID = this.roleId;
    });
    this.getProgramUser();
    this.getAllProgramsByUserId();
    this.getAllPillars()
  }
   getAllPillars() {
    this.clientService.getAllPillars().subscribe({
      next: (res) => {
        this.pillars = res.result ?? [];
      },
    });
  }

  getAllProgramsByUserId() {
    this.adminService
      .getAllProgramsByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.programs = res.result;          
        },
      });
  }
  
  getProgramUser(currentPage: number = 1) {
    this.clientResponse = undefined;
    this.isLoader = true;
    let payload: GetUserByRoleRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "userID",
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userID: this.userService?.userInfo?.userID,
    };
    if (!this.roleId) {
      payload.getUserRole = UserRoleValue.ProgramUser;
    }
    this.adminService.getUserListByRole(payload).subscribe((clientList) => {
       this.clientResponse = {
        ...clientList,
        data: (clientList.data ?? []).map((user) => this.commonService.mapProgramUserRow(user)),
      };
      this.totalRecords = clientList.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = clientList.pageSize;
      this.isLoader = false;
    });
  }

  editProgramUser(programuser: GetUserByRoleResponse | null, isOpen: boolean = true) {
    this.selectedProgramUser = programuser;     
    if (isOpen) {
      this.opendialog();
    }
  }
  deleteProgramUser() {
    if (this.selectedProgramUser === null) {
      this.toaster.showError("No client account selected for deletion");
      return;
    }
    this.adminService.deleteUser(this.selectedProgramUser.userID).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.getProgramUser(this.currentPage);
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

  ResendInvitation(programuser: GetUserByRoleResponse, i :number) {
    this.selectedIndex =i;
    let payload: UpdateInviteUserDto = {
      fullName: programuser.fullName,
      email: programuser.email,
      phone: programuser.phone ?? "",
      password: "",
      role: UserRoleValue.Analyst,
      invitedUserID: this.userService.userInfo?.userID ?? 0,
      climateProgramID: programuser.climatePrograms.map((x) => x.climateProgramID),
      userID: programuser.userID,
      pillars:programuser.pillars,
    };
    this.addUpdateProgramUser(payload);
  }

  addUpdateProgramUser(programuser: UpdateInviteUserDto | null) {
    if (!programuser) {
      return;
    }   
    this.loading = true;
    let payload: UpdateInviteUserDto = {
      fullName: programuser.fullName,
      email: programuser.email,
      phone: programuser.phone,
      password: programuser.password,
      role: UserRoleValue.ProgramUser,
      invitedUserID: this.userService.userInfo?.userID ?? 0,
      climateProgramID: programuser.climateProgramID,
      isAllPrograms: programuser.isAllPrograms,
      userID: programuser.userID,
      tier :programuser.tier,
      pillars:programuser.pillars
    };
    payload.tier = payload.tier ? Number(payload.tier) : 0;
    if (programuser.userID > 0) {
      this.adminService.editUser(payload).subscribe({
        next: (res) => {
          this.closeModal();
          if (res.succeeded) {           
            this.toaster.showSuccess(res?.messages.join(", "));
          } else {
            this.toaster.showError(res?.errors.join(", "));
          }
           this.getProgramUser(this.currentPage);
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
          this.getProgramUser();
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

  addBulkProgramUser(clients: UpdateInviteUserDto[] | null) {
    if (!clients) return;
    let payload: InviteBulkUserDto = {
      users: clients,
    };
    this.loading = true;
    this.adminService.addBulkAnalyst(payload).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getProgramUser();
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

  togglePrograms(programuser: ProgramUserRow): void {
    programuser.programsExpand = !programuser.programsExpand;
  }
}
