import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Accordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { COMPETENCIES } from '@/lib/competenciesData';
import StatsHeader from '@/components/evidence/StatsHeader';
import CompetencyCard from '@/components/evidence/CompetencyCard';
import UploadDialog from '@/components/evidence/UploadDialog';
import DeleteConfirmDialog from '@/components/evidence/DeleteConfirmDialog';
import PDFGenerator from '@/components/evidence/PDFGenerator';

export default function Dashboard() {
  const [search, setSearch] = useState('');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('تم رفع الشاهد بنجاح');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Evidence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('تم تحديث الشاهد بنجاح');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('تم حذف الشاهد بنجاح');
    },
  });

  const handleEdit = (evidence) => {
    setSelectedEvidence(evidence);
    setActiveEvidenceName(evidence.evidence_name);
    setActiveCompetencyIndex(evidence.competency_index);
    setUploadOpen(true);
  };

  const handleDelete = (evidence) => {
    setSelectedEvidence(evidence);
    setDeleteOpen(true);
  };

  const handleAddAnother = (evidenceName, competencyIndex) => {
    setSelectedEvidence(null);
    setActiveEvidenceName(evidenceName);
    setActiveCompetencyIndex(competencyIndex);
    setUploadOpen(true);
  };

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

  const filteredCompetencies = COMPETENCIES.filter(c =>
    search === '' ||
    c.title.includes(search) ||
    c.evidences.some(e => e.includes(search))
  );

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
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">سجل شواهد أداء مدير المدرسة</h1>
                <p className="text-xs sm:text-sm opacity-80">مدرسة الموهوبين التقنية الثانوية للبنين — 1447هـ</p>
              </div>
            </div>
            <PDFGenerator evidenceRecords={evidenceRecords} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        <StatsHeader evidenceRecords={evidenceRecords} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في الجدارات أو الشواهد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-card"
          />
        </div>

        {/* Competencies */}
        <Accordion type="multiple" className="space-y-0">
          {filteredCompetencies.map((competency) => (
            <CompetencyCard
              key={competency.index}
              competency={competency}
              evidenceRecords={evidenceRecords.filter(r => r.competency_index === competency.index)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddAnother={(name) => handleAddAnother(name, competency.index)}
            />
          ))}
        </Accordion>
      </main>

      {/* Upload Dialog */}
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

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        evidenceName={selectedEvidence?.evidence_name || ''}
      />
    </div>
  );
}