export type ViewMode = 'experimental' | 'predicted' | 'overlay';
export interface CoordinateAsset { url:string; format:'mmcif'; compression:'gzip'; compressed_bytes:number; uncompressed_bytes:number; compressed_sha256:string; uncompressed_sha256:string; }
export interface TargetRecord {
  record_id:string; display_name:string; status:'final_panel'|'qualified_not_selected'|'rejected_accuracy'; selection_rank:number|null; selection_reason:string;
  pdb_id:string; auth_chain:string; title:string; origin:'natural'|'designed'; initial_release_date:string; full_length:number; observed_residue_count:number; sequence_sha256:string; observed_label_seq_ids:number[];
  experimental:{coordinate:CoordinateAsset; label_asym_id:string; auth_asym_id:string; entity_id:string};
  predicted:{coordinate:CoordinateAsset; label_asym_id:string; auth_asym_id:string; entity_id:string; source_unaligned_sha256:string};
  alignment:{available:boolean; direction:string; convention:string; rotation:number[]; translation:number[]; method:string; observed_ca_rmsd_angstrom:number};
  qualification:{post_cutoff:boolean; pdb_cutoff:string; max_detected_pre_cutoff_query_tm:number; closest_reference_chain:string; reference_scope:string; measured_tm_score:number; measured_ca_lddt:number; model_ptm_confidence:number; model_mean_plddt_confidence:number; accuracy_gate:string; accurate:boolean};
  provenance:Record<string,unknown>;
}
export interface SiteManifest {schema_version:string; record_count:number; default_record_id:string; default_view:ViewMode; title:string; generated_at:string; records:TargetRecord[]; methodology:string; limitations:string[]; visual_semantics:{canvas:string;experimental:string;predicted:string;experimental_opacity:number;predicted_opacity:number}; production_results:{status:string;attempts_expected:number;cells_expected:number;metrics:string[];summary?:string;methods?:string;figures?:{title:string;png:string;pdf:string;caption:string}[];downloads?:{label:string;url:string}[]}; provenance:Record<string,unknown>;}
export interface SceneAudit {representation:'cartoon'; secondaryStructure:'dssp'|'zhang-skolnick'|'mixed'|'none'; structuredResidueCount:number; representationCount:number;}
