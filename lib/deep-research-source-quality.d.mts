export type ResearchSourceType = "primary" | "secondary" | "tertiary";
export type ResearchSourceStance = "supports" | "contradicts" | "contextualizes" | "neutral";
export interface ResearchSourceRecord {
  source_id: string;
  title: string;
  url: string;
  publisher: string;
  /** Curated stable publisher identity; same publisher must share one key. */
  publisher_key: string;
  source_type: ResearchSourceType;
  published_at: string | null;
  retrieved_at: string;
  claim_ids: string[];
  stance: ResearchSourceStance;
  limitations?: string[];
}
export interface ClaimEvidenceAssessment {
  claim_id: string;
  status: "insufficient" | "counter-evidence-only" | "single-source" | "corroborated" | "contested";
  related_source_count: number;
  supporting_source_ids: string[];
  contradicting_source_ids: string[];
  contextualizing_source_ids: string[];
  independent_supporting_publishers: number;
  independent_contradicting_publishers: number;
  self_conflicted_publishers: string[];
  counter_evidence_required: boolean;
}
export function validateResearchSourceRecord(input: ResearchSourceRecord): ResearchSourceRecord & { limitations: string[] };
export function assessClaimEvidence(claimId: string, sourceRecords: ResearchSourceRecord[]): ClaimEvidenceAssessment;
