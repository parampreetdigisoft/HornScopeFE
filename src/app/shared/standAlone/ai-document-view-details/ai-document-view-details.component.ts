import { Component, computed, EmbeddedViewRef, EventEmitter, input, Input, OnChanges, OnDestroy, OnInit, Output, signal, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { GetCountryDocumentResponseDto, GetCountryPillarDocumentResponseDto } from 'src/app/core/models/aiVm/GetCountryDocumentResponseDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { FormsModule } from '@angular/forms';
import { DeleteCountryDocumentRequestDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestDto';
import { PromptComponent } from '../../prompt/prompt.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgSelectDefaultsDirective } from '../../directives/ng-select-defaults.directive';

export interface SelectedFileModel {
  file: File;
  pillarID?: number;
  pillarName?: string;
}

export interface UploadCountryOption {
  value: number | 'global';
  label: string;
}

@Component({
  selector: 'app-ai-document-view-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgSelectDefaultsDirective],
  templateUrl: './ai-document-view-details.component.html',
  styleUrl: './ai-document-view-details.component.css'
})

export class AiDocumentViewDetailsComponent implements OnInit, OnChanges, OnDestroy {

  @ViewChild('uploadModal') uploadModalTpl?: TemplateRef<unknown>;
  private uploadModalView?: EmbeddedViewRef<unknown>;

  selectCountryDocuemnt?: number | string;
  totalFiles = computed(() => (this.selectedCountry()?.noOfFiles ?? 0) + this.selectedFiles().length);
  selectedCountry = input<GetCountryDocumentResponseDto | null | undefined>(null);
  documents = input<GetCountryPillarDocumentResponseDto[]>([]);
  pillars = input<PillarsVM[]>([]);
  isUploadModalOpen = false;
  selectedFiles = signal<SelectedFileModel[]>([]);
  selectedPillarID?: number;
  @Output() uploadedDocuments = new EventEmitter<FormData>();
  @Output() deleteDocument = new EventEmitter<DeleteCountryDocumentRequestDto>();
  @Output() downloadDocument = new EventEmitter<GetCountryPillarDocumentResponseDto>();
  @Input() saveDocumentLoader: boolean = false;
  countryDocuments = computed(() =>
    this.documents().filter(x => !x.pillarID)
  );

  pillarDocuments = computed(() =>
    this.documents().filter(x => x.pillarID != null && x.pillarID > 0)
  );

  urlBase = environment.apiUrl;

  countryUploadOptions = computed<UploadCountryOption[]>(() => {
    const country = this.selectedCountry();
    const options: UploadCountryOption[] = [
      { value: 'global', label: 'Mark as Global' }
    ];
    if (country?.countryID != null) {
      options.push({
        value: country.countryID,
        label: country.countryName
      });
    }
    return options;
  });

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngOnInit(): void {
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.selectedFiles.set([]);
    this.selectCountryDocuemnt = this.selectedCountry()?.countryID
  }
  ngOnDestroy(): void {
    this.destroyUploadModalView();
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      if (!allowedTypes.includes(file.type)) continue;

      const exists = this.selectedFiles().some(
        f => f.file.name === file.name && f.file.size === file.size
      );

      if (!exists) {
        let f: SelectedFileModel = {
          pillarID: this.selectedPillarID,
          pillarName: this.pillars().find(x => x.pillarID == this.selectedPillarID)?.pillarName,
          file: file
        }

        this.selectedFiles.update(files => [...files, f]);
        this.selectedPillarID = undefined;
      }
    }

    input.value = '';
  }

  removeFile(index: number) {
    this.selectedFiles.update(files =>
      files.filter((_, i) => i !== index)
    );
  }

  formatFileSize(size: number): string {
    return (size / 1024).toFixed(2) + ' KB';
  }

  get selectedFileName(): string {
    const files = this.selectedFiles();
    if (!files.length) {
      return 'No file chosen';
    }
    if (files.length === 1) {
      return files[0].file.name;
    }
    return `${files.length} files selected`;
  }

  uploadDocuments() {
    const formData = new FormData();
    if (
      this.selectCountryDocuemnt != null &&
      this.selectCountryDocuemnt !== undefined &&
      this.selectCountryDocuemnt !== 'undefined' &&
      this.selectCountryDocuemnt !== 'global'
    ) {
      formData.append('CountryID', this.selectCountryDocuemnt.toString());
    }
    this.selectedFiles().forEach((item, index) => {
      formData.append('Files', item.file); 
      formData.append('PillarIDs', item.pillarID?.toString() ?? '0');
    });
    this.uploadedDocuments.emit(formData);
  }

  openUploadModal() {
    if (this.isUploadModalOpen) {
      return;
    }
    this.isUploadModalOpen = true;
    this.attachUploadModal();
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.destroyUploadModalView();
    this.selectedFiles.set([]);
    this.selectedPillarID = undefined;
  }

  doneUploadModal() {
    this.isUploadModalOpen = false;
    this.destroyUploadModalView();
    this.selectedPillarID = undefined;
  }

  private attachUploadModal() {
    if (!this.uploadModalTpl || this.uploadModalView) {
      return;
    }
    this.uploadModalView = this.viewContainerRef.createEmbeddedView(this.uploadModalTpl);
    this.uploadModalView.detectChanges();
    this.uploadModalView.rootNodes.forEach(node => {
      if (node instanceof Node) {
        document.body.appendChild(node);
      }
    });
    document.body.style.overflow = 'hidden';
    document.body.classList.add('ai-doc-upload-open');
  }

  private destroyUploadModalView() {
    this.uploadModalView?.destroy();
    this.uploadModalView = undefined;
    document.body.style.overflow = '';
    document.body.classList.remove('ai-doc-upload-open');
  }

  deleteCountryDocument(doc: GetCountryPillarDocumentResponseDto) {
    let payload: DeleteCountryDocumentRequestDto = {
      countryID: this.selectedCountry()?.countryID ?? 0,
      countryDocumentID: doc?.countryDocumentID,
      isAll: false
    }
    this.deleteDocument.emit(payload);
  }

  download(doc: GetCountryPillarDocumentResponseDto) {
    this.downloadDocument.emit(doc);
  }
}

