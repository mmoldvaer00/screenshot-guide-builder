'use client';

import { useState, useRef, useEffect } from 'react';
import { useGuideStore } from '@/store/guideStore';
import { GuideStep, Annotation } from '@/types/guide';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowRight,
  Type,
  Highlighter,
  Trash2,
  Hash,
  EyeOff,
  MousePointerClick,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';

interface StepEditorProps {
  step: GuideStep;
}

type AnnotationTool = 'select' | 'box' | 'circle' | 'arrow' | 'text' | 'highlight' | 'callout' | 'blur' | 'cursor';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#000000'];

export default function StepEditor({ step }: StepEditorProps) {
  const { updateStep, addAnnotation, updateAnnotation, deleteAnnotation } = useGuideStore();
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const tools: { id: AnnotationTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Select', shortcut: 'V' },
    { id: 'callout', icon: <Hash className="w-5 h-5" />, label: 'Numbered Callout', shortcut: '1' },
    { id: 'box', icon: <Square className="w-5 h-5" />, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: <Circle className="w-5 h-5" />, label: 'Circle', shortcut: 'O' },
    { id: 'arrow', icon: <ArrowRight className="w-5 h-5" />, label: 'Arrow', shortcut: 'A' },
    { id: 'cursor', icon: <MousePointerClick className="w-5 h-5" />, label: 'Click Here', shortcut: 'C' },
    { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Text', shortcut: 'T' },
    { id: 'highlight', icon: <Highlighter className="w-5 h-5" />, label: 'Highlight', shortcut: 'H' },
    { id: 'blur', icon: <EyeOff className="w-5 h-5" />, label: 'Blur/Redact', shortcut: 'B' },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const shortcuts: Record<string, AnnotationTool> = {
        v: 'select',
        '1': 'callout',
        r: 'box',
        o: 'circle',
        a: 'arrow',
        c: 'cursor',
        t: 'text',
        h: 'highlight',
        b: 'blur',
      };

      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) {
        setActiveTool(tool);
      }

      // Delete selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        deleteAnnotation(step.id, selectedAnnotation);
        setSelectedAnnotation(null);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setActiveTool('select');
      }

      // Zoom controls
      if (e.key === '=' || e.key === '+') {
        setZoom((z) => Math.min(z + 0.25, 3));
      }
      if (e.key === '-') {
        setZoom((z) => Math.max(z - 0.25, 0.5));
      }
      if (e.key === '0') {
        setZoom(1);
      }
    };

    // Mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.min(Math.max(z + delta, 0.5), 3));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    const container = containerRef.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      container?.removeEventListener('wheel', handleWheel);
    };
  }, [selectedAnnotation, step.id, deleteAnnotation]);

  const getRelativePosition = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'select') {
      setSelectedAnnotation(null);
      return;
    }

    const pos = getRelativePosition(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        addAnnotation(step.id, {
          type: 'text',
          x: pos.x,
          y: pos.y,
          text,
          color: activeColor,
          fontSize: 16,
        });
      }
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'callout') {
      // Auto-number based on existing callouts
      const existingCallouts = step.annotations.filter((a) => a.type === 'callout');
      const nextNumber = existingCallouts.length + 1;
      addAnnotation(step.id, {
        type: 'callout',
        x: pos.x,
        y: pos.y,
        color: activeColor,
        number: nextNumber,
      });
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'cursor') {
      addAnnotation(step.id, {
        type: 'cursor',
        x: pos.x,
        y: pos.y,
        color: activeColor,
      });
      setIsDrawing(false);
      return;
    }

    setCurrentAnnotation({
      type: activeTool === 'highlight' ? 'highlight' : activeTool,
      x: pos.x,
      y: pos.y,
      color: activeColor,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation) return;

    const pos = getRelativePosition(e);

    if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation({
        ...currentAnnotation,
        endX: pos.x,
        endY: pos.y,
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;

    // Only add if it has some size
    const hasSize =
      currentAnnotation.type === 'arrow'
        ? currentAnnotation.endX !== undefined
        : Math.abs(currentAnnotation.width || 0) > 1 || Math.abs(currentAnnotation.height || 0) > 1;

    if (hasSize) {
      addAnnotation(step.id, currentAnnotation as Omit<Annotation, 'id'>);
    }

    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleAnnotationClick = (e: React.MouseEvent, annotationId: string) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedAnnotation(annotationId);
    }
  };

  const renderAnnotation = (annotation: Annotation, isPreview = false) => {
    const isSelected = selectedAnnotation === annotation.id && !isPreview;
    const baseStyle = {
      position: 'absolute' as const,
      pointerEvents: isPreview ? 'none' as const : 'auto' as const,
    };

    switch (annotation.type) {
      case 'box':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${Math.min(annotation.x, annotation.x + (annotation.width || 0))}%`,
              top: `${Math.min(annotation.y, annotation.y + (annotation.height || 0))}%`,
              width: `${Math.abs(annotation.width || 0)}%`,
              height: `${Math.abs(annotation.height || 0)}%`,
              border: `3px solid ${annotation.color}`,
              borderRadius: '4px',
              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          />
        );

      case 'circle':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${Math.min(annotation.x, annotation.x + (annotation.width || 0))}%`,
              top: `${Math.min(annotation.y, annotation.y + (annotation.height || 0))}%`,
              width: `${Math.abs(annotation.width || 0)}%`,
              height: `${Math.abs(annotation.height || 0)}%`,
              border: `3px solid ${annotation.color}`,
              borderRadius: '50%',
              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          />
        );

      case 'highlight':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${Math.min(annotation.x, annotation.x + (annotation.width || 0))}%`,
              top: `${Math.min(annotation.y, annotation.y + (annotation.height || 0))}%`,
              width: `${Math.abs(annotation.width || 0)}%`,
              height: `${Math.abs(annotation.height || 0)}%`,
              backgroundColor: annotation.color,
              opacity: 0.3,
              borderRadius: '2px',
              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          />
        );

      case 'text':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              color: annotation.color,
              fontSize: `${annotation.fontSize || 16}px`,
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              boxShadow: isSelected ? '0 0 0 2px #3B82F6' : undefined,
              padding: isSelected ? '2px' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          >
            {annotation.text}
          </div>
        );

      case 'arrow':
        const dx = (annotation.endX || annotation.x) - annotation.x;
        const dy = (annotation.endY || annotation.y) - annotation.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const length = Math.sqrt(dx * dx + dy * dy);

        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              width: `${length}%`,
              height: '3px',
              backgroundColor: annotation.color,
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg)`,
              boxShadow: isSelected ? '0 0 0 2px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          >
            <div
              style={{
                position: 'absolute',
                right: '-8px',
                top: '-5px',
                width: 0,
                height: 0,
                borderLeft: `12px solid ${annotation.color}`,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
              }}
            />
          </div>
        );

      case 'callout':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: annotation.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: isSelected
                ? '0 0 0 2px white, 0 0 0 4px #3B82F6'
                : '0 2px 4px rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          >
            {annotation.number}
          </div>
        );

      case 'blur':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${Math.min(annotation.x, annotation.x + (annotation.width || 0))}%`,
              top: `${Math.min(annotation.y, annotation.y + (annotation.height || 0))}%`,
              width: `${Math.abs(annotation.width || 0)}%`,
              height: `${Math.abs(annotation.height || 0)}%`,
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          />
        );

      case 'cursor':
        return (
          <div
            key={annotation.id}
            style={{
              ...baseStyle,
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-8px, -8px)',
              boxShadow: isSelected ? '0 0 0 2px #3B82F6' : undefined,
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          >
            {/* Pulsing ring */}
            <div
              style={{
                position: 'absolute',
                left: '-12px',
                top: '-12px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: `3px solid ${annotation.color}`,
                opacity: 0.5,
                animation: isPreview ? undefined : 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Center dot */}
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: annotation.color,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-2 rounded-md transition-colors ${
                activeTool === tool.id
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-6 h-6 rounded-full transition-transform ${
                activeColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {selectedAnnotation && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <button
              onClick={() => {
                deleteAnnotation(step.id, selectedAnnotation);
                setSelectedAnnotation(null);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete annotation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-sm text-gray-600 font-medium min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
            title="Reset zoom (0)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 p-6 overflow-auto bg-gray-100"
        >
          <div
            ref={canvasRef}
            className="relative bg-white shadow-lg rounded-lg overflow-hidden mx-auto origin-top-left"
            style={{ 
              maxWidth: `${900 * zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={step.imageUrl}
              alt={step.title}
              className="w-full h-auto select-none"
              draggable={false}
            />

            {/* Render existing annotations */}
            {step.annotations.map((annotation) => renderAnnotation(annotation))}

            {/* Render current annotation being drawn */}
            {currentAnnotation && renderAnnotation({ ...currentAnnotation, id: 'preview' } as Annotation, true)}
          </div>
        </div>

        {/* Side panel for step details */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Step Title
              </label>
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                value={step.instructions}
                onChange={(e) => updateStep(step.id, { instructions: e.target.value })}
                placeholder="Describe what the user should do in this step..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Annotations ({step.annotations.length})
              </h4>
              {step.annotations.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Use the tools above to add annotations to your screenshot
                </p>
              ) : (
                <div className="space-y-2">
                  {step.annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAnnotation === annotation.id
                          ? 'bg-blue-100'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedAnnotation(annotation.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-sm capitalize">{annotation.type}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(step.id, annotation.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
