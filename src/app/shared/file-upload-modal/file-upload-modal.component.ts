import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-file-upload-modal',
  templateUrl: './file-upload-modal.component.html',
  styleUrl: './file-upload-modal.component.css'
})
export class FileUploadModalComponent implements AfterViewInit, OnDestroy {
  selectedFile: File | null = null;
  @Output() fileUploaded = new EventEmitter<File>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  get selectedFileName(): string {
    return this.selectedFile?.name || 'No file chosen';
  }

  saveFile() {
    if (this.selectedFile) {
      this.fileUploaded.emit(this.selectedFile);
      this.closeModal();
    }
  }

  closeModal() {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedFile = null;
    const modal = document.getElementById('exampleModal');
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
    }
  }
}
