import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { ProgramVM } from "src/app/core/models/ProgramVM";
import { UserService } from "src/app/core/services/user.service";
import { ProgramMappingPillerRequestDto } from "src/app/core/models/QuestionRequest";
import { AssessmentQuestionOptionResponse, GetQuestionByProgramMappingResponse, HistoryQuestionAnswerRawDto } from "src/app/core/models/QuestionResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from "@angular/forms";
import {
  AddAssessmentDto,
  AddAssessmentResponseDto,
  GetProgramPillarHistoryRequestDto,
} from "src/app/core/models/AssessmentRequest";
import { AnalystService } from "../../analyst.service";
import { environment } from "src/environments/environment";
import { CommonService } from "src/app/core/services/common.service";
import { debounceTime, finalize, Subject } from "rxjs";
import { AiComputationService } from "src/app/core/services/ai-computation.service";
import { AITransferAssessmentRequestDto } from "src/app/core/models/aiVm/AITransferAssessmentRequestDto";
import { AdminService } from "src/app/features/admin/admin.service";
import { ExportType } from "src/app/core/enums/exportEnum";
import { AssessmentPhase } from "src/app/core/enums/AssessmentPhase";

@Component({
  selector: "app-analyst-assessment",
  templateUrl: "./analyst-assessment.component.html",
  styleUrls: ["../../../../shared/styles/make-assessment.shared.css"],
})
export class AnalystAssessmentComponent implements OnInit, OnDestroy {
  pillars: PillarsVM[] = [];
  programs: ProgramVM[] = [];
    filterProgram!: number;
  selectedUserProgramMappingID: number = 0;
  selectedProgram?: ProgramVM;
  programControl = new FormControl<number | null>(null);
  pillerQuestions: GetQuestionByProgramMappingResponse | null = null;
  form!: FormGroup;
  pillarDisplayOrder: number = 1;
  checkAssessmentProgress = new Subject<void | null>();
  selectedPillar?: PillarsVM;
  @ViewChild("scrollContainer") scrollContainer!: ElementRef;
  @ViewChild("scrollPillarContainer") scrollPillarContainer!: ElementRef;
  isloading = false;
  isUploading = false;
  isLoader: boolean = false;
  urlBase = environment.apiUrl;
  isAssessementFinalized = false;
  isProgramSubmissionAction = false;
  isAItransfer: boolean = false;
  constructor(
    private analystService: AnalystService,
    private userService: UserService,
    private toaster: ToasterService,
    private fb: FormBuilder,
    private commonService: CommonService,
    private aiComputationService: AiComputationService,
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.formInitialized();
    this.GetAllPillars();
    this.getProgramByUserIdForAssessment();
    this.checkAssessmentProgress.pipe(debounceTime(10000)).subscribe(() => {
      this.getAssessmentProgressHistory();
    });
  }

  get questions() {
    return this.pillerQuestions?.questions ?? [];
  }

  formInitialized() {
    this.form = this.fb.group({
      questions: this.fb.array([]),
    });
  }

  get questionsArray(): FormArray {
    return this.form.get("questions") as FormArray;
  }

  loadQuestions() {
    this.pillerQuestions?.questions.forEach((q) => {
      let option = q.questionOptions.find((x) => x.isSelected);
      this.questionsArray.push(
        this.fb.group({
          questionID: [q.questionID, Validators.required],
          responseID: [q.responseID],
          assessmentID: [this.pillerQuestions?.assessmentID],
          questionOptionID: [
            q.isSelected ? option?.optionID : null,
            Validators.required,
          ],
          //score: [q.isSelected ? option?.scoreValue :null],
          justification: [
            q.isSelected ? option?.justification : null,
            Validators.required,
          ],
          source: [q.isSelected ? option?.source : null],
          historyQuestionOptionID: [null],
        })
      );
    });
  }

  onOptionChange(
    selectedOption: AssessmentQuestionOptionResponse | null,
    index: number
  ) {
    if (selectedOption) {
      const formGroup = this.questionsArray.at(index) as FormGroup;
      formGroup.patchValue({
        questionOptionID: selectedOption.optionID,
        //score: selectedOption.scoreValue,
        historyQuestionOptionID: null
      });
    }
  }

  makePillarActive(pillar: PillarsVM) {
    return (this.selectedProgram?.assessmentPhase != AssessmentPhase.Completed && pillar.displayOrder <= this.pillarDisplayOrder);
  }

  activeClass(pillar: PillarsVM) {
    let con = this.selectedPillar?.displayOrder == pillar.displayOrder
      && this.selectedProgram?.assessmentPhase != AssessmentPhase.Completed;
    return con;
  }

