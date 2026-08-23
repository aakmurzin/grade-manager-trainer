import type { CompanyType } from '@/game/decisionLog/types';

/** Stable base per company type — isolated and unified batches share the same range. */
export const COMPANY_SEED_BASE: Record<CompanyType, number> = {
  design_agency: 10_000,
  product_studio: 20_000,
  it_outsourcing: 30_000,
  marketing_agency: 40_000,
};

/** 1-based index within company type (1..n). */
export function sessionSeedFor(companyType: CompanyType, indexWithinType: number): number {
  return COMPANY_SEED_BASE[companyType] + indexWithinType;
}
