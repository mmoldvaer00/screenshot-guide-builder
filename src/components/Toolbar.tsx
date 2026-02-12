'use client';

import { Dispatch, SetStateAction } from 'react';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowRight,
  Type,
  Highlighter,
  Hash,
  EyeOff,
  MousePointerClick,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
} from 'lucide-react';

type AnnotationTool = 'select' | 'box' | 'circle' | 'arrow' | 'text' | 'highlight' | 'callout' | 'blur' | 'cursor';

const TOOLS: { id: AnnotationTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', shortcut: 'V' },
  { id: 'callout', icon: <Hash className="w-4 h-4" />, label: 'Callout', shortcut: '1' },
  { id: 'box', icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R' },
  { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle', shortcut: 'O' },
  { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow', shortcut: 'A' },
  { id: 'cursor', icon: <MousePointerClick className="w-4 h-4" />, label: 'Click', shortcut: 'C' },
  { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T' },
  { id: 'highlight', icon: <Highlighter className="w-4 h-4" />, label: 'Highlight', shortcut: 'H' },
  { id: 'blur', icon: <EyeOff className="w-4 h-4" />, label: 'Blur', shortcut: 'B' },
];

const COLORS = [
  { value: '#EF4444', name: 'Red' },
  { value: '#F59E0B', name: 'Orange' },
  { value: '#10B981', name: 'Green' },
  { value: '#3B82F6', name: 'Blue' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#000000', name: 'Black' },
];

interface ToolbarProps {
  activeTool: AnnotationTool;
  setActiveTool: Dispatch<SetStateAction<AnnotationTool>>;
  activeColor: string;
  setActiveColor: Dispatch<SetStateAction<string>>;
  selectedAnnotation: string | null;
  onDeleteAnnotation: () => void;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
}

export default function Toolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  selectedAnnotation,
  onDeleteAnnotation,
  zoom,
  setZoom,
}: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-6">
        {/* Tools */}
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-3">Tools</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTool === tool.id
                    ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                title={`${tool.label} (${tool.shortcut})`}
              >
                {tool.icon}
                <span className="hidden lg:inline">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200" />

        {/* Colors */}
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-3">Color</span>
          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setActiveColor(color.value)}
                className={`w-7 h-7 rounded-full transition-all relative ${
                  activeColor === color.value
                    ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {activeColor === color.value && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-2 h-2 bg-white rounded-full shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Delete button (when annotation selected) */}
        {selectedAnnotation && (
          <>
            <div className="h-8 w-px bg-gray-200" />
            <button
              onClick={onDeleteAnnotation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-1.5 rounded-md text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1 text-sm text-gray-600 font-medium min-w-[50px] text-center hover:bg-white rounded transition-colors"
            title="Reset zoom (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-1.5 rounded-md text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-gray-400">
        <span className="font-medium">Tips:</span> Press key shortcuts (V, 1, R, O, A, C, T, H, B) to switch tools • Ctrl+Scroll to zoom • Delete to remove selected
      </div>
    </div>
  );
}
