'use client';

import { useGuideStore } from '@/store/guideStore';
import { ArrowLeft, Download, Settings, FileText } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onExport: () => void;
}

export default function Header({ onExport }: HeaderProps) {
  const { getCurrentProject, setCurrentProject, updateProject } = useGuideStore();
  const project = getCurrentProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project?.name || '');

  const handleSave = () => {
    if (project && editName.trim()) {
      updateProject(project.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {project ? (
            <>
              <button
                onClick={() => setCurrentProject(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to projects"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="text-xl font-semibold bg-gray-100 px-2 py-1 rounded border-0 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <h1
                  onClick={() => {
                    setEditName(project.name);
                    setIsEditing(true);
                  }}
                  className="text-xl font-semibold cursor-pointer hover:text-blue-600"
                >
                  {project.name}
                </h1>
              )}
              
              <span className="text-sm text-gray-400">
                {project.steps.length} step{project.steps.length !== 1 ? 's' : ''}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold">Screenshot Guide Builder</h1>
            </div>
          )}
        </div>

        {project && (
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              disabled={project.steps.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