  GetAllPillars() {
    this.analystService.getAllPillars().subscribe((pillars) => {
      this.pillars = pillars;
    });
  }

  pillarChanged(pillar?: PillarsVM) {
    if (!this.selectedUserProgramMappingID || this.selectedUserProgramMappingID == 0) {
      this.toaster.showWarning("Please select program first");
      return;
    }

    this.isAssessementFinalized = false;
    if (pillar) {
      this.selectedPillar = pillar;
      this.getQuestionsByProgramId();
    }
    else if (!this.selectedPillar) {
      this.selectedPillar = this.pillars.find((x) => x.pillarID == this.pillerQuestions?.pillarID);
      if (this.pillerQuestions && this.pillerQuestions?.submittedPillarDisplayOrder < (this.selectedPillar?.displayOrder ?? 0)) {
        this.pillarDisplayOrder = this.selectedPillar?.displayOrder ?? 1;
      }
    }
  }

 onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  programChanged() {
    this.selectedUserProgramMappingID = Number(this.programControl.value ?? 0);
    this.selectedProgram = this.programs.find(
      x => x.staffProgramMappingID == this.selectedUserProgramMappingID
    );

    if (!this.selectedProgram) {
      return;
    }

    this.selectedPillar = undefined;
    this.getQuestionsByProgramId();
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().toLowerCase().includes(term)
    );
  }

  getProgramByUserIdForAssessment() {
    this.selectedPillar = undefined;
    this.analystService.getProgramByUserIdForAssessment(this.userService.userInfo.userID)
      .subscribe({
        next: (res) => {
          this.programs = res.result ?? [];
          if (this.programs.length > 0) {
            this.selectedUserProgramMappingID = this.analystService.staffProgramMappingIDSubject$.value != null ?
              this.analystService.staffProgramMappingIDSubject$.value
              : this.programs[0].staffProgramMappingID ?? 0;
            this.programControl.setValue(this.selectedUserProgramMappingID, { emitEvent: false });
            this.selectedProgram = this.programs.find(x => x.staffProgramMappingID == this.selectedUserProgramMappingID);
            setTimeout(() => {
              this.toaster.showInfo("You have rediredected to assgined program, please submit all pillars for the program");
            }, 500);
            this.getQuestionsByProgramId();
          } else {
            this.toaster.showWarning(res.errors.join(", "));
          }
        },
        error: () => {
          this.toaster.showWarning("There is an error please try again");
        },
      });
  }


  getQuestionsByProgramId() {
    if (
      !this.selectedUserProgramMappingID ||
      this.selectedUserProgramMappingID == 0
    ) {
      this.toaster.showWarning("Please select program first");
      return;
    }
    this.formInitialized();
    const payload: ProgramMappingPillerRequestDto = {
      staffProgramMappingID: this.selectedUserProgramMappingID ?? 0,
    };
    if (this.selectedPillar) {
      payload.pillarID = this.selectedPillar.pillarID;
    }
    this.pillerQuestions = null;
    this.isLoader = true;
    this.analystService.getQuestionsByProgramID(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.pillerQuestions = res.result;
          setTimeout(() => {
            if (this.pillerQuestions?.displayOrder && this.pillerQuestions?.pillarID) {
              const container = this.scrollPillarContainer.nativeElement;
              const element = container.querySelector('#pillar-' + this.pillerQuestions.pillarID);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest' // or 'center'
                });
              }
            }
          }, 300);
          this.pillarDisplayOrder = Math.max(this.pillerQuestions?.displayOrder ?? 0, this.pillerQuestions?.submittedPillarDisplayOrder ?? 0);
          if (this.pillerQuestions && (this.pillerQuestions?.assessmentID || this.selectedUserProgramMappingID) > 0) {
            this.getAssessmentProgressHistory();
          } else {
            this.userService.assessmentProgress.next(null);
          }
          this.pillarChanged();
          this.loadQuestions();
        } else {
          this.toaster.showWarning("The program's assessment has already been submitted, or the selected pillar has no questions.");
        }
      },
    });
  }

  SaveAssessment() {
    if (
      !this.selectedUserProgramMappingID ||
      this.selectedUserProgramMappingID == 0
    ) {
      this.toaster.showWarning("Please select program first");
      return;
    }
    const validQuestions = this.questionsArray.controls
      .filter((ctrl) => ctrl.valid)
      .map((ctrl) => ctrl.value as AddAssessmentResponseDto);
    const payload: AddAssessmentDto = {
      staffProgramMappingID: this.selectedUserProgramMappingID,
      assessmentID: this.pillerQuestions?.assessmentID ?? 0,
      pillarID: this.pillerQuestions?.pillarID ?? 0,
      responses: validQuestions ?? [],
      isAutoSave: false,
      isFinalized: this.isAssessementFinalized
    };
    if (
      this.pillerQuestions?.pillarID != null &&
      this.pillerQuestions?.pillarID > 0
    ) {
      this.analystService.saveAssessment(payload).subscribe({
        next: (res) => {
          setTimeout(() => {
            this.scrollContainer.nativeElement.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }, 300);
          if (res.succeeded) {
            if (this.isAssessementFinalized) {
              this.analystService.staffProgramMappingIDSubject$.next(null);
              this.checkAssessmentProgress.next();
              setTimeout(() => {
                window.location.reload();
              }, 300);
            } else {
              this.selectedPillar = this.getNextPillar(
                this.selectedPillar?.pillarID ?? this.pillerQuestions?.pillarID
              );
              this.getQuestionsByProgramId();
            }
            this.resetAssessmentActionState();
            this.toaster.showSuccess(res.messages.join(", "));
          } else {
            this.toaster.showError(res.errors.join(", "));
          }
        },
        error: () => {
          this.toaster.showError("Failed to save assessment. Try again.");
        },
      });
    } else {
      this.toaster.showWarning("Please refresh the page and try again");
    }
  }

  ngOnDestroy(): void {
    this.userService.assessmentProgress.next(null);
  }

  ImportAssessmentExcel() {

    if (this.selectedUserProgramMappingID != 0) {
      this.isloading = true;
      this.analystService
        .ExportAssessment(this.selectedUserProgramMappingID)
        .subscribe({
          next: (res: any) => {
            var program = this.programs?.find(
              (x) => x.staffProgramMappingID == this.selectedUserProgramMappingID
            );
            this.isloading = false;
            const url = window.URL.createObjectURL(res);
            const a = document.createElement("a");
            a.href = url;
            a.download =
              program?.programName + "_" + program?.assignedBy + "_Questions.xlsx";
            a.click();
            this.toaster.showSuccess("Questions downloaded successfully");
          },
          error: () => {
            this.isloading = false;
            this.toaster.showError("failed to download questions try again");
          },
        });
    } else {
      this.toaster.showWarning("Please select program to get questions");
    }
  }

  handleFileUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userID", this.userService?.userInfo?.userID?.toString());
    this.isUploading = true;
    this.analystService.ImportAssessment(formData).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res.succeeded) {
          this.selectedPillar = this.pillars[0];
          this.getQuestionsByProgramId();
          this.toaster.showSuccess(res.messages.join(", "));
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.isUploading = false;
        this.toaster.showError("failed to download questions try again");
      },
    });
  }

  getAssessmentProgressHistory() {
    this.analystService
      .getAssessmentProgressHistory({
        staffProgramMappingID: this.selectedUserProgramMappingID,
        assessmentID: this.pillerQuestions?.assessmentID ?? 0
      })
      .subscribe((res) => {
        if (res.succeeded) {
          this.userService.assessmentProgress.next(res.result);
        } else {
          this.toaster.showError("Failed to fetch assessment progress history");
        }
      });
  }

  autoSaveSingleAssessemnt(index: number) {
    if (this.questionsArray.controls[index].valid) {
      if (!this.selectedUserProgramMappingID || this.selectedUserProgramMappingID == 0) {
        this.toaster.showWarning("Please select program first");
        return;
      }
      if (this.questionsArray.controls[index].valid && this.questionsArray.controls[index].dirty) {

        const payload: AddAssessmentDto = {
          staffProgramMappingID: this.selectedUserProgramMappingID,
          assessmentID: this.pillerQuestions?.assessmentID ?? 0,
          pillarID: this.pillerQuestions?.pillarID ?? 0,
          responses: [this.questionsArray.controls[index].value],
          isAutoSave: true,
          isFinalized: false
        };
        this.analystService.saveAssessment(payload).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.questionsArray.at(index).markAsPristine();
              this.checkAssessmentProgress.next();
            }
          },
          error: () => {
            this.toaster.showError("Failed to save assessment. Try again.");
          },
        });
      }
    }
  }

  decodeHtml(text: string | undefined): string {
    if (text) {
      const txt = document.createElement('textarea');
      txt.innerHTML = text;
      return txt.value.replace(/\u00a0/g, ' '); // Replace non-breaking space with normal space
    }
    return "";
  }

  get isLastPillar(): boolean {
    if (!this.pillerQuestions?.pillarID || this.pillars.length === 0) {
      return false;
    }
    const sortedPillars = this.getSortedPillars();
    const currentIndex = sortedPillars.findIndex(
      (pillar) => pillar.pillarID === this.pillerQuestions?.pillarID
    );

    return currentIndex !== -1 && currentIndex === sortedPillars.length - 1;
  }

  onAssessmentActionClick(forceProgramSubmit: boolean = false): void {
    const shouldSubmitProgram = forceProgramSubmit || this.isLastPillar;
    this.isProgramSubmissionAction = shouldSubmitProgram;
    this.isAssessementFinalized = shouldSubmitProgram;
  }

  resetAssessmentActionState(): void {
    this.isProgramSubmissionAction = false;
    this.isAssessementFinalized = false;
  }

  private getSortedPillars(): PillarsVM[] {
    return [...this.pillars].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
  }

  private getNextPillar(currentPillarID?: number): PillarsVM | undefined {
    if (!currentPillarID) {
      return undefined;
    }

    const sortedPillars = this.getSortedPillars();
    const currentIndex = sortedPillars.findIndex(
      (pillar) => pillar.pillarID === currentPillarID
    );

    if (currentIndex === -1 || currentIndex >= sortedPillars.length - 1) {
      return undefined;
    }

    return sortedPillars[currentIndex + 1];
  }

  aiResultTransfer() {
    const program = this.programs.find(x => x.staffProgramMappingID === Number(this.selectedUserProgramMappingID));
    if (!program) {
      this.toaster.showWarning("Please select a program");
      return;
    }

    const payload: AITransferAssessmentRequestDto = {
      climateProgramID: program.climateProgramID,
      transferToUserID: this.userService.userInfo?.userID
    };

    this.isAItransfer = true;
    this.isLoader = true;

    this.aiComputationService.aiResultTransfer(payload)
      .pipe(finalize(() => {
        this.isLoader = false
        this.isAItransfer = false
      }))
      .subscribe({
        next: (res: any) => {
          if (res?.succeeded) {
            this.programChanged();
            this.toaster.showSuccess(res.messages?.join(", ") || "Transfer successful");
          } else {
            this.toaster.showError(res.errors?.join(", ") || "Transfer failed");
          }
        },
        error: () => {
          this.toaster.showError("Failed to transfer assessment. Please try again.");
        }
      });
  }
  downloadAssessment(mode: string) {
    if (mode === 'excel') { this.ImportAssessmentExcel() }
    else { this.exportPillarsHistoryByUserId(ExportType.Pdf); }


  }

  exportPillarsHistoryByUserId(type: ExportType) {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedUserProgramMappingID ||
      this.selectedUserProgramMappingID == 0 ||
      this.selectedUserProgramMappingID == null
    ) {
      return;
    }

    const selectedProgram = this.programs.find(
      (x: any) => x.staffProgramMappingID == this.selectedUserProgramMappingID
    );

    if (!selectedProgram) {
      this.isLoader = false;
      return;
    }

    let payload: GetProgramPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      climateProgramID: selectedProgram.climateProgramID,   // ✅ Correct climateProgramID
      exportType: type
    };


    this.adminService.exportPillarsHistoryByUserId(payload).subscribe({
      next: (res: Blob) => {
        const url = window.URL.createObjectURL(res);

        const a = document.createElement("a");
        a.href = url;

        // ✅ Dynamic filename
        a.download = type === ExportType.Pdf
          ? "PillarQuestionHistory.pdf"
          : "PillarQuestionHistory.xlsx";

        a.click();
        window.URL.revokeObjectURL(url);

        this.isLoader = false;
        const fileType = type === ExportType.Pdf ? "PDF" : "EXCEL";

        this.toaster.showSuccess(`Pillars History ${fileType} downloaded successfully`);
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError("There is an error please try later");
      },
    });
  }
  onHistoryOptionChange(
    selectedOption: HistoryQuestionAnswerRawDto | null,
    index: number
  ) {
    if (selectedOption) {
      const formGroup = this.questionsArray.at(index) as FormGroup;
      formGroup.patchValue({
        questionOptionID: selectedOption.optionID,
        //score: Number(selectedOption.scoreValue),
        source: selectedOption.source,
        justification: selectedOption.justification,
        historyQuestionOptionID: selectedOption.userID
      });
      this.autoSaveSingleAssessemnt(index);
    }
  }
}
