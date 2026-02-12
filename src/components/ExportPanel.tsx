'use client';

import { useState, useRef } from 'react';
import { useGuideStore } from '@/store/guideStore';
import { X, Download, Loader2, FileText, Settings } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportPanelProps {
  onClose: () => void;
}

export default function ExportPanel({ onClose }: ExportPanelProps) {
  const { getCurrentProject, updateSettings } = useGuideStore();
  const project = getCurrentProject();
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      // Title page
      pdf.setFontSize(28);
      pdf.setTextColor(0, 0, 0);
      pdf.text(project.name, pageWidth / 2, 60, { align: 'center' });

      if (project.description) {
        pdf.setFontSize(14);
        pdf.setTextColor(100, 100, 100);
        const descLines = pdf.splitTextToSize(project.description, contentWidth);
        pdf.text(descLines, pageWidth / 2, 80, { align: 'center' });
      }

      pdf.setFontSize(12);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${project.steps.length} steps`, pageWidth / 2, pageHeight - 40, { align: 'center' });
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 30,
        { align: 'center' }
      );

      // Generate each step
      for (let i = 0; i < project.steps.length; i++) {
        const step = project.steps[i];
        pdf.addPage();

        let yPos = margin;

        // Step number and title
        if (project.settings.showStepNumbers) {
          pdf.setFontSize(12);
          pdf.setTextColor(...hexToRgb(project.settings.primaryColor));
          pdf.text(`STEP ${i + 1}`, margin, yPos + 5);
          yPos += 10;
        }

        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(step.title, margin, yPos + 5);
        yPos += 15;

        // Instructions
        if (step.instructions) {
          pdf.setFontSize(11);
          pdf.setTextColor(60, 60, 60);
          const instructionLines = pdf.splitTextToSize(step.instructions, contentWidth);
          pdf.text(instructionLines, margin, yPos);
          yPos += instructionLines.length * 5 + 10;
        }

        // Screenshot with annotations
        if (step.imageUrl) {
          try {
            // Create a temporary container for the image with annotations
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.width = '800px';
            document.body.appendChild(container);

            container.innerHTML = `
              <div style="position: relative; display: inline-block;">
                <img src="${step.imageUrl}" style="max-width: 100%; display: block;" />
                ${step.annotations
                  .map((a) => {
                    if (a.type === 'box') {
                      return `<div style="position: absolute; left: ${Math.min(a.x, a.x + (a.width || 0))}%; top: ${Math.min(a.y, a.y + (a.height || 0))}%; width: ${Math.abs(a.width || 0)}%; height: ${Math.abs(a.height || 0)}%; border: 3px solid ${a.color}; border-radius: 4px; box-sizing: border-box;"></div>`;
                    }
                    if (a.type === 'circle') {
                      return `<div style="position: absolute; left: ${Math.min(a.x, a.x + (a.width || 0))}%; top: ${Math.min(a.y, a.y + (a.height || 0))}%; width: ${Math.abs(a.width || 0)}%; height: ${Math.abs(a.height || 0)}%; border: 3px solid ${a.color}; border-radius: 50%; box-sizing: border-box;"></div>`;
                    }
                    if (a.type === 'highlight') {
                      return `<div style="position: absolute; left: ${Math.min(a.x, a.x + (a.width || 0))}%; top: ${Math.min(a.y, a.y + (a.height || 0))}%; width: ${Math.abs(a.width || 0)}%; height: ${Math.abs(a.height || 0)}%; background-color: ${a.color}; opacity: 0.3;"></div>`;
                    }
                    if (a.type === 'text') {
                      return `<div style="position: absolute; left: ${a.x}%; top: ${a.y}%; color: ${a.color}; font-size: ${a.fontSize || 16}px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); white-space: nowrap;">${a.text}</div>`;
                    }
                    if (a.type === 'arrow') {
                      const dx = (a.endX || a.x) - a.x;
                      const dy = (a.endY || a.y) - a.y;
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      const length = Math.sqrt(dx * dx + dy * dy);
                      return `<div style="position: absolute; left: ${a.x}%; top: ${a.y}%; width: ${length}%; height: 3px; background-color: ${a.color}; transform-origin: 0 50%; transform: rotate(${angle}deg);"><div style="position: absolute; right: -8px; top: -5px; width: 0; height: 0; border-left: 12px solid ${a.color}; border-top: 6px solid transparent; border-bottom: 6px solid transparent;"></div></div>`;
                    }
                    if (a.type === 'callout') {
                      return `<div style="position: absolute; left: ${a.x}%; top: ${a.y}%; transform: translate(-50%, -50%); width: 32px; height: 32px; border-radius: 50%; background-color: ${a.color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${a.number || ''}</div>`;
                    }
                    if (a.type === 'blur') {
                      return `<div style="position: absolute; left: ${Math.min(a.x, a.x + (a.width || 0))}%; top: ${Math.min(a.y, a.y + (a.height || 0))}%; width: ${Math.abs(a.width || 0)}%; height: ${Math.abs(a.height || 0)}%; background-color: #1a1a1a; border-radius: 4px;"></div>`;
                    }
                    if (a.type === 'cursor') {
                      return `<div style="position: absolute; left: ${a.x}%; top: ${a.y}%; transform: translate(-8px, -8px);"><div style="position: absolute; left: -12px; top: -12px; width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${a.color}; opacity: 0.5;"></div><div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${a.color}; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div></div>`;
                    }
                    return '';
                  })
                  .join('')}
              </div>
            `;

            await new Promise((resolve) => setTimeout(resolve, 100));
            const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
              useCORS: true,
              allowTaint: true,
              scale: 2,
            });

            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;

            // Check if image fits on current page
            const availableHeight = pageHeight - yPos - margin;
            if (imgHeight > availableHeight) {
              pdf.addPage();
              yPos = margin;
            }

            pdf.addImage(imgData, 'JPEG', margin, yPos, imgWidth, imgHeight);
          } catch (err) {
            console.error('Error rendering screenshot:', err);
          }
        }
      }

      // Save the PDF
      pdf.save(`${project.name.replace(/[^a-z0-9]/gi, '_')}_guide.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Export Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          {/* Preview */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="bg-white rounded shadow-sm p-6 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-center mb-2">{project.name}</h4>
                {project.description && (
                  <p className="text-sm text-gray-500 text-center mb-4">{project.description}</p>
                )}
                <div className="text-xs text-gray-400 text-center">
                  {project.steps.length} steps • Generated {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="mb-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"
            >
              <Settings className="w-4 h-4" />
              Export Settings
            </button>
            
            {showSettings && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">Show step numbers</label>
                  <input
                    type="checkbox"
                    checked={project.settings.showStepNumbers}
                    onChange={(e) => updateSettings({ showStepNumbers: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Primary color</label>
                  <input
                    type="color"
                    value={project.settings.primaryColor}
                    onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• {project.steps.length} step{project.steps.length !== 1 ? 's' : ''} will be exported</li>
              <li>• {project.steps.reduce((acc, s) => acc + s.annotations.length, 0)} annotations total</li>
              <li>• PDF format with embedded images</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || project.steps.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
