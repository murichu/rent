import React, { useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const ProductTour = ({ run = false, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Haven! 🏠</h2>
          <p className="text-gray-600">Your property management system</p>
          <p className="mt-2">Let's take a quick tour to help you get started.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="command-palette"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Command Palette ⌨️</h3>
          <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded">Cmd+K</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+K</kbd> to quickly navigate anywhere or perform actions.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Notifications 🔔</h3>
          <p>Stay updated with real-time notifications for payments, leases, and maintenance requests.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Dashboard 📊</h3>
          <p>View all your key metrics at a glance. Drag and drop widgets to customize your layout!</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="properties"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Properties 🏢</h3>
          <p>Manage all your properties here. Switch between list, grid, and map views.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="dark-mode"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Dark Mode 🌙</h3>
          <p>Toggle between light and dark themes for comfortable viewing any time of day.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-2xl font-bold mb-2">You're All Set! 🎉</h2>
          <p>You can replay this tour anytime from Settings → Help.</p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status, index } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setStepIndex(0);
      if (onComplete) onComplete();
    } else {
      setStepIndex(index);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};

export default ProductTour;
