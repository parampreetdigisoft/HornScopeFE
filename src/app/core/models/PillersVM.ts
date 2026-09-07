export interface PillarsVM {
  pillarID: number;
  pillarName: string;
  pillarCode?: string;
  description: string;
  displayOrder: number;
  imagePath?:string;
  weight: number;
  reliability: boolean;
  expand?: boolean;
  showToggle?: boolean;
  imageFile?: File | null;
  kpiLayerIds?: number[];
  addedKpiLayerIds?: number[];
  replacementPillarByKpi?: Array<{ layerID: number; replacePillarID: number }>;
  kpiUpdates?: Array<{
    layerID: number;
    replacedPillarID: number;
    newPillarID: number;
    categoryNumber: number;
  }>;
}