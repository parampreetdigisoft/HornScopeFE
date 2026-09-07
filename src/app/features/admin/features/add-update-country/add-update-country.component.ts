import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CountryVM } from '../../../../core/models/CountryVM';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CommonService } from 'src/app/core/services/common.service';
import { debounceTime } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CountryUserService } from 'src/app/features/city-user/country-user.service';

@Component({
  selector: 'app-add-update-country',
  templateUrl: './add-update-country.component.html',
  styleUrls: ['./add-update-country.component.css']
})
export class AddUpdateCountryComponent implements OnChanges, OnInit {
  urlBase = environment.apiUrl;
  selectedFile: File | null = null;
  @Input() country: CountryVM | null | undefined = null;
  @Output() countryChange = new EventEmitter<FormData>();
  @Output() bulkImport = new EventEmitter<CountryVM[]>();
  @Output() closeModal = new EventEmitter<boolean>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef;
  @Input() loading: boolean = false;
  isSubmitted = false;
  countryForm!: FormGroup;
  selectedImage: string | ArrayBuffer | null = null;
  bulkImportData: CountryVM[] | null = null;
  alertMsg = '';
  imageError: string = '';
  imageFile: File | null = null;
  countryList: CountryVM[] = [];

  categories: string[] = [
    'Developed Countries',
    'Economies in Transition',
    'Developing Countries',
    'Least Developed Countries (LDCs)'
  ];

  constructor(private fb: FormBuilder, private commonService: CommonService, private cityuserService: CountryUserService,) { }

  ngOnInit(): void {
    this.initializeForm();
    this.getAllCountries();
    console.log(this.country);
  }

  get selectedFileName(): string {
    return this.selectedFile?.name || 'No file chosen';
  }

  initializeForm() {
    this.isSubmitted = false;
    this.countryForm = this.fb.group({
      continent: [this.country?.continent, Validators.required],
      countryName: [this.country?.countryName, Validators.required],
      region: [this.country?.region, Validators.required],
      countryCode: [this.country?.countryCode, Validators.required],
      latitude: [this.country?.latitude, Validators.required],
      longitude: [this.country?.longitude, Validators.required],
      population: [this.country?.population, Validators.required],
      income: [this.country?.income, Validators.required],
      countryAliasName: [this.country?.countryAliasName ?? ''],
      category: [this.country?.developmentCategory,Validators.required],
      countries: [this.country?.peerCountryIDs || []],
      imageFile: ['']
    });
    this.onFormChange();
    if (this.countryForm.get('latitude')?.invalid && this.countryForm.get('countryName')?.valid) {
      this.getLatitudeLongitude();
    }
  }
  onFormChange() {
    this.countryForm.valueChanges.pipe(debounceTime(500)).subscribe({
      next: (r) => {
        if (this.countryForm.get('latitude')?.invalid && this.countryForm.get('countryName')?.valid) {
          this.getLatitudeLongitude();
        }
      }
    })
  }

