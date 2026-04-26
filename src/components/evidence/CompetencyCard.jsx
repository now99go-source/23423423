import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import EvidenceItem from "./EvidenceItem";

export default function CompetencyCard({ competency, evidenceRecords, onEdit, onDelete, onAddAnother }) {
  const uploadedNames = new Set(evidenceRecords.map(e => e.evidence_name));
  const totalRequired = competency.evidences.length;
  const uploadedCount = competency.evidences.filter(name => uploadedNames.has(name)).length;
  const isComplete = uploadedCount === totalRequired;

  return (
    <AccordionItem value={`comp-${competency.index}`} className="border rounded-xl mb-3 overflow-hidden bg-card shadow-sm">
      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-accent/30 transition-colors [&[data-state=open]]:bg-accent/20">
        <div className="flex items-center gap-4 w-full text-right">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
            isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {competency.index}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-relaxed text-right">
              {competency.title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/40" />
            )}
            <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
              {uploadedCount}/{totalRequired}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-4">
        <div className="space-y-2 pt-2">
          {competency.evidences.map((evidenceName) => {
            const matchingRecords = evidenceRecords.filter(r => r.evidence_name === evidenceName);
            
            if (matchingRecords.length === 0) {
              return (
                <EvidenceItem
                  key={evidenceName}
                  evidence={{ evidence_name: evidenceName }}
                  isUploaded={false}
                  onAddAnother={onAddAnother}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              );
            }

            return matchingRecords.map((record) => (
              <EvidenceItem
                key={record.id}
                evidence={record}
                isUploaded={true}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddAnother={onAddAnother}
              />
            ));
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}