import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useLayoutEffect(() => {
    if (isOpen && step?.selector) {
      try {
        const element = document.querySelector(step.selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
           // If element is not found (e.g., dashboard not rendered yet), skip to next
           handleNext(true);
        }
      } catch(e) {
          console.error("Tour selector error:", e);
          handleNext(true);
      }
    }
  }, [currentStep, isOpen, step?.selector]);
  
  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
        if (isOpen && step?.selector) {
            const element = document.querySelector(step.selector);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
            }
        }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, step?.selector]);

  const handleNext = (skip = false) => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleClose = () => {
    onClose();
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleClose();
      }
      if (e.key === 'ArrowRight') {
        handleNext();
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen || !step || !targetRect) {
    return null;
  }
  
  const popoverStyle: React.CSSProperties = {};
  const position = step.position || 'bottom';
  const margin = 15;

  switch (position) {
    case 'top':
      popoverStyle.top = `${targetRect.top - margin}px`;
      popoverStyle.left = `${targetRect.left + targetRect.width / 2}px`;
      popoverStyle.transform = 'translate(-50%, -100%)';
      break;
    case 'left':
      popoverStyle.top = `${targetRect.top + targetRect.height / 2}px`;
      popoverStyle.left = `${targetRect.left - margin}px`;
      popoverStyle.transform = 'translate(-100%, -50%)';
      break;
    case 'right':
      popoverStyle.top = `${targetRect.top + targetRect.height / 2}px`;
      popoverStyle.left = `${targetRect.right + margin}px`;
      popoverStyle.transform = 'translateY(-50%)';
      break;
    default: // bottom
      popoverStyle.top = `${targetRect.bottom + margin}px`;
      popoverStyle.left = `${targetRect.left + targetRect.width / 2}px`;
      popoverStyle.transform = 'translateX(-50%)';
      break;
  }


  return (
    <>
      <div 
        className="tour-highlight-box"
        style={{
          width: `${targetRect.width + 10}px`,
          height: `${targetRect.height + 10}px`,
          top: `${targetRect.top - 5}px`,
          left: `${targetRect.left - 5}px`,
        }}
      />
      <div 
        className="tour-popover"
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-sky-300">{step.title}</h3>
            <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
              <X size={20} />
            </button>
        </div>
        <p className="text-sm text-gray-300 mb-4">{step.content}</p>
        <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{currentStep + 1} / {steps.length}</span>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button onClick={handlePrev} className="tour-button-secondary">قبلی</button>
                )}
                <button onClick={() => handleNext()} className="tour-button-primary">
                    {currentStep === steps.length - 1 ? 'پایان' : 'بعدی'}
                </button>
            </div>
        </div>
      </div>
    </>
  );
};
