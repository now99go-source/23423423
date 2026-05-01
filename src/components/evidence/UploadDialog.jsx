import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Link2, Loader2, FileText, Image, File, Clipboard, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { isAllowedFile, getFileType, compressImage, getAllowedExtensionsString } from "@/lib/fileUtils";

const TEN_MB = 10 * 1024 * 1024;

function fileIcon(file) {
  const t = getFileType(file.name);
  if (t === 'image') return <Image className="w-4 h-4 shrink-0" />;
  if (t === 'pdf') return <FileText className="w-4 h-4 shrink-0" />;
  return <File className="w-4 h-4 shrink-0" />;
}

export default function UploadDialog({ open, onOpenChange, onSave, editingEvidence, evidenceName, competencyIndex }) {
  const [activeTab, setActiveTab] = useState(editingEvidence?.file_type === 'link' ? 'link' : 'file');
  const [linkUrl, setLinkUrl] = useState(editingEvidence?.link_url || '');
  const [notes, setNotes] = useState(editingEvidence?.notes || '');

  // Multi-file queue: { file, preview (for images), status: 'pending'|'uploading'|'done'|'error', large: bool }
  const [fileQueue, setFileQueue] = useState([]);
  const [largePending, setLargePending] = useState(null); // file waiting confirmation
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // e.g. "2 / 5"
  const fileInputRef = useRef(null);

  // --- Paste from clipboard ---
  const handlePaste = useCallback((e) => {
    if (!open) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        const ext = item.type.split('/')[1] || 'png';
        const serial = String(Math.floor(Math.random() * 90000) + 10000);
        const baseName = (evidenceName || 'شاهد').replace(/\s+/g, '-').slice(0, 30);
        const namedFile = new window.File([file], `${baseName}-${serial}.${ext}`, { type: item.type });
        addFilesToQueue([namedFile]);
        setActiveTab('file');
        toast.success('تم لصق الصورة من الحافظة ✓');
        break;
      }
    }
  }, [open, evidenceName]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => fileQueue.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
  }, []);

  // --- Add files to queue (with large-file gate) ---
  const addFilesToQueue = (files) => {
    const toAdd = [];
    for (const file of files) {
      if (!isAllowedFile(file.name)) {
        toast.error(`${file.name}: نوع غير مسموح`);
        continue;
      }
      if (file.size > TEN_MB) {
        // queue them one by one via confirmation — store first, rest handled after
        setLargePending({ file, rest: files.filter(f => f !== file) });
        return; // pause and show confirmation dialog
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      toAdd.push({ file, preview, status: 'pending', large: false });
    }
    if (toAdd.length) setFileQueue(prev => [...prev, ...toAdd]);
  };

  const confirmLarge = () => {
    if (!largePending) return;
    const { file, rest } = largePending;
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setFileQueue(prev => [...prev, { file, preview, status: 'pending', large: true }]);
    setLargePending(null);
    if (rest.length) addFilesToQueue(rest);
  };

  const rejectLarge = () => {
    if (!largePending) return;
    const { rest } = largePending;
    setLargePending(null);
    if (rest.length) addFilesToQueue(rest);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFileQueue(prev => {
      if (prev[idx]?.preview) URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // --- Upload ---
  const handleSave = async () => {
    setIsUploading(true);

    if (activeTab === 'link') {
      if (!linkUrl.trim()) { toast.error('يرجى إدخال الرابط'); setIsUploading(false); return; }
      await onSave({
        competency_index: competencyIndex,
        evidence_name: evidenceName,
        notes,
        file_type: 'link',
        link_url: linkUrl,
        file_url: '',
        original_filename: '',
      });
      setIsUploading(false);
      onOpenChange(false);
      return;
    }

    // File mode
    if (fileQueue.length === 0 && !editingEvidence?.file_url) {
      toast.error('يرجى اختيار ملف واحد على الأقل');
      setIsUploading(false);
      return;
    }

    // If editing with no new files — just save notes
    if (fileQueue.length === 0 && editingEvidence?.file_url) {
      await onSave({
        competency_index: competencyIndex,
        evidence_name: evidenceName,
        notes,
        file_url: editingEvidence.file_url,
        file_type: editingEvidence.file_type,
        original_filename: editingEvidence.original_filename,
      });
      setIsUploading(false);
      onOpenChange(false);
      return;
    }

    // Upload each file
    let done = 0;
    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      setUploadProgress(`${i + 1} / ${fileQueue.length}`);
      setFileQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      let fileToUpload = item.file;
      const fileType = getFileType(item.file.name);
      if (fileType === 'image') fileToUpload = await compressImage(item.file);

      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });

      await onSave({
        competency_index: competencyIndex,
        evidence_name: evidenceName,
        notes: i === 0 ? notes : '', // notes only on first
        file_url,
        file_type: fileType,
        original_filename: item.file.name,
      });

      done++;
      setFileQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
    }

    setIsUploading(false);
    setUploadProgress(null);
    toast.success(`تم رفع ${done} ملف بنجاح`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingEvidence ? 'تعديل الشاهد' : 'رفع شاهد جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
                {/* Paste hint */}
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Clipboard className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-primary font-medium">
                    انسخ أي صورة ثم اضغط <kbd className="bg-primary/10 rounded px-1 font-mono">Ctrl+V</kbd> لإدراجها مباشرة
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-all"
                >
                  <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">اضغط لاختيار ملف أو أكثر</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, صور — يمكن اختيار عدة ملفات دفعة واحدة</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                  onChange={handleFileInput}
                />

                {/* File queue list */}
                {fileQueue.length > 0 && (
                  <div className="space-y-2">
                    {fileQueue.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                        {item.preview
                          ? <img src={item.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                          : fileIcon(item.file)
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            {item.large && <span className="text-amber-600 mr-1">• سيتم ضغطه</span>}
                          </p>
                        </div>
                        {item.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                        {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                        {item.status === 'pending' && !isUploading && (
                          <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {editingEvidence?.original_filename && fileQueue.length === 0 && (
                  <p className="text-xs text-muted-foreground">الملف الحالي: {editingEvidence.original_filename}</p>
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

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isUploading} className="gap-2">
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading && uploadProgress ? `جارٍ الرفع ${uploadProgress}` : editingEvidence ? 'حفظ التعديلات' : `رفع ${fileQueue.length > 1 ? fileQueue.length + ' ملفات' : 'الشاهد'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Large file confirmation dialog */}
      <Dialog open={!!largePending} onOpenChange={() => rejectLarge()}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              ملف كبير الحجم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-foreground font-medium truncate">{largePending?.file?.name}</p>
            <p className="text-sm text-muted-foreground">
              حجم الملف <span className="font-bold text-amber-600">{largePending ? (largePending.file.size / 1024 / 1024).toFixed(1) : 0} MB</span> يتجاوز 10MB.
            </p>
            <p className="text-xs text-muted-foreground">
              {largePending?.file && getFileType(largePending.file.name) === 'image'
                ? 'سيتم ضغط الصورة تلقائياً إلى 50% من حجمها للحفاظ على جودة مقبولة.'
                : 'سيتم رفع الملف كما هو. تأكد أن حجمه مقبول.'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={rejectLarge}>تخطّي هذا الملف</Button>
            <Button onClick={confirmLarge} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              رفعه على أي حال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}