import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CalendarPickerProps {
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  completions: { [dateKey: string]: { completed: boolean; guesses?: number; solution?: string } };
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ onClose, onSelectDate, completions }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const getCompletionStatus = (date: Date): 'completed' | 'not-completed' | 'future' => {
    const dateKey = getDateKey(date);
    if (isFutureDate(date)) return 'future';
    
    // Debug logging
    console.log('Checking completion for date:', date.toDateString(), 'key:', dateKey, 'completions:', completions);
    
    if (completions[dateKey]?.completed) {
      console.log('Found completed date:', dateKey);
      return 'completed';
    }
    return 'not-completed';
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const completionStatus = getCompletionStatus(date);
      const isSelected = selectedDate.getDate() === day && 
                       selectedDate.getMonth() === currentMonth && 
                       selectedDate.getFullYear() === currentYear;

      let dayClasses = "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ";
      
      if (isSelected) {
        dayClasses += "bg-blue-600 text-white";
      } else if (isToday(date)) {
        // Current day: blue if not completed, green if completed
        if (completionStatus === 'completed') {
          dayClasses += "bg-green-600 text-white";
        } else {
          dayClasses += "bg-blue-500 text-white";
        }
      } else if (completionStatus === 'completed') {
        dayClasses += "bg-green-600 text-white hover:bg-green-700";
      } else if (completionStatus === 'not-completed') {
        dayClasses += "bg-red-600 text-white hover:bg-red-700";
      } else if (completionStatus === 'future') {
        dayClasses += "bg-gray-800 text-gray-500 cursor-not-allowed";
      }

      days.push(
        <div
          key={day}
          className={dayClasses}
          onClick={() => {
            if (completionStatus !== 'future') {
              setSelectedDate(date);
            }
          }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const handlePlay = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-white" 
          onClick={onClose} 
          aria-label="Close calendar"
        >
          <X className="h-6 w-6"/>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Word of the Day</h2>
          <p className="text-gray-300 text-sm">Select a date to play</p>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-center mb-4">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-xs text-gray-300">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-xs text-gray-300">Not completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-300">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
            <span className="text-xs text-gray-300">Future</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handlePlay}
            disabled={getCompletionStatus(selectedDate) === 'future'}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            PLAY
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded font-medium hover:bg-gray-700 transition-colors"
          >
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
};
