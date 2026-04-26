import React from 'react';
import { COMPETENCIES } from '@/lib/competenciesData';
import { Award, CheckCircle2, FileText, Target } from 'lucide-react';

export default function StatsHeader({ evidenceRecords }) {
  const totalRequired = COMPETENCIES.reduce((sum, c) => sum + c.evidences.length, 0);
  
  const uploadedEvidenceNames = new Set();
  evidenceRecords.forEach(r => {
    uploadedEvidenceNames.add(`${r.competency_index}-${r.evidence_name}`);
  });
  const uploadedCount = uploadedEvidenceNames.size;

  const completedCompetencies = COMPETENCIES.filter(c => {
    const names = new Set(
      evidenceRecords
        .filter(r => r.competency_index === c.index)
        .map(r => r.evidence_name)
    );
    return c.evidences.every(e => names.has(e));
  }).length;

  const percentage = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;

  const stats = [
    { label: 'إجمالي الجدارات', value: COMPETENCIES.length, icon: Target, color: 'text-primary' },
    { label: 'جدارات مكتملة', value: completedCompetencies, icon: CheckCircle2, color: 'text-primary' },
    { label: 'شواهد مرفوعة', value: evidenceRecords.length, icon: FileText, color: 'text-secondary' },
    { label: 'نسبة الإنجاز', value: `${percentage}%`, icon: Award, color: 'text-secondary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-accent flex items-center justify-center ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}