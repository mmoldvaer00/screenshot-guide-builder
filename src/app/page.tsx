'use client';

import { useState, useEffect } from 'react';
import { useGuideStore } from '@/store/guideStore';
import Header from '@/components/Header';
import ProjectList from '@/components/ProjectList';
import StepList from '@/components/StepList';
import StepEditor from '@/components/StepEditor';
import ExportPanel from '@/components/ExportPanel';

export default function Home() {
  const { currentProjectId, getCurrentProject, selectedStepId } = useGuideStore();
  const [showExport, setShowExport] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  const project = getCurrentProject();

  if (!currentProjectId || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onExport={() => {}} />
        <ProjectList />
      </div>
    );
  }

  const selectedStep = project.steps.find((s) => s.id === selectedStepId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onExport={() => setShowExport(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Step list */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <StepList />
        </div>

        {/* Main content - Step editor */}
        <div className="flex-1 overflow-auto">
          {selectedStep ? (
            <StepEditor step={selectedStep} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg">Select a step to edit</p>
                <p className="text-sm mt-1">or upload screenshots to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export modal */}
      {showExport && (
        <ExportPanel onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
