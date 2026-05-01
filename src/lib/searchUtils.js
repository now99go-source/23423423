import { COMPETENCIES } from './competenciesData';

/**
 * Fast in-memory search across:
 * - evidence_name
 * - original_filename
 * - notes
 * - link_url
 * - competency title (via competency_index)
 * - file_type
 */
export function searchEvidenceRecords(records, query, selectedTypes) {
  const q = query.trim().toLowerCase();

  let filtered = records;

  // Filter by type first (O(n))
  if (selectedTypes.length > 0) {
    filtered = filtered.filter((r) => selectedTypes.includes(r.file_type));
  }

  if (!q) return filtered;

  const competencyMap = {};
  COMPETENCIES.forEach((c) => { competencyMap[c.index] = c.title; });

  return filtered.filter((record) => {
    const competencyTitle = competencyMap[record.competency_index] || '';
    const haystack = [
      record.evidence_name,
      record.original_filename,
      record.notes,
      record.link_url,
      competencyTitle,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

/**
 * Build a ranked search index score for ordering results
 */
export function scoreResult(record, query) {
  const q = query.toLowerCase();
  let score = 0;
  if (record.evidence_name?.toLowerCase().includes(q)) score += 10;
  if (record.original_filename?.toLowerCase().includes(q)) score += 6;
  if (record.notes?.toLowerCase().includes(q)) score += 3;
  if (record.link_url?.toLowerCase().includes(q)) score += 2;
  return score;
}