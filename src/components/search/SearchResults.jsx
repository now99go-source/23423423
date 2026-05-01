import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, File, Link2, ExternalLink, Pencil, Trash2, ScanSearch, CheckCircle2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COMPETENCIES } from '@/lib/competenciesData';

const typeConfig = {
  pdf: { icon: FileText, label: 'PDF', color: 'bg-red-100 text-red-700 border-red-200' },
  word: { icon: File, label: 'Word', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  image: { icon: Image, label: 'صورة', color: 'bg-green-100 text-green-700 border-green-200' },
  link: { icon: Link2, label: 'رابط', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

function highlightText(text, query) {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-secondary/60 text-foreground rounded px-0.5">{part}</mark>
      : part
  );
}

export default function SearchResults({
  results,
  ocrResults,
  query,
  onEdit,
  onDelete,
  isOCRSearching,
  ocrSearchDone,
}) {
  const totalCount = results.length + ocrResults.length;

  if (!query && results.length === 0) return null;

  const handleOpen = (record) => {
    const url = record.file_type === 'link' ? record.link_url : record.file_url;
    if (url) window.open(url, '_blank');
  };

  const getCompetencyTitle = (index) => {
    return COMPETENCIES.find((c) => c.index === index)?.title || '';
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {query ? (
            <>تم العثور على <span className="font-bold text-foreground">{totalCount}</span> نتيجة للبحث عن "<span className="font-medium text-primary">{query}</span>"</>
          ) : (
            'نتائج البحث'
          )}
        </p>
        {ocrResults.length > 0 && (
          <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
            <ScanSearch className="w-3 h-3" />
            {ocrResults.length} نتيجة OCR
          </Badge>
        )}
      </div>

      {/* Metadata Results (instant) */}
      <AnimatePresence>
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">نتائج البيانات الوصفية</p>
            {results.map((record, i) => {
              const config = typeConfig[record.file_type];
              const Icon = config?.icon || File;
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Evidence Name with highlight */}
                    <p className="text-sm font-semibold leading-tight">
                      {highlightText(record.evidence_name, query)}
                    </p>
                    {/* Competency context */}
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-primary/80">
                        {record.competency_index}.
                      </span>{' '}
                      {highlightText(getCompetencyTitle(record.competency_index), query)}
                    </p>
                    {/* File name */}
                    {record.original_filename && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📄 {highlightText(record.original_filename, query)}
                      </p>
                    )}
                    {/* Notes */}
                    {record.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                        {highlightText(record.notes, query)}
                      </p>
                    )}
                    {/* Type badge */}
                    <div className="mt-2">
                      <Badge variant="outline" className={`text-xs ${config?.color}`}>
                        {config?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(record)}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(record)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* OCR Results */}
      {isOCRSearching && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div>
            <p className="text-sm font-medium">جارٍ البحث بتقنية OCR العربية...</p>
            <p className="text-xs text-muted-foreground">يتم تحليل محتوى الملفات بالذكاء الاصطناعي</p>
          </div>
        </div>
      )}

      {ocrResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">نتائج OCR — محتوى الملفات</p>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
              <ScanSearch className="w-3 h-3" />
              ذكاء اصطناعي
            </Badge>
          </div>
          {ocrResults.map((result, i) => {
            const config = typeConfig[result.record.file_type];
            const Icon = config?.icon || File;
            return (
              <motion.div
                key={result.record.id + '-ocr'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ScanSearch className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{result.record.evidence_name}</p>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      تطابق في المحتوى
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-primary/80">{result.record.competency_index}.</span>{' '}
                    {getCompetencyTitle(result.record.competency_index)}
                  </p>
                  {result.record.original_filename && (
                    <p className="text-xs text-muted-foreground mt-0.5">📄 {result.record.original_filename}</p>
                  )}
                  {/* OCR Excerpt */}
                  {result.excerpt && (
                    <div className="mt-2 p-2 bg-background rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">مقتطف: </span>
                      {result.excerpt}
                    </div>
                  )}
                  <div className="mt-2">
                    <Badge variant="outline" className={`text-xs ${config?.color}`}>{config?.label}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    const url = result.record.file_type === 'link' ? result.record.link_url : result.record.file_url;
                    if (url) window.open(url, '_blank');
                  }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(result.record)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {query && totalCount === 0 && !isOCRSearching && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">لا توجد نتائج</p>
          <p className="text-xs mt-1">جرّب البحث OCR للبحث داخل محتوى الملفات</p>
        </div>
      )}

      {ocrSearchDone && ocrResults.length === 0 && !isOCRSearching && (
        <div className="p-3 rounded-xl bg-muted/50 border border-dashed text-center">
          <p className="text-xs text-muted-foreground">
            لم يُعثر على تطابق في محتوى الملفات المدعومة (PDF/صور)
          </p>
        </div>
      )}
    </div>
  );
}