import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Link2, Loader2, FileText, Image, File, Clipboard, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { isAllowedFile, getFileType, compressImage, getAllowedExtensionsString } from "@/lib/fileUtils";

export default function UploadDialog({ open, onOpenChange, onSave, editingEvidence, evidenceName, competencyIndex }) {
  const [activeTab, setActiveTab] = useState(editingEvidence?.file_type === 'link' ? 'link' : 'file');
  const [linkUrl, setLinkUrl] = useState(editingEvidence?.link_url || '');
  const [notes, setNotes] = useState(editingEvidence?.notes || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedPreview, setPastedPreview] = useState(null); // base64 preview for pasted images
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Listen for paste events anywhere in the dialog
  const handlePaste = useCallback((e) => {
    if (!open) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        // Give it a proper name with timestamp
        const ext = item.type.split('/')[1] || 'png';
        const namedFile = new File([file], `clipboard-${Date.now()}.${ext}`, { type: item.type });
        setSelectedFile(namedFile);
        setPastedPreview(URL.createObjectURL(namedFile));
        setActiveTab('file');
        toast.success('تم لصق الصورة من الحافظة ✓');
        break;
      }
    }
  }, [open]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => { if (pastedPreview) URL.revokeObjectURL(pastedPreview); };
  }, [pastedPreview]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isAllowedFile(file.name)) {
      toast.error('نوع الملف غير مسموح. الأنواع المسموحة: ' + getAllowedExtensionsString());
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    setPastedPreview(null);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPastedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              {/* Paste hint banner */}
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                <Clipboard className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">
                  انسخ أي صورة ثم اضغط <kbd className="bg-primary/10 rounded px-1 font-mono">Ctrl+V</kbd> لإدراجها مباشرة
                </p>
              </div>

              {/* Drop / click zone */}
              <div
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl text-center transition-all ${
                  selectedFile
                    ? 'border-primary/50 bg-accent/20 p-3 cursor-default'
                    : 'border-primary/30 p-8 cursor-pointer hover:border-primary/60 hover:bg-accent/30'
                }`}
              >
                {selectedFile ? (
                  <div className="relative">
                    {pastedPreview ? (
                      // Image preview for pasted/selected images
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={pastedPreview}
                          alt="معاينة"
                          className="max-h-40 max-w-full rounded-lg object-contain mx-auto shadow"
                        />
                        <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {fileTypeIcon}
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                    {/* Clear button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSelectedFile(); }}
                      className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:opacity-80"
                    >
                      <X className="w-3 h-3" />
                    </button>
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