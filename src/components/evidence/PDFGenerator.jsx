import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { COMPETENCIES } from '@/lib/competenciesData';
import jsPDF from 'jspdf';
import { toast } from "sonner";

const MOE_LOGO_URL = "https://upload.wikimedia.org/wikipedia/ar/thumb/d/dd/%D8%B4%D8%B9%D8%A7%D8%B1_%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85_%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9.svg/640px-%D8%B4%D8%B9%D8%A7%D8%B1_%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85_%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9.svg.png";

async function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function PDFGenerator({ evidenceRecords }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Load Arabic font - use built-in Helvetica with manual Arabic handling
    // We'll use html2canvas approach for Arabic text
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // === PAGE 1: Cover Page ===
    // Background gradient effect
    doc.setFillColor(0, 82, 55); // Dark green
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Decorative gold stripe
    doc.setFillColor(190, 166, 97); // Gold
    doc.rect(0, 90, pageWidth, 3, 'F');
    doc.rect(0, 200, pageWidth, 3, 'F');

    // White content area
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 25, pageWidth - margin * 2, 240, 5, 5, 'F');

    // Try to load logo
    const logoBase64 = await loadImageAsBase64(MOE_LOGO_URL);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 35, 40, 40);
    }

    // Since jsPDF doesn't natively support Arabic well, render via canvas
    const coverCanvas = document.createElement('canvas');
    const scale = 3;
    coverCanvas.width = (pageWidth - margin * 2) * scale * 3.78;
    coverCanvas.height = 180 * scale * 3.78;
    const ctx = coverCanvas.getContext('2d');
    
    ctx.scale(scale * 3.78, scale * 3.78);
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    const centerX = (pageWidth - margin * 2) / 2;

    // Ministry name
    ctx.fillStyle = '#005237';
    ctx.font = 'bold 6px "Noto Kufi Arabic", sans-serif';
    ctx.fillText('وزارة التعليم', centerX, 65);
    ctx.fillText('المملكة العربية السعودية', centerX, 73);

    // Separator line
    ctx.fillStyle = '#BEA661';
    ctx.fillRect(centerX - 40, 80, 80, 1);

    // School name
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 5px "Noto Kufi Arabic", sans-serif';
    ctx.fillText('مدرسة الموهوبين التقنية الثانوية للبنين', centerX, 92);

    // Year
    ctx.fillStyle = '#666666';
    ctx.font = '4.5px "Noto Kufi Arabic", sans-serif';
    ctx.fillText('العام الدراسي 1447هـ', centerX, 100);

    // Main title
    ctx.fillStyle = '#005237';
    ctx.font = 'bold 9px "Noto Kufi Arabic", sans-serif';
    ctx.fillText('ملف إنجاز المدير', centerX, 120);

    // Gold decorative line
    ctx.fillStyle = '#BEA661';
    ctx.fillRect(centerX - 30, 127, 60, 1.5);

    // Director name
    ctx.fillStyle = '#333333';
    ctx.font = '5px "Noto Kufi Arabic", sans-serif';
    ctx.fillText('مدير المدرسة', centerX, 142);
    ctx.font = 'bold 6px "Noto Kufi Arabic", sans-serif';
    ctx.fillStyle = '#005237';
    ctx.fillText('محمد عبدالرحمن العمري', centerX, 152);

    doc.addImage(coverCanvas.toDataURL(), 'PNG', margin, 25, pageWidth - margin * 2, 180);

    // === PAGE 2+: Evidence Links ===
    doc.addPage();
    
    let yPos = 20;

    const drawArabicText = (text, x, y, fontSize, color, isBold, align) => {
      const tempCanvas = document.createElement('canvas');
      const pxWidth = (pageWidth - margin * 2) * 3 * 3.78;
      tempCanvas.width = pxWidth;
      tempCanvas.height = fontSize * 6 * 3.78;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.scale(3 * 3.78, 3 * 3.78);
      tCtx.fillStyle = color;
      tCtx.font = `${isBold ? 'bold ' : ''}${fontSize}px "Noto Kufi Arabic", sans-serif`;
      tCtx.direction = 'rtl';
      tCtx.textAlign = align || 'right';
      const textX = align === 'center' ? (pageWidth - margin * 2) / 2 : (pageWidth - margin * 2) - 2;
      tCtx.fillText(text, textX, fontSize * 1.2);
      
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = fontSize * 2;
      doc.addImage(tempCanvas.toDataURL(), 'PNG', margin, y, contentWidth, contentHeight);
      return contentHeight;
    };

    // Page 2 header
    doc.setFillColor(0, 82, 55);
    doc.rect(0, 0, pageWidth, 15, 'F');
    drawArabicText('فهرس الشواهد والأدلة', 0, 2, 6, '#FFFFFF', true, 'center');

    yPos = 22;

    for (const competency of COMPETENCIES) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(0, 82, 55);
        doc.rect(0, 0, pageWidth, 15, 'F');
        drawArabicText('فهرس الشواهد والأدلة (تابع)', 0, 2, 6, '#FFFFFF', true, 'center');
        yPos = 22;
      }

      // Competency header bar
      doc.setFillColor(240, 248, 244);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 9, 2, 2, 'F');
      doc.setDrawColor(0, 82, 55);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 9, 2, 2, 'S');

      drawArabicText(`${competency.index}. ${competency.title}`, 0, yPos + 1, 4, '#005237', true, 'right');
      yPos += 12;

      const records = evidenceRecords.filter(r => r.competency_index === competency.index);

      for (const evidenceName of competency.evidences) {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          doc.setFillColor(0, 82, 55);
          doc.rect(0, 0, pageWidth, 15, 'F');
          drawArabicText('فهرس الشواهد والأدلة (تابع)', 0, 2, 6, '#FFFFFF', true, 'center');
          yPos = 22;
        }

        const matchingRecords = records.filter(r => r.evidence_name === evidenceName);
        const hasEvidence = matchingRecords.length > 0;

        // Status indicator
        doc.setFillColor(hasEvidence ? 0 : 200, hasEvidence ? 150 : 200, hasEvidence ? 80 : 200);
        doc.circle(pageWidth - margin - 4, yPos + 3.5, 1.5, 'F');

        drawArabicText(evidenceName, 0, yPos, 3.5, hasEvidence ? '#1a1a1a' : '#999999', false, 'right');

        if (hasEvidence) {
          matchingRecords.forEach((record) => {
            const linkUrl = record.file_type === 'link' ? record.link_url : record.file_url;
            if (linkUrl) {
              doc.setTextColor(0, 82, 55);
              doc.setFontSize(7);
              doc.textWithLink('🔗', margin + 5, yPos + 4.5, { url: linkUrl });
            }
          });
        }
        yPos += 8;
      }
      yPos += 4;
    }

    doc.save('ملف_إنجاز_المدير.pdf');
    toast.success('تم تصدير ملف الإنجاز بنجاح');
    setIsGenerating(false);
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      className="gap-2 bg-primary hover:bg-primary/90"
      size="lg"
    >
      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
      تصدير ملف الإنجاز PDF
    </Button>
  );
}