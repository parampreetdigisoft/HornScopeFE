import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/share.module';
import { AdminService } from '../../admin.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { UserService } from 'src/app/core/services/user.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { AiEditService } from 'src/app/core/services/ai-edit-audit.service';
import { CommonService } from 'src/app/core/services/common.service';
import { AIEditChangeCompareDto, AIEditSessionDetailDto, AIEditSessionDto, AIEditSessionStatus } from 'src/app/core/models/aiVm/AiEditDtos';

@Component({
  selector: 'app-ai-edit-changes',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './ai-edit-changes.component.html',
  styleUrl: './ai-edit-changes.component.css'
})
export class AiEditChangesComponent implements OnInit {
  sessions: AIEditSessionDto[] = [];
  countryList: CountryVM[] = [];
  isLoader = false;
  detailLoader = false;
  reviewing = false;

  filterCountryID?: number;
  filterYear = new Date().getFullYear();
  filterStatus: number | null = AIEditSessionStatus.Submitted;

  selectedDetail: AIEditSessionDetailDto | null = null;
  expandedField: string | null = null;
  reviewComment = '';
  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;
  statusOptions = [
    { label: 'All', value: null },
    { label: 'Draft', value: AIEditSessionStatus.Draft },
    { label: 'Submitted', value: AIEditSessionStatus.Submitted },
    { label: 'Approved', value: AIEditSessionStatus.Approved },
    { label: 'Rejected', value: AIEditSessionStatus.Rejected },
    { label: 'Cancelled', value: AIEditSessionStatus.Cancelled }
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
    this.loadSessions();
  }

  loadCountries() {
    this.adminService.getAllCountriesByUserId(this.userService.userInfo.userID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) this.countryList = res.result ?? [];
      }
    });
  }

  loadSessions(currentPage: any = 1) {
    this.isLoader = true;
    this.auditService.getSessions({
      countryID: this.filterCountryID || undefined,
      year: this.filterYear || undefined,
      status: this.filterStatus ?? undefined,
      pageNumber: currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res?.data) {
          this.sessions = res.data ?? [];
          this.totalRecords = res?.totalRecords ?? 0;
          this.currentPage = currentPage;
          this.pageSize = res?.pageSize ?? this.pageSize;
        } else {
          this.toaster.showError('No sessions found or unable to load session data.');
        }
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError('Failed to load sessions.');
      }
    });
  }

  openCompare(session: AIEditSessionDto) {
    this.detailLoader = true;
    this.selectedDetail = null;
    this.expandedField = null;
    this.reviewComment = '';
    this.auditService.getSessionDetail(session.sessionID).subscribe({
      next: (res) => {
        this.detailLoader = false;
        if (res.succeeded) {
          this.selectedDetail = res.result ?? null;
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Failed to load compare detail.');
        }
      },
      error: () => {
        this.detailLoader = false;
        this.toaster.showError('Failed to load compare detail.');
      }
    });
  }

  closeDetail() {
    this.selectedDetail = null;
  }

  toggleTrail(change: AIEditChangeCompareDto) {
    const key = `${change.entityType}-${change.entityRecordID}-${change.fieldName}`;
    this.expandedField = this.expandedField === key ? null : key;
  }

  isExpanded(change: AIEditChangeCompareDto): boolean {
    return this.expandedField === `${change.entityType}-${change.entityRecordID}-${change.fieldName}`;
  }

  review(approve: boolean) {
    if (!this.selectedDetail) return;
    this.reviewing = true;
    this.auditService.reviewSession({
      sessionID: this.selectedDetail.session.sessionID,
      approve,
      reviewComment: this.reviewComment || null
    }).subscribe({
      next: (res) => {
        this.reviewing = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages?.join(', ') || (approve ? 'Approved.' : 'Rejected.'));
          this.selectedDetail = null;
          this.loadSessions();
        } else {
          this.toaster.showError(res.errors?.join(', ') || 'Review failed.');
        }
      },
      error: () => {
        this.reviewing = false;
        this.toaster.showError('Review failed.');
      }
    });
  }

  canReview(session?: AIEditSessionDto | null): boolean {
    if (!session) return false;
    return session.status === AIEditSessionStatus.Submitted || session.status === AIEditSessionStatus.Draft;
  }

  statusClass(status: AIEditSessionStatus): string {
    switch (status) {
      case AIEditSessionStatus.Draft: return 'badge-pending';
      case AIEditSessionStatus.Submitted: return 'badge-consumed';
      case AIEditSessionStatus.Approved: return 'badge-active';
      case AIEditSessionStatus.Rejected:
      case AIEditSessionStatus.Cancelled: return 'badge-rejected';
      default: return '';
    }
  }

  entityLabel(change: AIEditChangeCompareDto): string {
    if (change.entityTypeName === 'Question') {
      return `Question${change.questionText ? ': ' + change.questionText : ''}`;
    }
    if (change.entityTypeName === 'Pillar' || change.entityTypeName === 'Citation') {
      return `${change.entityTypeName}${change.pillarName ? ': ' + change.pillarName : ''}`;
    }
    return change.entityTypeName;
  }
}
