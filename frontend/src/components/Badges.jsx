import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    Open: 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const styles = {
    Critical: 'bg-red-50 text-red-700 border-red-300 font-bold',
    High: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
        styles[priority] || 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {priority === 'Critical' && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
      )}
      {priority}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
      {category}
    </span>
  );
};
