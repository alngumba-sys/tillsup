import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Check, Info, MapPin, Lightbulb, Store, Package, BarChart3, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalkthroughStep {
  id: number;
  icon: any;
  title: string;
  description: string;
  action: string;
  location: string;
  proTip: string;
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: 1,
    icon: Store,
    title: "Welcome to Tillsup",
    description: "Your all-in-one enterprise POS solution designed for modern businesses. Tillsup helps you manage sales, inventory, staff, and finances with powerful features including geolocation-based attendance, real-time reporting, and multi-branch support.",
    action: "Click 'Next' to begin the guided tour",
    location: "Tutorial Modal",
    proTip: "You can exit this tutorial at any time and restart it later from the help icon in the header.",
  },
  {
    id: 2,
    icon: Store,
    title: "POS Terminal",
    description: "Process sales quickly and efficiently with our intuitive point-of-sale interface. Features include barcode scanning for instant product lookup, multiple payment methods (Cash, M-PESA, Card), receipt generation, and real-time inventory updates. Perfect for high-volume retail environments.",
    action: "Navigate to 'POS' in the left sidebar to access the terminal",
    location: "Left Sidebar → POS",
    proTip: "Press Enter after scanning to complete sales instantly. Use the search bar for manual product lookup when barcodes aren't available.",
  },
  {
    id: 3,
    icon: Package,
    title: "Inventory Management",
    description: "Take full control of your stock with comprehensive inventory tools. Add new products with detailed information including SKU, barcode, pricing, and categories. Track stock levels in real-time across all branches, set automatic low-stock alerts, and import products in bulk using Excel files for faster setup.",
    action: "Select 'Inventory' from the sidebar to manage your products",
    location: "Left Sidebar → Inventory",
    proTip: "Set up low-stock alerts to get notified before items run out. Use categories to organize products for easier searching and reporting.",
  },
  {
    id: 4,
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Make data-driven decisions with detailed sales analytics and business insights. View daily, weekly, and monthly revenue trends, identify top-selling products, analyze sales by branch, and monitor staff performance. Export reports to Excel for further analysis and accounting purposes.",
    action: "Open 'Reports' from the sidebar to view analytics",
    location: "Left Sidebar → Reports",
    proTip: "Use the date range filter to compare performance across different periods. Export reports regularly for financial record-keeping.",
  },
  {
    id: 5,
    icon: Users,
    title: "Staff & Branch Management",
    description: "Efficiently manage your team and locations with role-based access control. Create staff accounts with specific permissions (Business Owner, Manager, Cashier), assign employees to branches, and track their activity. Set up multiple branch locations with individual settings and reporting for complete business oversight.",
    action: "Access 'Staff' or 'Branches' in the sidebar to manage your team",
    location: "Left Sidebar → Staff/Branches",
    proTip: "Assign appropriate roles to control what each staff member can access. Managers can only see data from their assigned branch for security.",
  },
  {
    id: 6,
    icon: Clock,
    title: "Attendance Tracking",
    description: "Monitor employee attendance with GPS-verified clock in/out functionality. Staff members can clock in when they arrive and clock out when they leave. The system automatically verifies their location to ensure they're at the correct branch, prevents time fraud, and generates attendance reports for payroll processing.",
    action: "Click the clock icon in the top navigation bar to clock in/out",
    location: "Top Navigation Bar",
    proTip: "Location verification ensures employees are physically present at the branch. View attendance history in the Staff section for payroll calculations.",
  },
  {
    id: 7,
    icon: Check,
    title: "You're All Set!",
    description: "You've completed the Tillsup walkthrough! You're now ready to start managing your business with confidence. Explore each feature at your own pace, and remember that help is always available. Your data is securely stored in the cloud and automatically synced across all devices.",
    action: "Click 'Complete' to close this tutorial and start using Tillsup",
    location: "Tutorial Modal",
    proTip: "Need help? Click the help icon in the header anytime to restart this tutorial or contact support for assistance.",
  },
];

export function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const totalSteps = walkthroughSteps.length;
  const currentStepData = walkthroughSteps[currentStep];
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCompletedSteps([]);
    }
  }, [isOpen]);

  // Mark current step as completed when moving forward
  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
      toast.success(`Step ${currentStep + 1} completed!`, {
        duration: 2000,
      });
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    toast.success("🎉 Walkthrough completed! Welcome to Tillsup!", {
      duration: 3000,
    });
    onClose();
  };

  const handleClose = () => {
    if (currentStep > 0) {
      toast.info("Tutorial paused. Click the help icon to continue anytime.", {
        duration: 3000,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tillsup Blue Header Accent */}
          <div className="h-1 bg-[#0891b2]" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-700"
            aria-label="Close tutorial"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-8 pb-6">
            {/* Step Counter */}
            <div className="text-center mb-5">
              <span className="inline-block px-4 py-1.5 bg-[#0891b2] text-white rounded-full text-xs font-bold tracking-wide">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>

            {/* Icon */}
            <div className="text-center mb-5">
              
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3 leading-tight">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed max-w-xl mx-auto">
              {currentStepData.description}
            </p>

            {/* Action Box */}
            <div className="bg-[#f0f9ff] border border-[#0891b2]/30 rounded-xl p-3.5 mb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0891b2] flex items-center justify-center">
                  <Info className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-[#0891b2] mb-1 uppercase tracking-wide">Next Action</h3>
                  <p className="text-gray-800 text-sm leading-relaxed">{currentStepData.action}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-500" strokeWidth={2} />
                <span className="font-medium">{currentStepData.location}</span>
              </div>
            </div>

            {/* Pro Tip */}
            {currentStepData.proTip && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5 text-amber-600" strokeWidth={2} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-amber-900 mb-1 uppercase tracking-wide">Pro Tip</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">{currentStepData.proTip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
            {/* Navigation Dots */}
            <div className="flex justify-center gap-2.5 mb-6">
              {walkthroughSteps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    className={`
                      w-12 h-12 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center
                      ${isCurrent
                        ? 'bg-[#0891b2] text-white scale-110 shadow-lg ring-4 ring-[#0891b2]/20' 
                        : isCompleted
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                        : 'bg-white text-gray-400 hover:bg-gray-100 border-2 border-gray-300'
                      }
                    `}
                    aria-label={`Go to step ${index + 1}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
                  ${currentStep === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300 shadow-sm hover:shadow-md'
                  }
                `}
                aria-label="Previous step"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentStep === totalSteps - 1 ? (
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm bg-[#0891b2] text-white hover:bg-[#0e7490] transition-all shadow-md hover:shadow-lg hover:scale-105"
                  aria-label="Complete tutorial"
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                  <span>Get Started</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm bg-[#0891b2] text-white hover:bg-[#0e7490] transition-all shadow-md hover:shadow-lg hover:scale-105"
                  aria-label="Next step"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}