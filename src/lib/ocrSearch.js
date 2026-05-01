import { base44 } from '@/api/base44Client';

/**
 * Performs OCR-based content search on PDF and image evidence records.
 * Uses InvokeLLM with file_urls to read Arabic text from documents.
 *
 * Returns array of { record, excerpt } for matches.
 */
export async function ocrSearchInFiles(records, query) {
  // Only process PDF and image records that have a file_url
  const candidates = records.filter(
    (r) => (r.file_type === 'pdf' || r.file_type === 'image') && r.file_url
  );

  if (candidates.length === 0) return [];

  // Process in parallel batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (record) => {
      const prompt = `أنت محرك بحث متخصص في قراءة الوثائق العربية.
المهمة: ابحث في الملف المرفق عن الكلمة أو العبارة التالية: "${query}"

التعليمات:
1. اقرأ المحتوى الكامل للملف (PDF أو صورة) باستخدام OCR للغة العربية.
2. إذا وجدت الكلمة/العبارة، أعد:
   - found: true
   - excerpt: مقتطف نصي قصير (أقل من 100 حرف) يحتوي على العبارة في سياقها
3. إذا لم تجد، أعد: found: false

لا تُضف أي تعليق إضافي.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [record.file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            excerpt: { type: 'string' },
          },
          required: ['found'],
        },
      });

      if (response?.found) {
        return { record, excerpt: response.excerpt || '' };
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((r) => { if (r) results.push(r); });
  }

  return results;
}