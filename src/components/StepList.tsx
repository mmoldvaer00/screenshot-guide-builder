'use client';

import { useCallback, useRef } from 'react';
import { useGuideStore } from '@/store/guideStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Upload, Image } from 'lucide-react';
import { GuideStep } from '@/types/guide';

function SortableStep({ step, isSelected }: { step: GuideStep; isSelected: boolean }) {
  const { setSelectedStep, deleteStep } = useGuideStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'
      }`}
      onClick={() => setSelectedStep(step.id)}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
        {step.imageUrl ? (
          <img
            src={step.imageUrl}
            alt={step.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {step.title}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {step.instructions || 'No instructions'}
        </p>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteStep(step.id);
        }}
        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function StepList() {
  const { getCurrentProject, addStep, reorderSteps, selectedStepId } = useGuideStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = getCurrentProject();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && project) {
      const oldIndex = project.steps.findIndex((s) => s.id === active.id);
      const newIndex = project.steps.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(
        project.steps.map((s) => s.id),
        oldIndex,
        newIndex
      );
      reorderSteps(newOrder);
    }
  };

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            addStep(imageUrl, file.name);
          };
          reader.readAsDataURL(file);
        }
      });
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addStep]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            addStep(imageUrl, file.name);
          };
          reader.readAsDataURL(file);
        }
      });
    },
    [addStep]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Steps</h2>
      </div>

      {/* Upload area */}
      <div
        className="p-4 border-b border-gray-200"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Screenshots</span>
        </button>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-auto p-2">
        {project.steps.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No steps yet</p>
            <p className="text-xs">Upload screenshots to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={project.steps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {project.steps.map((step) => (
                  <SortableStep
                    key={step.id}
                    step={step}
                    isSelected={step.id === selectedStepId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
