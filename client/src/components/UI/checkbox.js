import React from 'react';

export const Checkbox = ({ id, checked, onCheckedChange, className, children }) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="form-checkbox h-5 w-5 text-blue-600"
      />
      {children && <label htmlFor={id} className="ml-2">{children}</label>}
    </div>
  );
};
