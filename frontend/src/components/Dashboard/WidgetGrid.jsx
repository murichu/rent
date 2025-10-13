import React, { useState } from 'react';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import Widget from './Widget';
import { RevenueTrendChart, OccupancyChart, PropertyStatusChart, PaymentStatusChart } from '../DashboardCharts';

const WidgetGrid = () => {
  const [widgets, setWidgets] = useState([
    { id: 'revenue', type: 'chart', title: 'Revenue Trend', component: RevenueTrendChart, size: 'large' },
    { id: 'occupancy', type: 'chart', title: 'Occupancy Rate', component: OccupancyChart, size: 'medium' },
    { id: 'property-status', type: 'chart', title: 'Property Status', component: PropertyStatusChart, size: 'medium' },
    { id: 'payment-status', type: 'chart', title: 'Payment Status', component: PaymentStatusChart, size: 'medium' },
    { id: 'quick-stats', type: 'stats', title: 'Quick Stats', size: 'large' },
    { id: 'activity', type: 'activity', title: 'Recent Activity', size: 'medium' },
  ]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id) => {
    setWidgets((items) => items.filter((item) => item.id !== id));
  };

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-4',
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Customize
        </button>
      </div>

      {/* Widget Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {widgets.map((widget) => (
              <div key={widget.id} className={sizeClasses[widget.size]}>
                <Widget widget={widget} onRemove={removeWidget} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default WidgetGrid;