  getLatitudeLongitude() {
    const query = [
      this.countryForm.get('region')?.value,
      this.countryForm.get('countryName')?.value,
      this.countryForm.get('continent')?.value
    ].filter(Boolean).join(', ');

    const params = {
      q: query,
      format: 'json',
      limit: 1
    };

    this.commonService.getLatitudeLongitude(params).subscribe({
      next: (r) => {
        if (r.length) {
          this.countryForm.patchValue({
            latitude: r[0].lat,
            longitude: r[0].lon
          });
        }
      }
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedImage = null;
    //this.initializeForm();
  }
  getAllCountries() {
    this.cityuserService.getAllCountries().subscribe({
      next: (res) => {
        if (res.succeeded) {          
          this.countryList = res.result ?? [];
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
  onSubmit() {    
    this.isSubmitted = true;
    if (this.countryForm.invalid) return;

    const formData = new FormData();

    formData.append('Continent', this.countryForm.get('continent')?.value);
    formData.append('CountryName', this.countryForm.get('countryName')?.value);
    formData.append('Region', this.countryForm.get('region')?.value);
    formData.append('CountryCode', this.countryForm.get('countryCode')?.value);
    formData.append('Longitude', this.countryForm.get('longitude')?.value);
    formData.append('Latitude', this.countryForm.get('latitude')?.value);
    formData.append('DevelopmentCategory', this.countryForm.get('category')?.value);

    // 👇 New fields
    formData.append('Population', this.countryForm.get('population')?.value);
    formData.append('Income', this.countryForm.get('income')?.value);
    formData.append('CountryAliasName', this.countryForm.get('countryAliasName')?.value);
    formData.append('CountryID', (this.country?.countryID ?? 0).toString());


    // 👇 Peer Countries (array)
    const peerCountries = this.countryForm.get('countries')?.value;
    if (peerCountries && peerCountries.length > 0) {
      peerCountries.forEach((countryID: number) => {
        formData.append('PeerCountries', countryID.toString());
      });
    }

    // 👇 Image
    if (this.selectedFile) {
      formData.append('ImageFile', this.selectedFile as Blob, this.selectedFile?.name);
    }

    this.countryChange.emit(formData);
  }

  downloadTemplate() {
  const headers = [
    "CountryName",
    "CountryAliasName",
    "Continent",
    "Region",
    "CountryCode",
    "Latitude",
    "Longitude",
    "Population",
    "Income",
    "DevelopmentCategory"
  ];

  const sampleRow = {
    CountryName: "Enter Country Name",
    CountryAliasName: "Enter Country Alias Name",
    Continent: "Enter Continent Name",
    Region: "Enter Region Name",
    CountryCode: "Enter Country Code",
    Latitude: "Enter Latitude",
    Longitude: "Enter Longitude",
    Population: "Enter Population",
    Income: "Enter Income",
    DevelopmentCategory: "Enter one category - " + this.categories.join(", ")
  };

  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  // ✅ Add dropdown for Category column (column K)
  ws['!dataValidation'] = [
    {
      sqref: 'K2:K100', // Apply dropdown from row 2 to 100
      type: 'list',
      allowBlank: true,
      formula1: '"Developed Countries,Economies in Transition,Developing Countries,Least Developed Countries (LDCs)"'
    }
  ];

  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CountriesTemplate');

  const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

  saveAs(data, 'CountriesTemplate.xlsx');
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
        "CountryName",
        "Continent",
        "Region",
        "Latitude",
        "Longitude",
        "Population",
        "Income",
        "DevelopmentCategory"
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

      const excelData: CountryVM[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        const countryName = String(row["CountryName"] || "").trim();
        const countryAliasName = String(row["CountryAliasName"] || "").trim(); // optional     
        const continent = String(row["Continent"] || "").trim();
        const region = String(row["Region"] || "").trim();
        const countryCode = String(row["CountryCode"] || "").trim();
        const latitude = Number(row["Latitude"] || "");
        const longitude = Number(row["Longitude"] || "");
        const population = Number(row["Population"] || "");
        const income = Number(row["Income"] || "");
        const developmentCategory = String(row["DevelopmentCategory"] || "");
        const isCompletelyBlank = !countryName && !continent && !region;

        if (isCompletelyBlank) continue;

        // ✅ Required field check
        if (!countryName || !continent) {
          this.alertMsg = `Row ${i + 2}: Country Name and Continent are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        if (!developmentCategory) {
          this.alertMsg = `Row ${i + 2}: Category is  required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        // Skip template row
        if (countryName.toLowerCase() === "enter country name".toLowerCase()) {
          continue;
        }

        // ✅ Prevent duplicate countryName in same file
        if (excelData.some(c => c.countryName.toLowerCase() === countryName.toLowerCase())) {
          this.alertMsg = `Row ${i + 2}: Duplicate country name (${countryName}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        // ✅ Construct DTO
        const dto = { countryName,countryAliasName, continent, region, countryCode, latitude, longitude, population, income,  developmentCategory } as CountryVM;
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


  bulkImportCountry() {

    if (this.bulkImportData && this.bulkImportData.length && this.fileInput.nativeElement.value != "") {
      this.bulkImport.emit(this.bulkImportData);
      this.bulkImportData = [];
    }
    this.fileInput.nativeElement.value = "";
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
