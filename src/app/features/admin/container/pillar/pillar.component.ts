import { Component, OnDestroy, OnInit } from "@angular/core";
import { AdminService } from "../../admin.service";
import { ToasterService } from "src/app/core/services/toaster.service";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { AnalyticalLayerResponseDto } from "src/app/core/models/GetAnalyticalLayerResultDto";
import { environment } from "src/environments/environment";
declare var bootstrap: any;

@Component({
  selector: "app-pillar",
  templateUrl: "./pillar.component.html",
  styleUrl: "./pillar.component.css",
})
export class PillarComponent implements OnInit, OnDestroy {
  pillars: PillarsVM[] = [];
  selectedPillar: PillarsVM | null = null;
  kpis: AnalyticalLayerResponseDto[] = [];
  loading: boolean = false;
  isLoader: boolean = false;
  isOpendialog: boolean = false;
  urlBase = environment.apiUrl;
  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
  ) {}

  ngOnInit(): void {
    this.GetAllPillars();
    this.GetAllKpi();
  }

  GetAllKpi() {
    this.adminService.GetAllKpi().subscribe((res) => {
      if (res.succeeded) {
        this.kpis = res.result ?? [];
      }
    });
  }

  GetAllPillars() {
    this.pillars = [];
    this.isLoader = true;
    this.adminService.getAllPillars().subscribe((pillars) => {
      this.pillars = pillars.map((p) => ({
        ...p,
        expand: false,
        showToggle: this.isLongText(p.description),
      }));
      this.isLoader = false;
    });
  }

  isLongText(html: string): boolean {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const text = temp.innerText || temp.textContent || "";
    return text.split(/\s+/).length > 40;
  }

  addUpdatePillar(piller: PillarsVM | any) {
    if (!piller) {
      return;
    }

    if (!piller.pillarName || piller.pillarName.trim().length < 5) {
      this.toaster.showError("Domain name must be at least 5 characters");
      return;
    }

    const formData = new FormData();
    formData.append("pillarName", piller.pillarName);
    formData.append("pillarCode", piller.pillarCode ?? "");
    formData.append("displayOrder", (piller.displayOrder ?? 0).toString());
    formData.append("weight", piller.weight.toString());
    formData.append("reliability", piller.reliability.toString());
    formData.append("description", piller.description);
    formData.append("kpiUpdates", JSON.stringify(piller.kpiUpdates ?? []));

    if (piller.imageFile) {
      formData.append("imageFile", piller.imageFile, piller.imageFile.name);
    }

    const isAdd = !piller.pillarID || piller.pillarID === 0;

    if (isAdd) {
      this.loading = true;
      this.adminService.addPillar(formData).subscribe({
        next: (res) => {
          this.closeModal();
          if (res.succeeded) {
            this.toaster.showSuccess(
              res.messages?.join(", ") || "Domain created successfully",
            );
            this.GetAllPillars();
          } else {
            this.toaster.showError(res.errors?.join(", ") || "Failed to create Domain");
          }
        },
        error: () => {
          this.loading = false;
          this.toaster.showError("Failed to create domain");
        },
      });
      return;
    }

    if (!this.selectedPillar) {
      this.toaster.showWarning("No selected pillar");
      return;
    }

    this.loading = true;
    this.adminService
      .editAllPillars(this.selectedPillar.pillarID, formData)
      .subscribe({
        next: () => {
          this.closeModal();
          this.toaster.showSuccess("Domain updated successfully");
          this.GetAllPillars();
        },
        error: () => {
          this.loading = false;
          this.toaster.showError("Failed to update domain");
        },
      });
  }

  get nextDisplayOrder(): number {
    if (!this.pillars.length) {
      return 1;
    }
    return Math.max(...this.pillars.map((p) => p.displayOrder ?? 0)) + 1;
  }

  addPillar() {
    this.selectedPillar = null;
    this.openDialog();
  }

  editPillar(piller: PillarsVM, isOpen: boolean = true) {
    this.selectedPillar = piller;
    if (isOpen) {
      this.openDialog();
    }
  }

  deletePillar() {
    if (this.selectedPillar === null) {
      this.toaster.showError("No domain selected for deletion");
      return;
    }
    this.adminService.deletePillar(this.selectedPillar.pillarID).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.GetAllPillars();
          this.toaster.showSuccess(res?.messages?.join(", ") || "Domain deleted successfully");
        } else {
          this.toaster.showError(res?.errors?.join(", ") || "Failed to delete domain");
        }
      },
      error: () => {
        this.toaster.showError("Failed to delete domain");
      },
    });
  }

  openDialog() {
    this.isOpendialog = true;
    setTimeout(() => {
      const modalEl = document.getElementById("exampleModal");
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
      }
    }, 100);
  }

  ngOnDestroy(): void {}

  closeModal() {
    this.loading = false;
    const modalEl = document.getElementById("exampleModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance?.hide();
    this.isOpendialog = false;
    setTimeout(() => {
      this.selectedPillar = null;
    }, 100);
  }

  decodeHtml(text: string): string {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value.replace(/\u00a0/g, " ");
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src =
      "assets/images/noImageAvailable.png";
  }
}
