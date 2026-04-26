import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Link2, Loader2, FileText, Image, File } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { isAllowedFile, getFileType, compressImage, getAllowedExtensionsString } from "@/lib/fileUtils";

export default function UploadDialog({ open, onOpenChange, onSave, editingEvidence, evidenceName, competencyIndex }) {
  const [activeTab, setActiveTab] = useState(editingEvidence?.file_type === 'link' ? 'link' : 'file');
  const [linkUrl, setLinkUrl] = useState(editingEvidence?.link_url || '');
  const [notes, setNotes] = useState(editingEvidence?.notes || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isAllowedFile(file.name)) {
      toast.error('نوع الملف غير مسموح. الأنواع المسموحة: ' + getAllowedExtensionsString());
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleSave = async () => {
    setIsUploading(true);

    const data = {
      competency_index: competencyIndex,
      evidence_name: evidenceName,
      notes,
    };

    if (activeTab === 'link') {
      if (!linkUrl.trim()) {
        toast.error('يرجى إدخال الرابط');
        setIsUploading(false);
        return;
      }
      data.file_type = 'link';
      data.link_url = linkUrl;
      data.file_url = '';
      data.original_filename = '';
    } else {
      if (!selectedFile && !editingEvidence?.file_url) {
        toast.error('يرجى اختيار ملف');
        setIsUploading(false);
        return;
      }

      if (selectedFile) {
        let fileToUpload = selectedFile;
        const fileType = getFileType(selectedFile.name);

        if (fileType === 'image') {
          fileToUpload = await compressImage(selectedFile);
        }

        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
        data.file_url = file_url;
        data.file_type = fileType;
        data.original_filename = selectedFile.name;
      } else {
        data.file_url = editingEvidence.file_url;
        data.file_type = editingEvidence.file_type;
        data.original_filename = editingEvidence.original_filename;
      }
    }

    await onSave(data);
    setIsUploading(false);
    onOpenChange(false);
  };

  const fileTypeIcon = selectedFile ? (
    getFileType(selectedFile.name) === 'image' ? <Image className="w-5 h-5" /> :
    getFileType(selectedFile.name) === 'pdf' ? <FileText className="w-5 h-5" /> :
    <File className="w-5 h-5" />
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {editingEvidence ? 'تعديل الشاهد' : 'رفع شاهد جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-sm font-medium text-accent-foreground">{evidenceName}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="file" className="flex-1 gap-2">
                <Upload className="w-4 h-4" />
                رفع ملف
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1 gap-2">
                <Link2 className="w-4 h-4" />
                رابط
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-3 mt-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-all"
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    {fileTypeIcon}
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm">اضغط لاختيار ملف</p>
                    <p className="text-xs">PDF, Word, صور</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                onChange={handleFileSelect}
              />
              {editingEvidence?.original_filename && !selectedFile && (
                <p className="text-xs text-muted-foreground">
                  الملف الحالي: {editingEvidence.original_filename}
                </p>
              )}
            </TabsContent>

            <TabsContent value="link" className="space-y-3 mt-4">
              <div>
                <Label>الرابط</Label>
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              placeholder="أضف ملاحظة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-20"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isUploading} className="gap-2">
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingEvidence ? 'حفظ التعديلات' : 'رفع الشاهد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}