import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuickStats from './widgets/QuickStats';
import ActivityFeed from './widgets/ActivityFeed';

const Widget = ({ widget, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderContent = () => {
    if (widget.type === 'chart' && widget.component) {
      const ChartComponent = widget.component;
      return <ChartComponent />;
    }

    if (widget.type === 'stats') {
      return <QuickStats />;
    }

    if (widget.type === 'activity') {
      return <ActivityFeed />;
    }

    return <div>Widget content</div>;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Drag to reorder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-white">{widget.title}</h3>
        </div>
        <button
          onClick={() => onRemove(widget.id)}
          className="text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Remove widget"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Widget Content */}
      <div className="p-4">{renderContent()}</div>
    </div>
  );
};

export default Widget;
