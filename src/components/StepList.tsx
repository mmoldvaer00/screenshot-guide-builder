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
import { GripVertical, Trash2, Upload, ImageIcon, Copy, Plus } from 'lucide-react';
import { GuideStep } from '@/types/guide';

function SortableStep({ step, index, isSelected }: { step: GuideStep; index: number; isSelected: boolean }) {
  const { setSelectedStep, deleteStep, duplicateStep } = useGuideStore();
  
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
      className={`group relative rounded-xl transition-all cursor-pointer ${
        isSelected 
          ? 'bg-blue-50 ring-2 ring-blue-500 shadow-sm' 
          : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedStep(step.id)}
    >
      {/* Step number badge */}
      <div className={`absolute -left-2 -top-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}>
        {index + 1}
      </div>

      <div className="p-3">
        {/* Screenshot preview */}
        <div className="relative w-full aspect-video rounded-lg bg-gray-100 overflow-hidden mb-3">
          {step.imageUrl ? (
            <img
              src={step.imageUrl}
              alt={step.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
          )}
          
          {/* Annotation count badge */}
          {step.annotations.length > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
              {step.annotations.length} annotation{step.annotations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Title and actions */}
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {step.title}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {step.instructions || 'Click to add instructions...'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateStep(step.id);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
              title="Duplicate step"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this step?')) {
                  deleteStep(step.id);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
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
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addStep]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
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
    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Steps</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {project.steps.length} step{project.steps.length !== 1 ? 's' : ''} • Drag to reorder
            </p>
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-auto p-4">
        {project.steps.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-700 mb-1">No steps yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Drop screenshots here or click below to upload
            </p>
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Screenshots
            </button>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={project.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {project.steps.map((step, index) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      index={index}
                      isSelected={step.id === selectedStepId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add more button */}
            <div className="mt-4">
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
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Plus className="w-4 h-4" />
                Add More Screenshots
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
