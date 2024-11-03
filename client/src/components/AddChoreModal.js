import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./UI/dialog";
import { Button } from "./UI/button";
import { Input } from "./UI/input";
import { Label } from "./UI/label";
import { Switch } from "./UI/switch";
import { CalendarIcon, X, Check } from "lucide-react";
import { format } from 'date-fns';

const AddChoreModal = ({ isOpen, onClose, onAddChore, newChore, setNewChore, daysOfWeek, theme, selectedDate }) => {
  useEffect(() => {
    if (isOpen && selectedDate) {
      setNewChore(prev => ({
        ...prev,
        date: format(new Date(selectedDate), 'yyyy-MM-dd')
      }));
    }
  }, [isOpen, selectedDate, setNewChore]);

  // Ensure daysOfWeek is initialized if undefined
  useEffect(() => {
    if (!newChore.daysOfWeek) {
      setNewChore(prev => ({ ...prev, daysOfWeek: [] }));
    }
  }, [newChore, setNewChore]);

  // Validation logic for user feedback
  const handleAddChore = () => {
    if (newChore.isRecurring && (!newChore.daysOfWeek || newChore.daysOfWeek.length === 0)) {
      alert("Please select at least one day for the recurring chore.");
      return;
    }
    onAddChore();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${theme.secondary} border border-${theme.accent} rounded-lg shadow-lg max-w-sm mx-auto p-4`}>
        <DialogHeader className="pb-2">
          <DialogTitle className={`text-lg font-semibold ${theme.text}`}>Add New Chore</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="choreName" className={`text-xs font-medium ${theme.text}`}>Chore Name</Label>
            <Input
              id="choreName"
              value={newChore.name}
              onChange={(e) => setNewChore(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter chore name"
              className={`mt-1 w-full px-2 py-1 bg-${theme.tertiary} border border-${theme.accent} rounded text-sm text-${theme.text} placeholder-${theme.textMuted}`}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isRecurring" className={`text-xs ${theme.text}`}>Recurring</Label>
            <Switch
              id="isRecurring"
              checked={newChore.isRecurring}
              onCheckedChange={(checked) => setNewChore(prev => ({ ...prev, isRecurring: checked }))}
              className={`bg-${theme.accent}`}
            />
          </div>
          {newChore.isRecurring ? (
            <div className={`bg-${theme.tertiary} p-2 rounded border border-${theme.accent}`}>
              <p className={`text-xs font-medium ${theme.text} mb-1`}>Select days:</p>
              <div className="flex flex-wrap gap-1">
                {daysOfWeek.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setNewChore(prev => ({
                        ...prev,
                        daysOfWeek: prev.daysOfWeek.includes(day)
                          ? prev.daysOfWeek.filter(d => d !== day)
                          : [...prev.daysOfWeek, day]
                      }));
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      newChore.daysOfWeek.includes(day)
                        ? `bg-${theme.accent} text-${theme.secondary}`
                        : `bg-${theme.secondary} text-${theme.text} border border-${theme.accent}`
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="choreDate" className={`text-xs font-medium ${theme.text}`}>Date</Label>
              <div className="relative mt-1">
                <CalendarIcon className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-${theme.accent}`} size={14} />
                <Input
                  id="choreDate"
                  type="date"
                  value={newChore.date}
                  onChange={(e) => setNewChore(prev => ({ ...prev, date: e.target.value }))}
                  required={!newChore.isRecurring}
                  className={`w-full pl-8 pr-2 py-1 bg-${theme.tertiary} border border-${theme.accent} rounded text-sm text-${theme.text}`}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex justify-end space-x-2">
          <Button
            onClick={onClose}
            variant="outline"
            className={`px-3 py-1 text-sm border border-${theme.accent} text-${theme.text} hover:bg-${theme.accent} hover:text-${theme.secondary} transition duration-200`}
          >
            <X size={14} className="mr-1" /> Cancel
          </Button>
          <Button
            onClick={handleAddChore}
            className={`px-3 py-1 text-sm bg-${theme.accent} text-${theme.secondary} hover:bg-${theme.accentHover} transition duration-200`}
          >
            <Check size={14} className="mr-1" /> Add Chore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddChoreModal;