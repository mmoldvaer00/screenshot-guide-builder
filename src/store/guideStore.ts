'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { GuideProject, GuideStep, Annotation, DEFAULT_SETTINGS, GuideSettings } from '@/types/guide';

interface GuideStore {
  projects: GuideProject[];
  currentProjectId: string | null;
  selectedStepId: string | null;
  
  // Project actions
  createProject: (name: string, description?: string) => string;
  updateProject: (id: string, updates: Partial<GuideProject>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => GuideProject | null;
  
  // Step actions
  addStep: (imageUrl: string, imageName: string) => void;
  updateStep: (stepId: string, updates: Partial<GuideStep>) => void;
  deleteStep: (stepId: string) => void;
  reorderSteps: (newOrder: string[]) => void;
  setSelectedStep: (stepId: string | null) => void;
  
  // Annotation actions
  addAnnotation: (stepId: string, annotation: Omit<Annotation, 'id'>) => void;
  updateAnnotation: (stepId: string, annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (stepId: string, annotationId: string) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<GuideSettings>) => void;
}

export const useGuideStore = create<GuideStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      selectedStepId: null,

      createProject: (name, description = '') => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const newProject: GuideProject = {
          id,
          name,
          description,
          steps: [],
          createdAt: now,
          updatedAt: now,
          settings: DEFAULT_SETTINGS,
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: id,
        }));
        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id, selectedStepId: null });
      },

      getCurrentProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.currentProjectId) || null;
      },

      addStep: (imageUrl, imageName) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        const newStep: GuideStep = {
          id: uuidv4(),
          order: project.steps.length,
          imageUrl,
          imageName,
          title: `Step ${project.steps.length + 1}`,
          instructions: '',
          annotations: [],
        };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? { ...p, steps: [...p.steps, newStep], updatedAt: new Date().toISOString() }
              : p
          ),
          selectedStepId: newStep.id,
        }));
      },

      updateStep: (stepId, updates) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteStep: (stepId) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: p.steps
                    .filter((s) => s.id !== stepId)
                    .map((s, i) => ({ ...s, order: i })),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          selectedStepId: state.selectedStepId === stepId ? null : state.selectedStepId,
        }));
      },

      reorderSteps: (newOrder) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: newOrder.map((id, index) => {
                    const step = p.steps.find((s) => s.id === id)!;
                    return { ...step, order: index };
                  }),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      setSelectedStep: (stepId) => {
        set({ selectedStepId: stepId });
      },

      addAnnotation: (stepId, annotation) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        const newAnnotation: Annotation = { ...annotation, id: uuidv4() };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === stepId
                      ? { ...s, annotations: [...s.annotations, newAnnotation] }
                      : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateAnnotation: (stepId, annotationId, updates) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === stepId
                      ? {
                          ...s,
                          annotations: s.annotations.map((a) =>
                            a.id === annotationId ? { ...a, ...updates } : a
                          ),
                        }
                      : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteAnnotation: (stepId, annotationId) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === stepId
                      ? { ...s, annotations: s.annotations.filter((a) => a.id !== annotationId) }
                      : s
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateSettings: (settings) => {
        const project = get().getCurrentProject();
        if (!project) return;
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id
              ? { ...p, settings: { ...p.settings, ...settings }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
    }),
    {
      name: 'guide-builder-storage',
    }
  )
);
