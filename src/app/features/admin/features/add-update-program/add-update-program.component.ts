import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ProgramVM } from '../../../../core/models/ProgramVM';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CommonService } from 'src/app/core/services/common.service';
import { environment } from 'src/environments/environment';
import { AdminService } from 'src/app/features/admin/admin.service';

@Component({
  selector: 'app-add-update-program',
  templateUrl: './add-update-program.component.html',
  styleUrls: ['./add-update-program.component.css']
})
export class AddUpdateProgramComponent implements OnChanges, OnInit {
  urlBase = environment.apiUrl;
  selectedFile: File | null = null;
  @Input() program: ProgramVM | null | undefined = null;
  @Output() programChange = new EventEmitter<FormData>();
  @Output() bulkImport = new EventEmitter<ProgramVM[]>();
  @Output() closeModal = new EventEmitter<boolean>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef;
  @Input() loading: boolean = false;
  isSubmitted = false;
  programForm!: FormGroup;
  selectedImage: string | ArrayBuffer | null = null;
  bulkImportData: ProgramVM[] | null = null;
  alertMsg = '';
  imageError: string = '';
  imageFile: File | null = null;
  programList: ProgramVM[] = [];

  statusList: string[] = [
    'In Progress',
    'On Hold',
    'Cancelled'
  ];

  // ✅ Statuses that force IsActive to false, silently (not shown in UI)
  private inactiveStatuses: string[] = ['On Hold', 'Cancelled'];

  constructor(private fb: FormBuilder, private commonService: CommonService, private adminService: AdminService) { }

  ngOnInit(): void {
    this.initializeForm();
    this.getAllPrograms();
  }

