import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddQuestionRequest, GetQuestionResponse, QuestionOption } from 'src/app/core/models/QuestionResponse';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-add-update-question',
  templateUrl: './add-update-question.component.html',
  styleUrl: './add-update-question.component.css'
})
export class AddUpdateQuestionComponent implements OnChanges, OnInit {

  @Input() question: GetQuestionResponse | null = null;
  @Input() pillars: PillarsVM[] = [];
  @Output() questionChange = new EventEmitter<AddQuestionRequest | null>();
  @Output() bulkQuestionChange = new EventEmitter<AddQuestionRequest[] | null>();
  @Output() closeModal = new EventEmitter<boolean>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() loading: boolean = false;
  isSubmitted = false;
  alertMsg = '';
  scoreOptions = [
    { scoreValue: 4 },
    { scoreValue: 3 },
    { scoreValue: 2 },
    { scoreValue: 1 },
    { scoreValue: 0 },
    { scoreValue: -1 },
    { scoreValue: -2 },
    { scoreValue: -3 },
    { scoreValue: -4 },
    { scoreValue: 'N/A' },
    { scoreValue: 'Indeterminate' }
  ];

  weightOptions = [
    { id: 1, value: 3.0, stars: '★★', tier: 'critical' },
    { id: 2, value: 1.5, stars: '★',  tier: 'high' },
    { id: 3, value: 1.0, stars: '',   tier: 'standard' }
  ];
  excelData: any[] = [];
  requiredHeaders = [
    "QuestionText", "PillarName",
    "Option1Text", "Option1Score",
    "Option2Text", "Option2Score",
    "Option3Text", "Option3Score",
    "Option4Text", "Option4Score",
    "Option5Text", "Option5Score"
  ];
  scoreHeaders = [
    "Option1Score",
    "Option2Score",
    "Option3Score",
    "Option4Score",
    "Option5Score"
  ];

