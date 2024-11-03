// components/PremiumFeatureModal.js
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./UI/dialog";
import { Button } from "./UI/button";
import { Clock } from "lucide-react";
import { useTheme } from './ThemeContext';

const PremiumFeatureModal = ({ isOpen, onClose, featureName }) => {
  const { theme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${theme.secondary} border-0 p-6 rounded-lg max-w-md bg-opacity-100`}>
        <DialogHeader className="space-y-3 mb-4">
          <DialogTitle className={`text-xl font-bold ${theme.primary} flex items-center gap-2`}>
            <Clock className="w-6 h-6" />
            Coming Soon ✨
          </DialogTitle>
        </DialogHeader>
        <div className="py-3">
          <p className={`${theme.text} text-base leading-relaxed`}>
            {featureName} feature will be available in a future update.
            <br />
            Stay tuned!
          </p>
        </div>
        <DialogFooter className="mt-4">
          <Button 
            onClick={onClose}
            className={`${theme.button} px-8 py-2`}
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumFeatureModal;