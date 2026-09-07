import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { AnalyticalLayerPillarMappingDTO } from 'src/app/core/models/AnalyticalLayerPillarMapping';
import { AdminService } from '../../admin.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-update-pillar',
  templateUrl: './update-pillar.component.html',
  styleUrl: './update-pillar.component.css'
})
export class UpdatePillarComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() pillar: PillarsVM | null = null;
  @Input() kpis: AnalyticalLayerResponseDto[] = [];
  @Input() nextDisplayOrder = 1;
  @Output() pillarChange = new EventEmitter<PillarsVM | null>();
  @Output() closeModal = new EventEmitter<void>();
  @Input() loading: boolean = false;
  selectedImage: string | ArrayBuffer | null = null;
  imageFile: File | null = null;
  imageError: string = '';
  isSubmitted = false;
  isLoadingMappings = false;
  isLoadingKpiDetails = false;
  quillEditorKey = 0;
  replacementValidationMessage = '';
  pillarForm!: FormGroup;
  urlBase = environment.apiUrl;
  filteredKpis: AnalyticalLayerResponseDto[] = [];
  replacementPillarsByCategoryCache: Record<number, Array<{
    key: string;
    label: string;
    categoryNumber: number | null;
    pillars: AnalyticalLayerPillarMappingDTO[];
  }>> = {};
  initialKpiLayerIds: number[] = [];
  kpiPillarDetails: Record<number, AnalyticalLayerPillarMappingDTO[]> = {};
  selectedPillarByKpi: Record<number, number | null> = {};
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  ngAfterViewInit(): void {}

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  ngOnInit(): void {
    this.setupForm(this.pillar);
    this.quillEditorKey = 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pillar'] && this.pillarForm) {
      this.resetFileState();
      this.setupForm(this.pillar);
      this.quillEditorKey++;
    }

    if (changes['kpis'] && this.pillarForm && this.kpis.length > 0) {
      this.syncKpiControlValue();
    }
  }

  get kpiSelectReady(): boolean {
    return this.kpis.length > 0 && (!this.pillar?.pillarID || !this.isLoadingMappings);
  }

  get selectedKpiCount(): number {
    return this.getSelectedKpiIds().length;
  }

  get selectedFileName(): string {
    return this.imageFile?.name ?? 'No file chosen';
  }

  get selectedKpis(): AnalyticalLayerResponseDto[] {
    const ids = this.getSelectedKpiIds();
    return this.kpis.filter((k) => ids.includes(Number(k.layerID)));
  }

  get existingKpiDetails(): AnalyticalLayerResponseDto[] {
    if (!this.initialKpiLayerIds.length) {
      return [];
    }
    const lockedIdSet = new Set(this.initialKpiLayerIds);
    return this.kpis.filter((kpi) => lockedIdSet.has(Number(kpi.layerID)));
  }

  get selectedKpiDetails(): Array<{
    kpi: AnalyticalLayerResponseDto;
    pillars: AnalyticalLayerPillarMappingDTO[];
    selectedPillarId: number | null;
  }> {
    return this.getSelectedKpiIds()
      .map((layerID) => {
        const kpi = this.kpis.find((item) => Number(item.layerID) === Number(layerID));
        if (!kpi) {
          return null;
        }

        return {
          kpi,
          pillars: this.kpiPillarDetails[Number(layerID)] ?? [],
          selectedPillarId: this.selectedPillarByKpi[Number(layerID)] ?? null,
        };
      })
      .filter((item): item is {
        kpi: AnalyticalLayerResponseDto;
        pillars: AnalyticalLayerPillarMappingDTO[];
        selectedPillarId: number | null;
      } => item !== null);
  }

  get addedKpiLayerIds(): number[] {
    const currentIds = this.getSelectedKpiIds();
    return currentIds.filter((id) => !this.initialKpiLayerIds.includes(id));
  }

  get hasLockedKpis(): boolean {
    return !!this.pillar?.pillarID && this.initialKpiLayerIds.length > 0;
  }

  get replacementKpiDetails(): Array<{
    kpi: AnalyticalLayerResponseDto;
    pillars: AnalyticalLayerPillarMappingDTO[];
    selectedPillarId: number | null;
  }> {
    const addedIdSet = new Set(this.addedKpiLayerIds);
    return this.selectedKpiDetails
      .filter((item) => addedIdSet.has(Number(item.kpi.layerID)))
      .map((item) => ({
        kpi: item.kpi,
        pillars: this.getReplacementPillars(item.kpi.layerID),
        selectedPillarId: item.selectedPillarId,
      }));
  }

  compareKpiIds = (a: number, b: number) => Number(a) === Number(b);

  setupForm(pillar: PillarsVM | null) {
    this.initialKpiLayerIds = [];
    this.clearKpiDetails();
    this.replacementValidationMessage = '';
    this.pillarForm = this.fb.group({
      pillarName: [pillar?.pillarName ?? '', Validators.required],
      pillarCode: [pillar?.pillarCode ?? ''],
      displayOrder: [
        pillar?.displayOrder ?? this.nextDisplayOrder,
        [Validators.required, Validators.min(1)],
      ],
      weight: [1, [Validators.required, Validators.min(0.01)]],
      reliability: [pillar?.reliability ?? true, [Validators.required]],
      description: [this.decodeDescription(pillar?.description), Validators.required],
      imageFile: [null],
      kpiLayerIds: [[] as number[]],
    });

    if (pillar?.pillarID) {
      this.loadPillarKpiMappings(pillar.pillarID);
    } else {
      this.filteredKpis = [...this.kpis];
    }
  }

  getSelectedKpiIds(): number[] {
    return this.normalizeKpiIds(this.pillarForm?.get('kpiLayerIds')?.value ?? []);
  }

  normalizeKpiIds(ids: Array<number | string | { layerID?: number | string }>): number[] {
    return ids.map((id) => {
        if (typeof id === 'number' || typeof id === 'string') {
          return Number(id);
        }

        if (id && typeof id === 'object' && 'layerID' in id) {
          return Number(id.layerID);
        }
        return Number.NaN;
      }).filter((id) => !Number.isNaN(id) && id > 0);
  }

  normalizeKpiSelectionInput(ids: Array<number | string | { layerID?: number | string }> | null | undefined,): number[] {
    if (!ids) {
      return [];
    }
    return this.normalizeKpiIds(ids);
  }

  setKpiLayerIds(ids: number[]) {
    const control = this.pillarForm.get('kpiLayerIds');
    control?.setValue(this.normalizeKpiIds(ids));
    control?.markAsDirty();
    control?.updateValueAndValidity();
  }
  
  getLockedKpiLayerIds(): number[] {
    return this.hasLockedKpis ? [...this.initialKpiLayerIds] : [];
  }

  syncKpiControlValue() {
    const currentIds = this.getSelectedKpiIds();
    if (currentIds.length > 0) {
      this.setKpiLayerIds(currentIds);
    }
  }

  resetFileState() {
    this.isSubmitted = false;
    this.imageFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedImage = null;
  }

  decodeDescription(text?: string): string {
    if (!text) {
      return '';
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value.replace(/\u00a0/g, ' ');
  }

  onEditorCreated(quill: any) {
    const html = this.pillarForm?.get('description')?.value ?? '';
    if (html) {
      quill.clipboard.dangerouslyPasteHTML(html);
    }
  }

  loadPillarKpiMappings(pillarId: number) {
    this.isLoadingMappings = true;
    this.adminService.getPillarKpiMappings(pillarId).subscribe({
      next: (res) => {
        if (res.succeeded) {
          const layerIds = (res.result ?? []).map((m) => Number(m.layerID));
          this.initialKpiLayerIds = this.normalizeKpiIds(layerIds);
          this.filteredKpis = (this.kpis ?? []).filter((kpi) => !this.initialKpiLayerIds.includes(Number(kpi.layerID)));
        } else {
          this.initialKpiLayerIds = [];
          this.clearKpiDetails();
        }
        this.isLoadingMappings = false;
      },
      error: () => {
        this.initialKpiLayerIds = [];
        this.pillarForm.get('kpiLayerIds')?.setValue([]);
        this.setKpiLayerIds([]);
        this.clearKpiDetails();
        this.isLoadingMappings = false;
      },
    });
  }
  
  loadKpiPillarDetails(layerIds: number[]) {
    const uniqueLayerIds = Array.from(new Set(this.normalizeKpiIds(layerIds)))
      .filter((layerID) => !this.kpiPillarDetails[layerID]);

    if (!uniqueLayerIds.length) {
      return;
    }

    this.isLoadingKpiDetails = true;
    forkJoin(
      uniqueLayerIds.map((layerID) =>
        this.adminService.getKPIDetailsByLayerID(layerID).pipe(
          map((res) => ({
            layerID,
            pillars: res.succeeded ? res.result ?? [] : [],
          })),
          catchError(() => of({ layerID, pillars: [] as AnalyticalLayerPillarMappingDTO[] })),
        ),
      ),
    ).subscribe({
      next: (results) => {
        results.forEach(({ layerID, pillars }) => {
          this.kpiPillarDetails[layerID] = pillars;
          this.replacementPillarsByCategoryCache[layerID] =
            this.getReplacementPillarsByCategory(layerID, pillars);
        });
        this.isLoadingKpiDetails = false;
      },
      error: () => {
        this.isLoadingKpiDetails = false;
      },
    });
  }

  trackByPillarId(_: number, item: AnalyticalLayerPillarMappingDTO) {
    return item.pillarID;
  }

  trackByCategoryKey(_: number, item: { key: string }) {
    return item.key;
  }

  clearKpiDetails() {
    this.kpiPillarDetails = {};
    this.selectedPillarByKpi = {};
    this.replacementPillarsByCategoryCache = {};
  }

  customSearchFn(term: string, item: AnalyticalLayerResponseDto) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }

  onKpiSelectionChange(selectedValues?: Array<number | string | { layerID?: number | string }> | null) {
    const currentIds = this.normalizeKpiSelectionInput(selectedValues);
    this.replacementValidationMessage = '';
    this.setKpiLayerIds(currentIds);

    // Clean up removed KPIs from cached details and selections
    const currentIdSet = new Set(currentIds);
    Object.keys(this.kpiPillarDetails).forEach((key) => {
      const layerId = Number(key);
      if (!currentIdSet.has(layerId)) {
        delete this.kpiPillarDetails[layerId];
        delete this.selectedPillarByKpi[layerId];
        delete this.replacementPillarsByCategoryCache[layerId];
      }
    });

    // Only load details for newly added KPIs that haven't been fetched yet
    const idsToFetch = currentIds.filter((id) => !this.kpiPillarDetails[id]);
    if (idsToFetch.length > 0) {
      this.loadKpiPillarDetails(idsToFetch);
    }
  }

  getReplacementPillars(layerID: number, source?: AnalyticalLayerPillarMappingDTO[]): AnalyticalLayerPillarMappingDTO[] {
    const currentPillarId = Number(this.pillar?.pillarID ?? 0);
    const pillars = source ?? this.kpiPillarDetails[Number(layerID)] ?? [];

    if (!currentPillarId) {
      return pillars;
    }

    return pillars.filter((pillar) => Number(pillar.pillarID) !== currentPillarId);
  }

  getReplacementPillarsByCategory(layerID: number, source?: AnalyticalLayerPillarMappingDTO[]): Array<{
    key: string;
    label: string;
    categoryNumber: number | null;
    pillars: AnalyticalLayerPillarMappingDTO[];
  }> {
    const options = this.getReplacementPillars(layerID, source);

    const rankCategory = (value: number | null): number => {
      if (value === 1) {
        return 0;
      }

      if (value === 2) {
        return 1;
      }

      return value === null ? Number.MAX_SAFE_INTEGER : 10 + value;
    };

    const grouped = new Map<string, {
      key: string;
      label: string;
      categoryNumber: number | null;
      sortRank: number;
      pillars: AnalyticalLayerPillarMappingDTO[];
    }>();

    for (const pillar of options) {
      const categoryNumber = pillar.categoryNumber ?? null;
      const key = categoryNumber !== null ? `cat-${categoryNumber}` : 'cat-unknown';
      const existingGroup = grouped.get(key);

      if (existingGroup) {
        existingGroup.pillars.push(pillar);
        continue;
      }

      grouped.set(key, {
        key,
        label: categoryNumber !== null ? `Category ${categoryNumber}` : 'Category Unspecified',
        categoryNumber,
        sortRank: rankCategory(categoryNumber),
        pillars: [pillar],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const rankDiff = a.sortRank - b.sortRank;
      if (rankDiff !== 0) {
        return rankDiff;
      }

      if (a.categoryNumber === null && b.categoryNumber === null) {
        return a.label.localeCompare(b.label);
      }

      if (a.categoryNumber === null || b.categoryNumber === null) {
        return 0;
      }

      return a.categoryNumber - b.categoryNumber;
    }).map(({ sortRank, ...group }) => group);
  }

  getMissingReplacementKpiIds(): number[] {

    return this.addedKpiLayerIds.filter((layerID) => {
      const options = this.getReplacementPillars(layerID);
      if (!options.length) {
        return true;
      }

      const selectedPillarId = this.getSelectedPillarId(layerID);
      return !selectedPillarId || !options.some((pillar) => Number(pillar.pillarID) === Number(selectedPillarId));
    });
  }

  getSelectedPillarId(layerID: number): number | null {

    return this.selectedPillarByKpi[Number(layerID)] ?? null;
  }

  getSelectedCategoryNumber(layerID: number): number | null {
    const selectedPillarId = this.getSelectedPillarId(layerID);
    if (!selectedPillarId) {
      return null;
    }
    const pillars = this.kpiPillarDetails[Number(layerID)] ?? [];
    const matchedPillar = pillars.find(
      (pillar) => Number(pillar.pillarID) === Number(selectedPillarId),
    );
    return matchedPillar?.categoryNumber ?? null;
  }


  selectPillarForKpi(layerID: number, pillarID: number) {

    this.selectedPillarByKpi[Number(layerID)] = Number(pillarID);
  }

  trackByLayerId(_: number, item: { kpi: AnalyticalLayerResponseDto }) {
    return item.kpi.layerID;

  }

  clearAllKpis() {
    this.replacementValidationMessage = '';
    this.pillarForm.get('kpiLayerIds')?.setValue([]);
    this.setKpiLayerIds([]);
    this.clearKpiDetails();
  }

  onSubmit() {
    this.isSubmitted = true;
    const missingReplacementKpiIds = this.getMissingReplacementKpiIds();
    if (missingReplacementKpiIds.length > 0) {
      this.replacementValidationMessage = 'Please select replacement pillar for every newly selected KPI.';
      return;
    }
    
    if (this.pillarForm.valid) {
      const addedKpiLayerIds = this.addedKpiLayerIds;
      const currentPillarId = Number(this.pillar?.pillarID ?? 0);
      const kpiUpdates = addedKpiLayerIds.map((layerID) => ({
        layerID,
        replacedPillarID: Number(this.getSelectedPillarId(layerID)), // old value being replaced
        newPillarID: currentPillarId, 
        categoryNumber: Number(this.getSelectedCategoryNumber(layerID)), // new value taking its place
      }));
      
      const pillarData: PillarsVM = {
        ...this.pillarForm.value,
        pillarID: this.pillar?.pillarID ?? 0,
        displayOrder: Number(this.pillarForm.value.displayOrder),
        pillarCode: (this.pillarForm.value.pillarCode ?? '').trim(),
        kpiLayerIds: this.getSelectedKpiIds(),
        addedKpiLayerIds,
        replacementPillarByKpi: kpiUpdates.map(({ layerID, replacedPillarID }) => ({
          layerID,
          replacePillarID: replacedPillarID,
        })),
        kpiUpdates,
      };
    
      if (this.imageFile) {
        pillarData.imageFile = this.imageFile;
      }
      this.pillarChange.emit(pillarData);
      this.isSubmitted = false;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image file.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
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

    this.pillarForm.patchValue({ image: file });
  }
}
