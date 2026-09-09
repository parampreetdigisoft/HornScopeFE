import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { CountryVM } from "src/app/core/models/CountryVM";
import { UserService } from "src/app/core/services/user.service";
import { CountryMappingPillerRequestDto } from "src/app/core/models/QuestionRequest";
import {
  AssessmentQuestionOptionResponse,
  GetQuestionByCountryMappingResponse,
  HistoryQuestionAnswerRawDto,
} from "src/app/core/models/QuestionResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from "@angular/forms";
import {
  AddAssessmentDto,
  AddAssessmentResponseDto,
  GetCountryPillarHistoryRequestDto,
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
  styleUrls: ["./analyst-assessment.component.css"], // ✅ fixed  
})
export class AnalystAssessmentComponent implements OnInit, OnDestroy {
  pillars: PillarsVM[] = [];
  countries: CountryVM[] = []; // ✅ fixed type
  selectedUserCountryMappingID: number = 0;
  selectedCountry!: CountryVM ;
  pillarQuestions: GetQuestionByCountryMappingResponse | null = null;
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
  isCountrySubmissionAction = false;
  isAItransfer: boolean = false;
  selectedYear = new Date().getFullYear();
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
    this.getCountryByUserIdForAssessment();
    this.checkAssessmentProgress.pipe(debounceTime(10000)).subscribe(() => {
      this.getAssessmentProgressHistory();
    });
  }

  get questions() {
    return this.pillarQuestions?.questions ?? [];
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
    this.pillarQuestions?.questions.forEach((q) => {
      let option = q.questionOptions.find((x) => x.isSelected);
      this.questionsArray.push(
        this.fb.group({
          questionID: [q.questionID, Validators.required],
          responseID: [q.responseID],
          assessmentID: [this.pillarQuestions?.assessmentID],
          questionOptionID: [
            q.isSelected ? option?.optionID : null,
            Validators.required,
          ],
          score: [q.isSelected ? option?.scoreValue :null],
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
        score: selectedOption.scoreValue,
        historyQuestionOptionID: null
      });
      this.autoSaveSingleAssessemnt(index);
    }
  }

  makePillarActive(pillar:PillarsVM){
    return (this.selectedCountry?.assessmentPhase != AssessmentPhase.Completed && pillar.displayOrder <= this.pillarDisplayOrder );
  }
  activeClass(pillar:PillarsVM){

    let con = this.selectedPillar?.displayOrder == pillar.displayOrder
     &&  this.selectedCountry?.assessmentPhase != AssessmentPhase.Completed;
    return con;
  }

  GetAllPillars() {
    this.analystService.getAllPillars().subscribe((pillars) => {
      this.pillars = pillars;
    });
  }

  pillarChanged(pillar?: PillarsVM) {
    if (!this.selectedUserCountryMappingID || this.selectedUserCountryMappingID == 0) {
      this.toaster.showWarning("Please select country first");
      return;
    }
    
    this.resetAssessmentActionState();
    if (pillar) {
      this.selectedPillar = pillar;
      this.getQuestionsByCountryId();
    }
    else if(!this.selectedPillar){
      this.selectedPillar = this.pillars.find((x) => x.pillarID == this.pillarQuestions?.pillarID);
      if (this.pillarQuestions && this.pillarQuestions?.submittedPillarDisplayOrder < (this.selectedPillar?.displayOrder ?? 0)) {
        this.pillarDisplayOrder = this.selectedPillar?.displayOrder ?? 1;
      }
    }
  }

  countryChanged() {
    this.selectedCountry = this.countries.filter(x=>x.userCountryMappingID == this.selectedUserCountryMappingID)[0]
    this.selectedPillar = undefined;
    this.getQuestionsByCountryId();
  }

  getCountryByUserIdForAssessment() {
    this.selectedPillar = undefined;
    this.analystService.getCountryByUserIdForAssessment(this.userService.userInfo.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result ?? [];
          if (this.countries.length > 0) {
            const preferredId = this.analystService.userCountryMappingIDSubject$.value;
            const preferredCountry = this.countries.find(
              (x) => x.userCountryMappingID == preferredId
            );
            this.selectedUserCountryMappingID =
              preferredCountry?.userCountryMappingID ??
              this.countries[0].userCountryMappingID ??
              0;
            this.selectedCountry = this.countries.find(
              (x) => x.userCountryMappingID == this.selectedUserCountryMappingID
            ) as CountryVM;
            setTimeout(() => {
              this.toaster.showInfo("You have rediredected to assgined country, please submit all domains for the country");
            }, 500);
            this.getQuestionsByCountryId();
          } else {
            this.selectedUserCountryMappingID = 0;
            this.formInitialized();
            this.userService.assessmentProgress.next(null);
            this.toaster.showWarning(res.errors?.join(", ") || "No country is found for assessment");
          }
        },
        error: () => {
          this.toaster.showWarning("There is an error please try again");
        },
      });
  }

  getQuestionsByCountryId() {
    if (
      !this.selectedUserCountryMappingID ||
      this.selectedUserCountryMappingID == 0
    ) {
      this.toaster.showWarning("Please select country first");
      return;
    }
    this.formInitialized();
    const payload: CountryMappingPillerRequestDto = {
      userCountryMappingID: this.selectedUserCountryMappingID ?? 0,
    };
    if (this.selectedPillar) {
      payload.pillarID = this.selectedPillar.pillarID;
    }
    this.pillarQuestions = null;
    this.isLoader = true;
    this.analystService.getQuestionsByCountryId(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.pillarQuestions = res.result;
          setTimeout(() => {
            if (this.pillarQuestions?.displayOrder && this.pillarQuestions?.pillarID) {
              const container = this.scrollPillarContainer?.nativeElement;
              const element = container?.querySelector('#pillar-' + this.pillarQuestions.pillarID);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest'
                });
              }
            }
          }, 300);
          this.pillarDisplayOrder = Math.max(
            this.pillarQuestions?.displayOrder ?? 0,
            this.pillarQuestions?.submittedPillarDisplayOrder ?? 0
          );
          if (this.pillarQuestions && (this.pillarQuestions?.assessmentID || this.selectedUserCountryMappingID) > 0) {
            this.getAssessmentProgressHistory();
          } else {
            this.userService.assessmentProgress.next(null);
          }
          this.pillarChanged();
          this.loadQuestions();
        } else {
          this.toaster.showWarning("The country's assessment has already been submitted, or the selected pillar has no questions.");
        }
      },
    });
  }

  SaveAssessment() {
    if ( !this.selectedUserCountryMappingID || this.selectedUserCountryMappingID == 0 ) {
      this.toaster.showWarning("Please select country first");
      return;
    }
    const validQuestions = this.questionsArray.controls
      .filter((ctrl) => ctrl.valid)
      .map((ctrl) => ctrl.value as AddAssessmentResponseDto);
    const payload: AddAssessmentDto = {
      userCountryMappingID: this.selectedUserCountryMappingID,
      assessmentID: this.pillarQuestions?.assessmentID ?? 0,
      pillarID: this.pillarQuestions?.pillarID ?? 0,
      responses: validQuestions ?? [],
      isAutoSave: false,
      isFinalized: this.isAssessementFinalized
    };
    if (
      this.pillarQuestions?.pillarID != null &&
      this.pillarQuestions?.pillarID > 0
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
              this.analystService.userCountryMappingIDSubject$.next(null);
              this.checkAssessmentProgress.next();
              this.getCountryByUserIdForAssessment();
            } else {
              this.selectedPillar = this.getNextPillar(
                this.selectedPillar?.pillarID ?? this.pillarQuestions?.pillarID
              );
              this.getQuestionsByCountryId();
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

   onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  ngOnDestroy(): void {
    this.userService.assessmentProgress.next(null);
  }

  ImportQuestions() {
    if (this.selectedUserCountryMappingID != 0) {
      this.isloading = true;
      this.analystService
        .ExportQuestions(this.selectedUserCountryMappingID)
        .subscribe({
          next: (res: any) => {
            var country = this.countries?.find(
              (x) => x.userCountryMappingID == this.selectedUserCountryMappingID
            );
            this.isloading = false;
            const url = window.URL.createObjectURL(res);
            const a = document.createElement("a");
            a.href = url;
            a.download =
              country?.countryName + "_" + country?.assignedBy + "_Questions.xlsx";
            a.click();
            this.toaster.showSuccess("Questions downloaded successfully");
          },
          error: () => {
            this.isloading = false;
            this.toaster.showError("failed to download questions try again");
          },
        });
    } else {
      this.toaster.showWarning("Please select country to get questions");
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
          this.getQuestionsByCountryId();
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
        userCountryMappingID: this.selectedUserCountryMappingID,
        assessmentID: this.pillarQuestions?.assessmentID ?? 0
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
      if (!this.selectedUserCountryMappingID || this.selectedUserCountryMappingID == 0) {
        this.toaster.showWarning("Please select city first");
        return;
      }
      if (this.questionsArray.controls[index].valid && this.questionsArray.controls[index].dirty) {

        const payload: AddAssessmentDto = {
          userCountryMappingID: this.selectedUserCountryMappingID,
          assessmentID: this.pillarQuestions?.assessmentID ?? 0,
          pillarID: this.pillarQuestions?.pillarID ?? 0,
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

  get isLastPillar(): boolean {
    if (!this.pillarQuestions?.pillarID || this.pillars.length === 0) {
      return false;
    }
    const sortedPillars = this.getSortedPillars();
    const currentIndex = sortedPillars.findIndex(
      (pillar) => pillar.pillarID === this.pillarQuestions?.pillarID
    );

    return currentIndex !== -1 && currentIndex === sortedPillars.length - 1;
  }

  onAssessmentActionClick(forceCountrySubmit: boolean = false): void {
    const shouldSubmitCountry = forceCountrySubmit || this.isLastPillar;
    this.isCountrySubmissionAction = shouldSubmitCountry;
    this.isAssessementFinalized = shouldSubmitCountry;
  }

  resetAssessmentActionState(): void {
    this.isCountrySubmissionAction = false;
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

  decodeHtml(text: string | undefined): string {
    if (text) {
      const txt = document.createElement('textarea');
      txt.innerHTML = text;
      return txt.value.replace(/\u00a0/g, ' '); // Replace non-breaking space with normal space
    }
    return "";
  }
  aiResultTransfer() {

    const country = this.countries.find(x => x.userCountryMappingID === Number(this.selectedUserCountryMappingID));

    if (!country) {
      this.toaster.showWarning("Please select a country");
      return;
    }

    const payload: AITransferAssessmentRequestDto = {
      countryID: country.countryID,
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
            this.countryChanged();
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
  downloadQuestions(mode: string) {
    if (mode === 'excel') { this.ImportQuestions() }
    else { this.exportPillarsHistoryByUserId(ExportType.Pdf); }


  }

  exportPillarsHistoryByUserId(type: ExportType) {   
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedUserCountryMappingID ||
      this.selectedUserCountryMappingID == 0 ||
      this.selectedUserCountryMappingID == null
    ) {
      return;
    }

    const selectedCountry = this.countries.find(
      (x: any) => x.userCountryMappingID == this.selectedUserCountryMappingID
    );

    if (!selectedCountry) {
      this.isLoader = false;
      return;
    }

    let payload: GetCountryPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      countryID: selectedCountry.countryID,   // ✅ Correct countryID
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
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

        this.toaster.showSuccess(`Domains History ${fileType} downloaded successfully`);
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
        score: selectedOption.scoreValue,
        source: selectedOption.source,
        justification: selectedOption.justification,
        historyQuestionOptionID: selectedOption.userID
      });
      this.autoSaveSingleAssessemnt(index);
    }
  }

  optionEndLabel(item: { label?: string; optionLabel?: string; scoreValue?: string } | null): string {
    if (!item) {
      return '';
    }
    const custom = String(
      item.label ?? (item as { Label?: string }).Label ?? item.optionLabel ?? ''
    ).trim();
    if (custom) {
      return custom;
    }
    return item.scoreValue == null ? '' : String(item.scoreValue).trim();
  }
}
