import { Component, computed, EventEmitter, input, Input, OnChanges, OnInit, Output, output, signal, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { GetProgramDocumentResponseDto, GetProgramPillarDocumentResponseDto } from 'src/app/core/models/aiVm/GetProgramDocumentResponseDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { FormsModule } from '@angular/forms';
import { DeleteProgramDocumentRequestDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestDto';
import { PromptComponent } from '../../prompt/prompt.component';

export interface SelectedFileModel {
  file: File;
  pillarID?: number;
  pillarName?: string;
}

@Component({
  selector: 'app-ai-document-view-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PromptComponent],
  templateUrl: './ai-document-view-details.component.html',
  styleUrl: './ai-document-view-details.component.css'
})

export class AiDocumentViewDetailsComponent implements OnInit, OnChanges {

  selectProgramDocument?: number | string;
  totalFiles = computed(() => (this.selectedProgram()?.noOfFiles ?? 0) + this.selectedFiles().length);
  selectedProgram = input<GetProgramDocumentResponseDto | null | undefined>(null);
  documents = input<GetProgramPillarDocumentResponseDto[]>([]);
  pillars = input<PillarsVM[]>([]);
  isUploadModalOpen = false;
  selectedFiles = signal<SelectedFileModel[]>([]);
  selectedPillarID?: number;
  @Output() uploadedDocuments = new EventEmitter<FormData>();
  @Output() deleteDocument = new EventEmitter<DeleteProgramDocumentRequestDto>();
  @Output() downloadDocument = new EventEmitter<GetProgramPillarDocumentResponseDto>();
  @Input() saveDocumentLoader: boolean = false;
  programDocuments = computed(() =>
    this.documents().filter(x => !x.pillarID)
  );

  pillarDocuments = computed(() =>
    this.documents().filter(x => x.pillarID != null && x.pillarID > 0)
  );

  urlBase = environment.apiUrl;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.selectedFiles.set([]);
    this.selectProgramDocument = this.selectedProgram()?.climateProgramID
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

  uploadDocuments() {
    const formData = new FormData();
    if (this.selectProgramDocument && this.selectProgramDocument != undefined && this.selectProgramDocument != "undefined") {
      formData.append('climateProgramID', this.selectProgramDocument.toString());
    }
    this.selectedFiles().forEach((item, index) => {
      formData.append('Files', item.file); 
      formData.append('PillarIDs', item.pillarID?.toString() ?? '0');
    });
    this.uploadedDocuments.emit(formData);
  }

  openUploadModal() {
    this.isUploadModalOpen = true;
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.selectedFiles.set([]);
    this.selectedPillarID = undefined;
  }

  doneUploadModal() {
    this.isUploadModalOpen = false;
    this.selectedPillarID = undefined;
  }

  deleteProgramDocument(doc: GetProgramPillarDocumentResponseDto) {
    let payload: DeleteProgramDocumentRequestDto = {
      climateProgramID: this.selectedProgram()?.climateProgramID ?? 0,
      programDocumentID: doc?.programDocumentID,
      isAll: false
    }
    this.deleteDocument.emit(payload);
  }

  download(doc: GetProgramPillarDocumentResponseDto) {
    this.downloadDocument.emit(doc);
  }
}

