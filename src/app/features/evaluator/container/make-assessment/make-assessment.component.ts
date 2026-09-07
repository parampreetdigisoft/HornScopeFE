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
} from "src/app/core/models/QuestionResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms";
import {
  AddAssessmentDto,
  AddAssessmentResponseDto,
} from "src/app/core/models/AssessmentRequest";
import { environment } from "src/environments/environment";
import { EvaluatorService } from "../../evaluator.service";
import { AssessmentPhase } from "src/app/core/enums/AssessmentPhase";
import { debounceTime, Subject } from "rxjs";

@Component({
  selector: "app-make-assessment",
  templateUrl: "./make-assessment.component.html",
  styleUrl: "./make-assessment.component.css",
})
export class MakeAssessmentComponent implements OnInit, OnDestroy {
  pillars: PillarsVM[] = [];
  countries: CountryVM[] = [];
  selectedUserCountryMappingID: number = 0;
  selectedCountry!: CountryVM;
  pillerQuestions: GetQuestionByCountryMappingResponse | null = null;
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
  ROSEWPillarID = 22;

  constructor(
    private evaluatorService: EvaluatorService,
    private userService: UserService,
    private toaster: ToasterService,
    private fb: FormBuilder
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
          score: [q.isSelected ? option?.scoreValue : null],
          justification: [
            q.isSelected ? option?.justification : null,
            Validators.required,
          ],
          source: [q.isSelected ? option?.source : null]
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
      });
      this.autoSaveSingleAssessemnt(index);
    }
  }

  makePillarActive(pillar: PillarsVM) {
    return (this.selectedCountry?.assessmentPhase != AssessmentPhase.Completed && pillar.displayOrder <= this.pillarDisplayOrder)
      || pillar?.pillarID == this.ROSEWPillarID;
  }

  activeClass(pillar: PillarsVM) {
    let con = this.selectedPillar?.displayOrder == pillar.displayOrder
      && this.selectedCountry?.assessmentPhase != AssessmentPhase.Completed
      && this.selectedPillar.pillarID != this.ROSEWPillarID;
    return con;
  }

  GetAllPillars() {
    this.evaluatorService.getAllPillars().subscribe((pillars) => {
      this.pillars = pillars;
    });
  }

  pillarChanged(pillar?: PillarsVM) {
    if (!this.selectedUserCountryMappingID || this.selectedUserCountryMappingID == 0) {
      this.toaster.showWarning("Please select country first");
      return;
    }
    if (this.selectedCountry?.assessmentPhase == AssessmentPhase.Completed && (pillar?.pillarID != this.ROSEWPillarID)) {
      this.toaster.showWarning("You can only edit the ROSEW pillar. Editing other domains requires analyst permission.");
      return;
    }

    this.resetAssessmentActionState();
    if (pillar) {
      this.selectedPillar = pillar;
      this.getQuestionsByCountryId();
    } else if (!this.selectedPillar) {
      this.selectedPillar = this.pillars.find(
        (x) => x.pillarID == this.pillerQuestions?.pillarID
      );
      if (this.pillerQuestions && this.pillerQuestions?.submittedPillarDisplayOrder < (this.selectedPillar?.displayOrder ?? 0)) {
        this.pillarDisplayOrder = this.selectedPillar?.displayOrder ?? 1;
      }
    }
  }

  countryChanged() {
    this.selectedCountry = this.countries.filter(x => x.userCountryMappingID == this.selectedUserCountryMappingID)[0];
    this.selectedPillar = undefined;
    this.getQuestionsByCountryId();
  }

  getCountryByUserIdForAssessment() {
    this.selectedPillar = undefined;
    this.evaluatorService.getCountryByUserIdForAssessment(this.userService.userInfo.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result ?? [];
          if (this.countries.length > 0) {
            const preferredId = this.evaluatorService.userCountryMappingIDSubject$.value;
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
              this.toaster.showInfo(
                "You have rediredected to assgined country, please submit all domains for the country"
              );
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
    this.pillerQuestions = null;
    this.isLoader = true;
    this.evaluatorService.getQuestionsByCountryId(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.pillerQuestions = res.result;
          setTimeout(() => {
            if (this.pillerQuestions?.displayOrder && this.pillerQuestions?.pillarID) {
              const container = this.scrollPillarContainer?.nativeElement;
              const element = container?.querySelector('#pillar-' + this.pillerQuestions.pillarID);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest'
                });
              }
            }
          }, 300);
          this.pillarDisplayOrder = Math.max(
            this.pillerQuestions?.displayOrder ?? 0,
            this.pillerQuestions?.submittedPillarDisplayOrder ?? 0
          );
          this.pillarChanged();
          if (this.pillerQuestions && (this.pillerQuestions?.assessmentID || this.selectedUserCountryMappingID) > 0) {
            this.getAssessmentProgressHistory();
          } else {
            this.userService.assessmentProgress.next(null);
          }
          this.loadQuestions();
        } else {
          this.toaster.showWarning("The country's assessment has already been submitted, or the selected domain has no questions.");
        }
      },
    });
  }

  SaveAssessment() {
    if (
      !this.selectedUserCountryMappingID ||
      this.selectedUserCountryMappingID == 0
    ) {
      this.toaster.showWarning("Please select country first");
      return;
    }
    const validQuestions = this.questionsArray.controls
      .filter((ctrl) => ctrl.valid)
      .map((ctrl) => ctrl.value as AddAssessmentResponseDto);
    const payload: AddAssessmentDto = {
      userCountryMappingID: this.selectedUserCountryMappingID,
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
      this.evaluatorService.saveAssessment(payload).subscribe({
        next: (res) => {
          setTimeout(() => {
            this.scrollContainer.nativeElement.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }, 300);
          if (res.succeeded) {
            if (this.isAssessementFinalized) {
              this.evaluatorService.userCountryMappingIDSubject$.next(null);
              this.checkAssessmentProgress.next();
              this.getCountryByUserIdForAssessment();
            } else {
              this.selectedPillar = this.getNextPillar(
                this.selectedPillar?.pillarID ?? this.pillerQuestions?.pillarID
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

  ngOnDestroy(): void {
    this.userService.assessmentProgress.next(null);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  ImportQuestions() {
    if (this.selectedUserCountryMappingID != 0) {
      this.isloading = true;
      this.evaluatorService
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
    this.evaluatorService.ImportAssessment(formData).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res.succeeded) {
          this.selectedPillar = this.selectedCountry?.assessmentPhase == AssessmentPhase.Completed ?
            this.pillars.filter(x => x.pillarID == this.ROSEWPillarID)[0]
            : this.pillars[0];
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
    this.evaluatorService
      .getAssessmentProgressHistory({
        userCountryMappingID: this.selectedUserCountryMappingID,
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
      if (!this.selectedUserCountryMappingID || this.selectedUserCountryMappingID == 0) {
        this.toaster.showWarning("Please select country first");
        return;
      }
      if (this.questionsArray.controls[index].valid && this.questionsArray.controls[index].dirty) {
        const payload: AddAssessmentDto = {
          userCountryMappingID: this.selectedUserCountryMappingID,
          assessmentID: this.pillerQuestions?.assessmentID ?? 0,
          pillarID: this.pillerQuestions?.pillarID ?? 0,
          responses: [this.questionsArray.controls[index].value],
          isAutoSave: true,
          isFinalized: false
        };
        this.evaluatorService.saveAssessment(payload).subscribe({
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
    if (!this.pillerQuestions?.pillarID || this.pillars.length === 0) {
      return false;
    }
    const sortedPillars = this.getSortedPillars();
    const currentIndex = sortedPillars.findIndex(
      (pillar) => pillar.pillarID === this.pillerQuestions?.pillarID
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
    return [...this.pillars]
      .filter((pillar) => pillar.pillarID !== this.ROSEWPillarID)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
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
      return txt.value.replace(/\u00a0/g, ' ');
    }
    return "";
  }
}
