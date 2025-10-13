import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from 'framer-motion';

const localizer = momentLocalizer(moment);

const LeaseCalendar = ({ leases = [], payments = [], maintenanceSchedules = [] }) => {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Convert data to calendar events
  const events = useMemo(() => {
    const calendarEvents = [];

    // Lease events
    leases.forEach((lease) => {
      if (lease.startDate) {
        calendarEvents.push({
          id: `lease-start-${lease.id}`,
          title: `Lease Start: ${lease.tenant?.name || 'Tenant'}`,
          start: new Date(lease.startDate),
          end: new Date(lease.startDate),
          type: 'lease-start',
          resource: lease,
        });
      }
      if (lease.endDate) {
        calendarEvents.push({
          id: `lease-end-${lease.id}`,
          title: `Lease End: ${lease.tenant?.name || 'Tenant'}`,
          start: new Date(lease.endDate),
          end: new Date(lease.endDate),
          type: 'lease-end',
          resource: lease,
        });
      }
    });

    // Payment due dates
    payments.forEach((payment) => {
      if (payment.dueAt) {
        calendarEvents.push({
          id: `payment-${payment.id}`,
          title: `Payment Due: $${payment.amount}`,
          start: new Date(payment.dueAt),
          end: new Date(payment.dueAt),
          type: payment.status === 'PAID' ? 'payment-paid' : 'payment-due',
          resource: payment,
        });
      }
    });

    // Maintenance schedules
    maintenanceSchedules.forEach((schedule) => {
      calendarEvents.push({
        id: `maintenance-${schedule.id}`,
        title: `Maintenance: ${schedule.description}`,
        start: new Date(schedule.scheduledAt),
        end: new Date(schedule.scheduledAt),
        type: 'maintenance',
        resource: schedule,
      });
    });

    return calendarEvents;
  }, [leases, payments, maintenanceSchedules]);

  const eventStyleGetter = (event) => {
    const styles = {
      'lease-start': { backgroundColor: '#10b981', borderColor: '#059669' },
      'lease-end': { backgroundColor: '#f59e0b', borderColor: '#d97706' },
      'payment-paid': { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
      'payment-due': { backgroundColor: '#ef4444', borderColor: '#dc2626' },
      'maintenance': { backgroundColor: '#8b5cf6', borderColor: '#7c3aed' },
    };

    return {
      style: {
        ...styles[event.type],
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '2px solid',
        display: 'block',
        fontSize: '13px',
        padding: '4px 8px',
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const CustomToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {toolbar.label}
        </h2>

        <div className="flex gap-2">
          {['month', 'week', 'day', 'agenda'].map((v) => (
            <button
              key={v}
              onClick={() => toolbar.onView(v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                toolbar.view === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <style>{`
        .rbc-calendar {
          background: transparent;
        }
        .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          color: var(--tw-prose-body);
          background: var(--tw-prose-bg);
          border-color: var(--tw-prose-border);
        }
        .rbc-today {
          background-color: rgba(59, 130, 246, 0.1);
        }
        .rbc-off-range-bg {
          background-color: rgba(156, 163, 175, 0.1);
        }
        .rbc-event {
          cursor: pointer;
        }
        .rbc-event:hover {
          opacity: 1 !important;
        }
      `}</style>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
          }}
        />

        {/* Event Details Modal */}
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedEvent.title}
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Date:</strong> {moment(selectedEvent.start).format('MMMM D, YYYY')}
                </p>
                <p>
                  <strong>Type:</strong> {selectedEvent.type}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {[
          { label: 'Lease Start', color: 'bg-green-500' },
          { label: 'Lease End', color: 'bg-yellow-500' },
          { label: 'Payment Paid', color: 'bg-blue-500' },
          { label: 'Payment Due', color: 'bg-red-500' },
          { label: 'Maintenance', color: 'bg-purple-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaseCalendar;
