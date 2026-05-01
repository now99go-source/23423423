import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Accordion } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, LayoutList, Search } from "lucide-react";
import { toast } from "sonner";
import { COMPETENCIES } from '@/lib/competenciesData';
import { searchEvidenceRecords, scoreResult } from '@/lib/searchUtils';
import { ocrSearchInFiles } from '@/lib/ocrSearch';
import StatsHeader from '@/components/evidence/StatsHeader';
import CompetencyCard from '@/components/evidence/CompetencyCard';
import UploadDialog from '@/components/evidence/UploadDialog';
import DeleteConfirmDialog from '@/components/evidence/DeleteConfirmDialog';
import PDFGenerator from '@/components/evidence/PDFGenerator';
import SearchBar from '@/components/search/SearchBar';
import SearchResults from '@/components/search/SearchResults';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [isOCRSearching, setIsOCRSearching] = useState(false);
  const [ocrSearchDone, setOcrSearchDone] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [activeEvidenceName, setActiveEvidenceName] = useState('');
  const [activeCompetencyIndex, setActiveCompetencyIndex] = useState(null);

  const queryClient = useQueryClient();

  const { data: evidenceRecords = [], isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Evidence.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evidence'] }); toast.success('تم رفع الشاهد بنجاح'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Evidence.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evidence'] }); toast.success('تم تحديث الشاهد بنجاح'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evidence.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evidence'] }); toast.success('تم حذف الشاهد بنجاح'); },
  });

  // Live search results (instant, metadata-based)
  const metadataResults = useMemo(() => {
    if (!searchQuery.trim() && selectedTypes.length === 0) return [];
    const raw = searchEvidenceRecords(evidenceRecords, searchQuery, selectedTypes);
    return [...raw].sort((a, b) => scoreResult(b, searchQuery) - scoreResult(a, searchQuery));
  }, [evidenceRecords, searchQuery, selectedTypes]);

  // Switch to search tab automatically when typing
  const handleQueryChange = useCallback((q) => {
    setSearchQuery(q);
    setOcrResults([]);
    setOcrSearchDone(false);
    if (q.trim()) setActiveTab('search');
  }, []);

  const handleOCRSearch = useCallback(async (query) => {
    if (!query.trim()) { toast.error('أدخل كلمة للبحث أولاً'); return; }
    setIsOCRSearching(true);
    setOcrResults([]);
    setOcrSearchDone(false);
    setActiveTab('search');

    // Exclude records already found in metadata search
    const metadataIds = new Set(metadataResults.map((r) => r.id));
    const remaining = evidenceRecords.filter((r) => !metadataIds.has(r.id));

    const results = await ocrSearchInFiles(remaining, query);
    setOcrResults(results);
    setOcrSearchDone(true);
    setIsOCRSearching(false);

    if (results.length > 0) {
      toast.success(`تم العثور على ${results.length} نتيجة داخل الملفات`);
    } else {
      toast.info('لم يُعثر على تطابق في محتوى الملفات');
    }
  }, [evidenceRecords, metadataResults]);

  const handleEdit = useCallback((evidence) => {
    setSelectedEvidence(evidence);
    setActiveEvidenceName(evidence.evidence_name);
    setActiveCompetencyIndex(evidence.competency_index);
    setUploadOpen(true);
  }, []);

  const handleDelete = useCallback((evidence) => {
    setSelectedEvidence(evidence);
    setDeleteOpen(true);
  }, []);

  const handleAddAnother = useCallback((evidenceName, competencyIndex) => {
    setSelectedEvidence(null);
    setActiveEvidenceName(evidenceName);
    setActiveCompetencyIndex(competencyIndex);
    setUploadOpen(true);
  }, []);

  const handleSave = async (data) => {
    if (selectedEvidence) {
      await updateMutation.mutateAsync({ id: selectedEvidence.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedEvidence) {
      await deleteMutation.mutateAsync(selectedEvidence.id);
      setDeleteOpen(false);
      setSelectedEvidence(null);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold leading-tight">سجل شواهد أداء مدير المدرسة</h1>
                <p className="text-xs opacity-75">مدرسة الموهوبين التقنية الثانوية للبنين — 1447هـ</p>
              </div>
            </div>
            <PDFGenerator evidenceRecords={evidenceRecords} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:px-6 space-y-5">
        {/* Stats */}
        <StatsHeader evidenceRecords={evidenceRecords} />

        {/* Search Bar — always visible */}
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <SearchBar
            query={searchQuery}
            onQueryChange={handleQueryChange}
            onOCRSearch={handleOCRSearch}
            isOCRSearching={isOCRSearching}
            selectedTypes={selectedTypes}
            onTypesChange={(types) => { setSelectedTypes(types); if (types.length > 0) setActiveTab('search'); }}
          />
        </div>

        {/* Tabs: Browse / Search */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="browse" className="gap-2 flex-1 sm:flex-none">
              <LayoutList className="w-4 h-4" />
              استعراض الجدارات
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2 flex-1 sm:flex-none">
              <Search className="w-4 h-4" />
              نتائج البحث
              {(metadataResults.length + ocrResults.length) > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {metadataResults.length + ocrResults.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="mt-4">
            <Accordion type="multiple" className="space-y-0">
              {COMPETENCIES.map((competency) => (
                <CompetencyCard
                  key={competency.index}
                  competency={competency}
                  evidenceRecords={evidenceRecords.filter((r) => r.competency_index === competency.index)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddAnother={(name) => handleAddAnother(name, competency.index)}
                />
              ))}
            </Accordion>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-4">
            <SearchResults
              results={metadataResults}
              ocrResults={ocrResults}
              query={searchQuery}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isOCRSearching={isOCRSearching}
              ocrSearchDone={ocrSearchDone}
            />
            {!searchQuery && selectedTypes.length === 0 && !isOCRSearching && (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">ابدأ بالبحث من الحقل أعلاه</p>
                <p className="text-xs mt-1">يمكنك البحث بالاسم أو نوع الملف أو استخدام OCR للبحث في المحتوى</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      {uploadOpen && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSave={handleSave}
          editingEvidence={selectedEvidence}
          evidenceName={activeEvidenceName}
          competencyIndex={activeCompetencyIndex}
        />
      )}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        evidenceName={selectedEvidence?.evidence_name || ''}
      />
    </div>
  );
}