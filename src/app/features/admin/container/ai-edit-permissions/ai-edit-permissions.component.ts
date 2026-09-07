import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/share.module';
import { AdminService } from '../../admin.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { UserService } from 'src/app/core/services/user.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CommonService } from 'src/app/core/services/common.service';
import { AiEditService } from 'src/app/core/services/ai-edit-audit.service';
import {
  AIEditPermissionDto,
  AIEditPermissionStatus
} from 'src/app/core/models/aiVm/AiEditDtos';
import { GetUserByRoleRequestDto, GetUserByRoleResponse } from 'src/app/core/models/GetUserByRoleResponse';
import { UserRoleValue } from 'src/app/core/enums/UserRole';
import { SelectOverflowLabelComponent } from 'src/app/shared/standAlone/select-overflow-label/select-overflow-label.component';
import { SortDirection } from 'src/app/core/enums/SortDirection';

@Component({
  selector: 'app-ai-edit-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, SelectOverflowLabelComponent],
  templateUrl: './ai-edit-permissions.component.html',
  styleUrl: './ai-edit-permissions.component.css'
})
export class AiEditPermissionsComponent implements OnInit {
  permissions: AIEditPermissionDto[] = [];
  countryList: CountryVM[] = [];
  analysts: GetUserByRoleResponse[] = [];
  isLoader = false;
  granting = false;

  filterCountryID?: number;
  filterYear = new Date().getFullYear();
  filterStatus?: number | null = null;

  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;

  grantUserID?: number;
  grantCountryIDs: number[] = [];
  grantYear = new Date().getFullYear();
  grantNotes = '';

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: AIEditPermissionStatus.PendingRequest },
    { label: 'Active', value: AIEditPermissionStatus.Active },
    { label: 'Consumed', value: AIEditPermissionStatus.Consumed },
    { label: 'Rejected', value: AIEditPermissionStatus.Rejected },
    { label: 'Revoked', value: AIEditPermissionStatus.Revoked }
  ];

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private toaster: ToasterService,
    private auditService: AiEditService,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.loadCountries();
    this.loadAnalysts();
    this.loadPermissions(1);
  }

  loadCountries() {
    this.adminService.getAllCountriesByUserId(this.userService.userInfo.userID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) this.countryList = res.result ?? [];
      }
    });
  }

  loadAnalysts() {
    const request: GetUserByRoleRequestDto = {
      userID: this.userService.userInfo.userID ?? 0,
      getUserRole: UserRoleValue.Analyst,
      pageNumber: 1,
      pageSize: 200,
      sortBy: 'FullName',
      sortDirection: SortDirection.ASC
    };
    this.adminService.getUserListByRole(request).subscribe({
      next: (res) => {
        this.analysts = res?.data ?? [];
      }
    });
  }

  loadPermissions(currentPage: any = 1) {
    this.isLoader = true;
    this.auditService.getPermissions({
      countryID: this.filterCountryID || undefined,
      year: this.filterYear || undefined,
      status: this.filterStatus ?? undefined,
      pageNumber: currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.permissions = res?.data ?? [];
        this.totalRecords = res?.totalRecords ?? 0;
        this.currentPage = currentPage;
        this.pageSize = res?.pageSize ?? this.pageSize;
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError('Failed to load permissions.');
      }
    });
  }

  grantPermission() {
    if (!this.grantUserID || !this.grantCountryIDs?.length || !this.grantYear) {
      this.toaster.showError('Select analyst, up to 5 countries, and year.');
      return;
    }

    if (this.grantCountryIDs.length > 5) {
      this.toaster.showError('You can grant up to 5 countries at a time.');
      return;
    }

    this.granting = true;
    this.auditService.grantPermission({
      userID: this.grantUserID,
      countryIDs: this.grantCountryIDs,
      year: Number(this.grantYear),
      notes: this.grantNotes || null
    }).subscribe({
      next: (res) => {
        this.granting = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Permission granted.');
          this.grantNotes = '';
          this.grantCountryIDs = [];
          this.loadPermissions(1);
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed to grant permission.');
        }
      },
      error: () => {
        this.granting = false;
        this.toaster.showError('Failed to grant permission.');
      }
    });
  }

  getCountryName(countryID: number): string {
    return this.countryList.find(c => c.countryID === countryID)?.countryName ?? '';
  }

  get grantCountryNames(): string[] {
    return this.grantCountryIDs.map((id) => this.getCountryName(id)).filter(Boolean);
  }

  approveRequest(item: AIEditPermissionDto) {
    this.auditService.reviewPermission({
      permissionID: item.permissionID,
      approve: true
    }).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Approved.');
          this.loadPermissions(this.currentPage);
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed.');
        }
      }
    });
  }

  rejectRequest(item: AIEditPermissionDto) {
    this.auditService.reviewPermission({
      permissionID: item.permissionID,
      approve: false
    }).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Rejected.');
          this.loadPermissions(this.currentPage);
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed.');
        }
      }
    });
  }

  revoke(item: AIEditPermissionDto) {
    this.auditService.revokePermission(item.permissionID).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || 'Revoked.');
          this.loadPermissions(this.currentPage);
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed.');
        }
      }
    });
  }

  statusClass(status: AIEditPermissionStatus): string {
    switch (status) {
      case AIEditPermissionStatus.Active: return 'badge-active';
      case AIEditPermissionStatus.PendingRequest: return 'badge-pending';
      case AIEditPermissionStatus.Consumed: return 'badge-consumed';
      case AIEditPermissionStatus.Rejected:
      case AIEditPermissionStatus.Revoked: return 'badge-rejected';
      default: return '';
    }
  }
}
