'use client';

import { useGuideStore } from '@/store/guideStore';
import { ArrowLeft, Download, Camera, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onExport: () => void;
}

export default function Header({ onExport }: HeaderProps) {
  const { getCurrentProject, setCurrentProject, updateProject } = useGuideStore();
  const project = getCurrentProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project?.name || '');
  const [showSaved, setShowSaved] = useState(false);

  // Show "saved" indicator briefly when project changes
  useEffect(() => {
    if (project) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [project?.updatedAt]);

  const handleSave = () => {
    if (project && editName.trim()) {
      updateProject(project.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {project ? (
            <>
              <button
                onClick={() => setCurrentProject(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Back to projects"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
              </button>
              
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="text-xl font-semibold bg-gray-100 px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <h1
                    onClick={() => {
                      setEditName(project.name);
                      setIsEditing(true);
                    }}
                    className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                    title="Click to edit name"
                  >
                    {project.name}
                  </h1>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                    {project.steps.length} step{project.steps.length !== 1 ? 's' : ''}
                  </span>
                  
                  {showSaved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 animate-fade-in">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Screenshot Guide Builder</h1>
                <p className="text-xs text-gray-500">Create step-by-step guides from screenshots</p>
              </div>
            </div>
          )}
        </div>

        {project && (
          <div className="flex items-center gap-3">
            <button
              onClick={onExport}
              disabled={project.steps.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