  questionForm: FormGroup<any> = this.fb.group({});

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initializeForm(this.question)
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initializeForm(this.question)
  }


  initializeForm(question: GetQuestionResponse | null) {
    this.questionForm = this.fb.group({
      questionText: [question?.questionText, Validators.required],
      pillarID: [question?.pillarID, Validators.required],
      weightID: [question?.weightID, Validators.required],
      questionOptions: this.fb.array([])
    });
    if ((question?.questionOptions?.length ?? 0) > 0) {
      question?.questionOptions.forEach(element => {
        if (element.scoreValue != null)
          this.addOption(element);
      });
    } else {
      this.addOption(null);
    }
  }

  get questionOptions(): FormArray {
    return this.questionForm.get('questionOptions') as FormArray;
  }

  createOption(option: QuestionOption | null = null): FormGroup {
    return this.fb.group({
      optionText: [option?.optionText, Validators.required],
      scoreValue: [option?.scoreValue ?? '', Validators.required],
      optionID: [option?.optionID ?? 0],
      questionID: [this.question?.questionID ?? 0]
    });
  }

  addOption(option: QuestionOption | null = null): void {
    this.questionOptions.push(this.createOption(option));
  }

  // Remove option at index
  removeOption(index: number): void {
    this.questionOptions.removeAt(index);
  }
  onSubmit() {
    this.isSubmitted = true;
    if (this.questionForm.valid) {
      const data: AddQuestionRequest = {
        ...this.questionForm.value,
        questionID: this.question?.questionID ?? 0
      };
      this.questionChange.emit(data);
    }
  }
  downloadTemplate() {
    const headers = [
      "QuestionText",
      "PillarName",
      "Weight",
      "Option1Text", "Option1Score",
      "Option2Text", "Option2Score",
      "Option3Text", "Option3Score",
      "Option4Text", "Option4Score",
      "Option5Text", "Option5Score",
      "Option6Text", "Option6Score",
      "Option7Text", "Option7Score",
      "Option8Text", "Option8Score",
      "Option9Text", "Option9Score",
      "Option10Text", "Option10Score",
      "Option11Text", "Option11Score",
    ];

    // One sample row
    const sampleRow = {
      QuestionText: "Enter Question",
      PillarName: "Enter Pillar",
      Weight: "Enter Weight (1.0, 1.5, 3.0)", 
      Option1Text: "Enter Option 1", Option1Score: "4",
      Option2Text: "Enter Option 2", Option2Score: "3",
      Option3Text: "Enter Option 3", Option3Score: "2",
      Option4Text: "Enter Option 4", Option4Score: "1",
      Option5Text: "Enter Option 5", Option5Score: "0",
      Option6Text: "Enter Option 6", Option6Score: "-1",
      Option7Text: "Enter Option 7", Option7Score: "-2",
      Option8Text: "Enter Option 8", Option8Score: "-3",
      Option9Text: "Enter Option 9", Option9Score: "-4",
      Option10Text: "Enter Option 10", Option10Score: "N/A",
      Option11Text: "Enter Option 11", Option11Score: "Indeterminate"
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QuestionsTemplate');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'QuestionsTemplate.xlsx');
  }
  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      const jsonData = <any[]>XLSX.utils.sheet_to_json(ws, { defval: "" });

      const headers = Object.keys(jsonData[0] || {});
      const missingHeaders = this.requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        this.alertMsg = `Invalid file format. Missing headers: ${missingHeaders.join(", ")}`;
        this.fileInput.nativeElement.value = "";
        return;
      }

      const questions: AddQuestionRequest[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const pillarName = String(row["PillarName"] ?? "").trim();
        const questionText = String(row["QuestionText"] ?? "").trim();

        // ✅ case 1: blank row (skip)
        if (!pillarName && !questionText) {
          continue;
        }
        if(pillarName.toLowerCase() == "Enter Pillar".toLowerCase()) {
          continue;
        }

        // ✅ case 2: one missing → error
        if (!pillarName || !questionText) {
          this.alertMsg = `Row ${i + 2}: Both PillarName and QuestionText are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        // ✅ case 3: both present → validate pillar
        const pillar = this.getPillarByName(pillarName);
        if (!pillar) {
          this.alertMsg = `Row ${i + 2}: Invalid Pillar - ${pillarName}`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        const weightValue = parseFloat(String(row["Weight"] ?? "1.0").trim());
        if(weightValue !== 1.0 && weightValue !== 1.5 && weightValue !== 3.0) {
          this.alertMsg = `Row ${i + 2}: Invalid Weight - ${weightValue}. Allowed values are 1.0, 1.5, 3.0`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        const weightOption = this.weightOptions.find(w => w.value === weightValue);
        const validScores = ["4", "3", "2", "1", "0", "-1", "-2", "-3", "-4", "N/A", "INDETERMINATE"];
        let invalidScoreFound = false;
        for (let optionNum = 1; optionNum <= 12; optionNum++) {
          const optionText = String(row[`Option${optionNum}Text`] ?? "").trim();
          const scoreRaw = String(row[`Option${optionNum}Score`] ?? "").trim();
          if (!optionText || !scoreRaw) {
            continue;
          }
          
          const scoreNormalized = scoreRaw.toUpperCase();
          
          if (/^-?\d+\.\d+$/.test(scoreRaw)) {
            this.alertMsg = `Row ${i + 2}: Invalid Score for Option${optionNum} - "${scoreRaw}". Decimal values are not allowed.`;
            invalidScoreFound = true;
            break;
          }
          if (!validScores.includes(scoreNormalized)) {
            this.alertMsg = `Row ${i + 2}: Invalid Score for Option${optionNum} - "${scoreRaw}". Allowed values are 4, 3, 2, 1, 0, -1, -2, -3, -4, N/A, or Indeterminate.`;
            invalidScoreFound = true;
            break;
          }
        }

        if (invalidScoreFound) {
          this.fileInput.nativeElement.value = "";
          return;
        }
        
        const question: AddQuestionRequest = {
          questionID: 0,
          pillarID: pillar.pillarID,
          questionText: questionText,
          weightID: weightOption ? weightOption.id : 1,
          questionOptions: [
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option1Text"] ?? "").trim(),
              scoreValue: String(row["Option1Score"] ?? "").trim(),
              displayOrder: 1
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option2Text"] ?? "").trim(),
              scoreValue: String(row["Option2Score"] ?? "").trim(),
              displayOrder: 2
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option3Text"] ?? "").trim(),
              scoreValue: String(row["Option3Score"] ?? "").trim(),
              displayOrder: 3
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option4Text"] ?? "").trim(),
              scoreValue: String(row["Option4Score"] ?? "").trim(),
              displayOrder: 4
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option5Text"] ?? "").trim(),
              scoreValue: String(row["Option5Score"] ?? "").trim(),
              displayOrder: 5
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option6Text"] ?? "").trim(),
              scoreValue: String(row["Option6Score"] ?? "").trim(),
              displayOrder: 6
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option7Text"] ?? "").trim(),
              scoreValue: String(row["Option7Score"] ?? "").trim(),
              displayOrder: 7
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option8Text"] ?? "").trim(),
              scoreValue: String(row["Option8Score"] ?? "").trim(),
              displayOrder: 8
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option9Text"] ?? "").trim(),
              scoreValue: String(row["Option9Score"] ?? "").trim(),
              displayOrder: 9
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option10Text"] ?? "").trim(),
              scoreValue: String(row["Option10Score"] ?? "").trim(),
              displayOrder: 10
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option11Text"] ?? "").trim(),
              scoreValue: String(row["Option11Score"] ?? "").trim(),
              displayOrder: 11
            },
            {
              optionID: 0,
              questionID: 0,
              optionText: String(row["Option12Text"] ?? "").trim(),
              scoreValue: String(row["Option12Score"] ?? "").trim(),
              displayOrder: 12
            }
          ].filter(o => o.optionText) // ✅ remove empty options
        };

        questions.push(question);
      }
      this.excelData = questions;
      if (this.excelData.length == 0)
      {
        this.alertMsg = "The uploaded file does not contain any valid records.";
      }
    };

    reader.readAsBinaryString(target.files[0]);
  }


  private getPillarByName(pillarName: string): PillarsVM | undefined {
    return this.pillars.find(
      x => x.pillarName.toLowerCase().trim() === pillarName.trim().toLowerCase()
    );
  }

  private parseScore(val: any): number {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  bulkImport() {
    if (this.excelData.length > 0 && this.fileInput.nativeElement.value != "") {
      this.bulkQuestionChange.emit(this.excelData);
      this.fileInput.nativeElement.value = "";
      this.excelData = [];
    }
  }
  closeModel() {
    if( this.fileInput?.nativeElement?.value)
    this.fileInput.nativeElement.value = "";
    this.alertMsg = ''
    this.closeModal.emit(true);
  }

  getSelectedWeight() {
    const selectedId = this.questionForm.get('weightID')?.value;
    return this.weightOptions.find(w => w.id === selectedId);
  }

  getWeightTierClass(): string {
    const selected = this.getSelectedWeight();
    return selected ? 'weight-' + selected.tier : '';
  }
}
