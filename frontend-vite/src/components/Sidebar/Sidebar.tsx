import React from 'react';
import './Sidebar.css';

export interface ProjectFilter {
  id: string;
  label: string;
  value: string;
  category: 'dossiers' | 'guidelines' | 'internal';
}

interface SidebarProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  onExport: () => void;
}

const projects: ProjectFilter[] = [
  // Dossiers
  { id: 'proj-ds1062', label: 'DS-1062', value: 'DS-1062', category: 'dossiers' },
  { id: 'proj-u31402', label: 'U3-1402', value: 'U3-1402', category: 'dossiers' },
  { id: 'proj-ds8201', label: 'DS-8201', value: 'DS-8201', category: 'dossiers' },
  { id: 'proj-impd', label: 'IMPD', value: 'impd', category: 'dossiers' },
  { id: 'proj-maa', label: 'MAA', value: 'maa', category: 'dossiers' },
  { id: 'proj-bla', label: 'BLA', value: 'bla', category: 'dossiers' },
  { id: 'proj-core', label: 'Core', value: 'core', category: 'dossiers' },
  // Guidelines
  { id: 'guide-ema', label: 'EMA', value: 'ema', category: 'guidelines' },
  { id: 'guide-ich', label: 'ICH', value: 'ich', category: 'guidelines' },
  { id: 'guide-fda', label: 'FDA', value: 'fda', category: 'guidelines' },
  { id: 'guide-jp', label: 'JP', value: 'jp', category: 'guidelines' },
  { id: 'guide-cn', label: 'CN', value: 'cn', category: 'guidelines' },
  { id: 'guide-row', label: 'RoW', value: 'row', category: 'guidelines' },
  // Internal Guidance
  {
    id: 'guide-internal',
    label: 'Internal Documents',
    value: 'internal-guidance',
    category: 'internal',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ selectedFilters, onFilterChange, onExport }) => {
  const handleCheckboxChange = (value: string) => {
    const newFilters = selectedFilters.includes(value)
      ? selectedFilters.filter(f => f !== value)
      : [...selectedFilters, value];
    onFilterChange(newFilters);
  };

  const renderCategory = (title: string, category: ProjectFilter['category']) => {
    const categoryProjects = projects.filter(p => p.category === category);
    return (
      <>
        <div className="project-category">{title}</div>
        {categoryProjects.map(project => (
          <div className="project-item" key={project.id}>
            <input
              type="checkbox"
              className="project-checkbox"
              value={project.value}
              id={project.id}
              checked={selectedFilters.includes(project.value)}
              onChange={() => handleCheckboxChange(project.value)}
            />
            <label htmlFor={project.id} className="project-label">
              {project.label}
            </label>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Filter by Source</div>
        <div className="sidebar-subtitle">Select one or more</div>
      </div>

      <div className="projects-container">
        {renderCategory('Dossiers', 'dossiers')}
        {renderCategory('Guidelines', 'guidelines')}
        {renderCategory('Internal Guidance', 'internal')}
      </div>

      <div className="sidebar-footer">
        <button className="export-btn" onClick={onExport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export History
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
