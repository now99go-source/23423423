import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, File, Link2, Pencil, Trash2, ExternalLink, Plus } from "lucide-react";
import { motion } from "framer-motion";

const typeConfig = {
  pdf: { icon: FileText, label: 'PDF', color: 'bg-red-100 text-red-700 border-red-200' },
  word: { icon: File, label: 'Word', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  image: { icon: Image, label: 'صورة', color: 'bg-green-100 text-green-700 border-green-200' },
  link: { icon: Link2, label: 'رابط', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function EvidenceItem({ evidence, onEdit, onDelete, onAddAnother, isUploaded }) {
  const config = isUploaded ? typeConfig[evidence.file_type] : null;
  const Icon = config?.icon;

  const handleOpen = () => {
    if (!isUploaded) return;
    if (evidence.file_type === 'link') {
      window.open(evidence.link_url, '_blank');
    } else if (evidence.file_url) {
      window.open(evidence.file_url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isUploaded
          ? 'bg-card border-primary/20 shadow-sm hover:shadow-md'
          : 'bg-muted/30 border-dashed border-muted-foreground/20'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isUploaded ? (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${!isUploaded ? 'text-muted-foreground' : ''}`}>
            {evidence.evidence_name}
          </p>
          {isUploaded && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${config.color}`}>
                {config.label}
              </Badge>
              {evidence.original_filename && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {evidence.original_filename}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 mr-2">
        {isUploaded ? (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpen}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(evidence)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(evidence)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onAddAnother(evidence.evidence_name)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onAddAnother(evidence.evidence_name)}
          >
            <Plus className="w-3.5 h-3.5" />
            رفع
          </Button>
        )}
      </div>
    </motion.div>
  );
}