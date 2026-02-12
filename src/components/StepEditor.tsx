'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGuideStore } from '@/store/guideStore';
import { GuideStep, Annotation } from '@/types/guide';
import Toolbar from './Toolbar';
import { FileText, MessageSquare } from 'lucide-react';

interface StepEditorProps {
  step: GuideStep;
}

type AnnotationTool = 'select' | 'box' | 'circle' | 'arrow' | 'text' | 'highlight' | 'callout' | 'blur' | 'cursor';

export default function StepEditor({ step }: StepEditorProps) {
  const { updateStep, addAnnotation, updateAnnotation, deleteAnnotation } = useGuideStore();
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const shortcuts: Record<string, AnnotationTool> = {
        v: 'select', '1': 'callout', r: 'box', o: 'circle',
        a: 'arrow', c: 'cursor', t: 'text', h: 'highlight', b: 'blur',
      };

      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        deleteAnnotation(step.id, selectedAnnotation);
        setSelectedAnnotation(null);
      }

      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setActiveTool('select');
      }

      if (e.key === '=' || e.key === '+') setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === '0') setZoom(1);
    };

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

  const getRelativePosition = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

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
        addAnnotation(step.id, { type: 'text', x: pos.x, y: pos.y, text, color: activeColor, fontSize: 16 });
      }
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'callout') {
      const existingCallouts = step.annotations.filter((a) => a.type === 'callout');
      addAnnotation(step.id, { type: 'callout', x: pos.x, y: pos.y, color: activeColor, number: existingCallouts.length + 1 });
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'cursor') {
      addAnnotation(step.id, { type: 'cursor', x: pos.x, y: pos.y, color: activeColor });
      setIsDrawing(false);
      return;
    }

    setCurrentAnnotation({ type: activeTool, x: pos.x, y: pos.y, color: activeColor });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleAnnotationDrag(e);
      return;
    }

    if (!isDrawing || !currentAnnotation) return;
    const pos = getRelativePosition(e);

    if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation({ ...currentAnnotation, endX: pos.x, endY: pos.y });
    } else {
      setCurrentAnnotation({ ...currentAnnotation, width: pos.x - startPos.x, height: pos.y - startPos.y });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!isDrawing || !currentAnnotation) return;

    const hasSize = currentAnnotation.type === 'arrow'
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
      const annotation = step.annotations.find((a) => a.id === annotationId);
      if (annotation) {
        const pos = getRelativePosition(e);
        setSelectedAnnotation(annotationId);
        setIsDragging(true);
        setDragOffset({ x: pos.x - annotation.x, y: pos.y - annotation.y });
      }
    }
  };

  const handleAnnotationDrag = (e: React.MouseEvent) => {
    if (!isDragging || !selectedAnnotation) return;

    const pos = getRelativePosition(e);
    const annotation = step.annotations.find((a) => a.id === selectedAnnotation);
    if (!annotation) return;

    const newX = pos.x - dragOffset.x;
    const newY = pos.y - dragOffset.y;

    if (annotation.type === 'arrow') {
      const dx = (annotation.endX || annotation.x) - annotation.x;
      const dy = (annotation.endY || annotation.y) - annotation.y;
      updateAnnotation(step.id, selectedAnnotation, { x: newX, y: newY, endX: newX + dx, endY: newY + dy });
    } else {
      updateAnnotation(step.id, selectedAnnotation, { x: newX, y: newY });
    }
  };

  const handleDeleteAnnotation = () => {
    if (selectedAnnotation) {
      deleteAnnotation(step.id, selectedAnnotation);
      setSelectedAnnotation(null);
    }
  };

  const renderAnnotation = (annotation: Annotation, isPreview = false) => {
    const isSelected = selectedAnnotation === annotation.id && !isPreview;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: isPreview ? 'none' : 'auto',
      cursor: activeTool === 'select' ? 'move' : 'default',
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
            }}
            onClick={(e) => handleAnnotationClick(e, annotation.id)}
          >
            {annotation.number}
          </div>
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
            <div
              className={isPreview ? '' : 'animate-ping'}
              style={{
                position: 'absolute',
                left: '-12px',
                top: '-12px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: `3px solid ${annotation.color}`,
                opacity: 0.5,
              }}
            />
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
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        selectedAnnotation={selectedAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
        zoom={zoom}
        setZoom={setZoom}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 p-6 overflow-auto bg-gray-100"
        >
          <div
            ref={canvasRef}
            className="relative bg-white shadow-lg rounded-lg overflow-hidden mx-auto"
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
              src={step.imageUrl}
              alt={step.title}
              className="w-full h-auto select-none"
              draggable={false}
            />

            {step.annotations.map((annotation) => renderAnnotation(annotation))}
            {currentAnnotation && renderAnnotation({ ...currentAnnotation, id: 'preview' } as Annotation, true)}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Step details header */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Step Details</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Step Title
              </label>
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g., Click the Settings button"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Instructions
                </div>
              </label>
              <textarea
                value={step.instructions}
                onChange={(e) => updateStep(step.id, { instructions: e.target.value })}
                placeholder="Describe what the user should do in this step..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={5}
              />
              <p className="mt-1.5 text-xs text-gray-400">
                This text will appear below the screenshot in the exported guide
              </p>
            </div>

            {/* Annotations list */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annotations ({step.annotations.length})
              </label>
              
              {step.annotations.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">No annotations yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Select a tool and click on the screenshot to add annotations
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {step.annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedAnnotation === annotation.id
                          ? 'bg-blue-100 ring-1 ring-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedAnnotation(annotation.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {annotation.type}
                          {annotation.type === 'callout' && ` #${annotation.number}`}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(step.id, annotation.id);
                          if (selectedAnnotation === annotation.id) {
                            setSelectedAnnotation(null);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