  initializeForm() {
    this.isSubmitted = false;
    const formatDate = (date: Date | string | null | undefined) => {
      if (!date) return null;
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    this.programForm = this.fb.group({
      climateProgramID: [this.program?.climateProgramID ?? 0],
      programName: [this.program?.programName, Validators.required],
      year: [this.program?.year ?? new Date().getFullYear(), Validators.required],
      location: [this.program?.location, Validators.required],
      startAt: [formatDate(this.program?.startAt) ?? new Date().toISOString().substring(0, 10)],
      endAt: [formatDate(this.program?.endAt)],
      status: [this.program?.status ?? 'In Progress', Validators.required],
      isActive: [this.computeIsActive(this.program?.status)],
      description: [this.program?.description,Validators.required],
      programs: [this.program?.peerProgramIDs || []],
      imageFile: ['']
    }, { validators: this.dateRangeValidator });

    this.programForm.get('status')?.valueChanges.subscribe((status: string) => {
      this.programForm.get('isActive')?.setValue(this.computeIsActive(status), { emitEvent: false });
    });
  }
  
 computeIsActive(status: string | undefined | null): boolean {
    if (!status) return true;
    return !this.inactiveStatuses.includes(status);
  }

  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startAt')?.value;
    const end = group.get('endAt')?.value;
    if (start && end && new Date(end) < new Date(start)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedImage = null;
  }

  getAllPrograms() {
    this.adminService.getAllProgramsByUserId(1).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.programList = res.result ?? [];
        }
      }
    });
  }

  onFileChange(event: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image file.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5 MB limit
      this.imageError = 'Image size should be less than 5MB.';
      return;
    }

    this.imageError = '';
    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result;
    };
    reader.readAsDataURL(file);
    this.selectedFile = event.target.files[0];
  }
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().toLowerCase().includes(term)
    );
  }

  onSubmit() {
    this.isSubmitted = true;
    if (this.programForm.invalid) return;

    const formData = new FormData();

    formData.append('ClimateProgramID', (this.program?.climateProgramID ?? 0).toString());
    formData.append('ProgramName', this.programForm.get('programName')?.value);
    formData.append('Year', this.programForm.get('year')?.value);
    formData.append('Location', this.programForm.get('location')?.value);
    formData.append('StartAt', this.programForm.get('startAt')?.value);
    formData.append('EndAt', this.programForm.get('endAt')?.value ?? '');
    formData.append('Status', this.programForm.get('status')?.value);
    formData.append('IsActive', this.programForm.get('isActive')?.value);
    formData.append('Description', this.programForm.get('description')?.value ?? '');

    // 👇 Peer Programs (array)
    const peerPrograms = this.programForm.get('programs')?.value;
    if (peerPrograms && peerPrograms.length > 0) {
      peerPrograms.forEach((climateProgramID: number) => {
        formData.append('PeerProgramIDs', climateProgramID.toString());
      });
    }

    // 👇 Image
    if (this.selectedFile) {
      formData.append('ImageFile', this.selectedFile as Blob, this.selectedFile?.name);
    }

    this.programChange.emit(formData);
  }

  downloadTemplate() {
    const headers = [
      "ProgramName",
      "ConferenceYear",
      "Location",
      "StartAt",
      "EndAt",
      "Status",
      "Description"
    ];

    const sampleRow = {
      ProgramName: "Enter Program Name",
      ConferenceYear: "Enter Conference Year",
      Location: "Enter Location",
      StartAt: "YYYY-MM-DD",
      EndAt: "YYYY-MM-DD",
      Status: "Enter one status - " + this.statusList.join(", "),
      Description: "Enter Description"
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    // ✅ Dropdown for Status column (column F)
    ws['!dataValidation'] = [
      {
        sqref: 'F2:F100',
        type: 'list',
        allowBlank: true,
        formula1: `"${this.statusList.join(",")}"`
      }
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProgramsTemplate');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(data, 'ProgramsTemplate.xlsx');
  }

  // 👉 Handle file import
  handleFileImport(evt: any) {
    this.alertMsg = '';

    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;

    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      // ✅ Read headers from first row
      const sheetHeaders: string[] = (XLSX.utils.sheet_to_json(ws, {
        header: 1,
        range: 0
      })[0] as string[] || []).map(h => String(h).trim());

      const requiredHeaders = [
        "ProgramName",
        "ConferenceYear",
        "Location",
        "Status",
        "Description"
      ];

      // ✅ Check missing required headers
      const missingHeaders = requiredHeaders.filter(h => !sheetHeaders.includes(h));
      if (missingHeaders.length > 0) {
        this.alertMsg = `Invalid file format. Missing headers: ${missingHeaders.join(", ")}`;
        this.fileInput.nativeElement.value = "";
        return;
      }

      // ✅ Validate order ONLY for required headers
      const requiredInSheet = sheetHeaders.filter(h => requiredHeaders.includes(h));
      const isOrderCorrect =
        JSON.stringify(requiredInSheet.map(h => h.toLowerCase())) ===
        JSON.stringify(requiredHeaders.map(h => h.toLowerCase()));

      if (!isOrderCorrect) {
        this.alertMsg = `Invalid column order. Please download the latest template and upload again.`;
        this.fileInput.nativeElement.value = "";
        return;
      }

      // ✅ Convert to JSON after validation
      const jsonData = <any[]>XLSX.utils.sheet_to_json(ws, { defval: "" });

      const excelData: ProgramVM[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        const programName = String(row["ProgramName"] || "").trim();
        const year = Number(row["ConferenceYear"] || "");
        const location = String(row["Location"] || "").trim();
        const startAt = this.formatExcelDate(row["StartAt"]);
        const endAt = this.formatExcelDate(row["EndAt"]);
        const status = String(row["Status"] || "").trim();
        const description = String(row["Description"] || "").trim();

        const isCompletelyBlank = !programName && !location && !status;

        if (isCompletelyBlank) continue;

         // Skip template row
        if (programName.toLowerCase() === "enter program name".toLowerCase()) {
          continue;
        }
        // ✅ Required field check
        if (!programName || !location) {
          this.alertMsg = `Row ${i + 2}: Program Name and Location are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        if (!year) {
          this.alertMsg = `Row ${i + 2}: Conference Year is required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        if (!status) {
          this.alertMsg = `Row ${i + 2}: Status is required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        if (!description) {
          this.alertMsg = `Row ${i + 2}: Description is required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        // ✅ Prevent duplicate programName in same file
        if (excelData.some(c => c.programName.toLowerCase() === programName.toLowerCase())) {
          this.alertMsg = `Row ${i + 2}: Duplicate program name (${programName}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        const isActive = this.computeIsActive(status);

        const dto = {
          programName,
          year,
          location,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          status,
          isActive,
          description
        } as ProgramVM;
        excelData.push(dto);
      }

      this.bulkImportData = excelData;

      if (excelData.length === 0) {
        this.fileInput.nativeElement.value = "";
        this.alertMsg = "No record found";
      }
    };

    reader.readAsBinaryString(target.files[0]);
  }

  bulkImportProgram() {
    if (this.bulkImportData && this.bulkImportData.length && this.fileInput.nativeElement.value != "") {
      this.bulkImport.emit(this.bulkImportData);
      this.bulkImportData = [];
    }
    this.fileInput.nativeElement.value = "";
  }

 formatExcelDate(value: any): string {
  if (!value) return '';

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  return value;
}

  closeModel() {
    if (this.fileInput?.nativeElement?.value)
      this.fileInput.nativeElement.value = "";
    this.alertMsg = '';
    this.closeModal.emit(true);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }
}