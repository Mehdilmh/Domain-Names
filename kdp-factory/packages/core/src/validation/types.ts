import type { CoverDesign } from '../cover/schema';
import type { CoverGeometry } from '../cover/geometry';
import type { CoverLayout } from '../cover/layout';
import type { LayoutResult } from '../interior/layout';
import type { MetadataDraft } from '../metadata';
import type { PdfInspection } from '../pdf/inspect';
import type { InteriorFingerprint } from '../similarity';
import type { BookFormat, SpecLibrary, VerificationStatus } from '../specs/types';

export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NEEDS_HUMAN_REVIEW' | 'NOT_APPLICABLE';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
export type ContentClass = 'LOW' | 'MEDIUM' | 'FULL';

export interface CheckResult {
  ruleId: string;
  ruleVersion: number;
  title: string;
  category: 'TECHNICAL' | 'CONTENT' | 'METADATA';
  severity: Severity;
  status: CheckStatus;
  evidence: string;
  suggestion: string;
  applicableFormats: (BookFormat | 'ALL')[];
  format: BookFormat;
  source: string;
  sourceVerification: VerificationStatus | 'INTERNAL_HEURISTIC';
  lastVerified: string;
  /** True only for explicitly defined technical failures that stop final export. */
  blocking: boolean;
  /** Human review decision recorded against this rule, if any. */
  review?: { decision: 'ACCEPTED_RISK' | 'RESOLVED' | 'REJECTED'; note: string; reviewer: string; at: string } | null;
}

export interface EpubInspection {
  ok: boolean;
  errors: string[];
  chapterCount: number;
  hasNav: boolean;
  hasCover: boolean;
  fileSizeBytes: number;
}

export interface PreflightContext {
  format: BookFormat;
  contentClass: ContentClass;
  category?: string;
  spec: SpecLibrary;
  interior?: { layout: LayoutResult; pdf?: PdfInspection };
  cover?: { design: CoverDesign; geometry: CoverGeometry; layout: CoverLayout; pdf?: PdfInspection; coverImagePx?: { widthPx: number; heightPx: number } };
  ebook?: { epub?: EpubInspection; text: string };
  metadata?: MetadataDraft;
  /** All interior text (for content checks). */
  interiorText?: string;
  portfolio?: { projectId: string; title: string; fingerprint?: InteriorFingerprint | null }[];
  fingerprint?: InteriorFingerprint;
  ai?: { textGenerated: boolean; imagesGenerated: boolean; disclosureAcknowledged: boolean };
  assets?: { assetId: string; source: 'UPLOAD' | 'AI' | 'SYSTEM'; licenseNote: string }[];
  reviews?: Record<string, NonNullable<CheckResult['review']>>;
}

export interface RuleOutcome {
  status: CheckStatus;
  evidence: string;
  suggestion?: string;
}

export interface RuleDefinition {
  id: string;
  version: number;
  title: string;
  description: string;
  category: CheckResult['category'];
  severity: Severity;
  appliesTo: (BookFormat | 'ALL')[];
  /** Blocking applies only when the outcome is FAIL. */
  blocking: boolean;
  source: string;
  sourceVerification: CheckResult['sourceVerification'];
  lastVerified: string;
  defaultSuggestion: string;
  check(ctx: PreflightContext): RuleOutcome;
}

export interface PreflightReport {
  rulesetVersion: string;
  specVersion: string;
  format: BookFormat;
  generatedAt: string;
  results: CheckResult[];
  summary: Record<CheckStatus, number>;
  blocked: boolean;
  blockingRuleIds: string[];
  disclaimer: string;
}

export const PREFLIGHT_DISCLAIMER =
  'This preflight reduces risk but is not a guarantee of KDP acceptance, sales, or policy compliance. KDP requirements change; verify against current KDP documentation and review all NEEDS HUMAN REVIEW items before publishing.';
