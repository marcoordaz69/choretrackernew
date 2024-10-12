import React from 'react';
import { XIcon, TrashIcon } from 'lucide-react';

const EditChoresModal = ({ chores, onClose, onDeleteChore }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Chores</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon size={24} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(chores).map(([day, dayChores]) => (
            <div key={day} className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{day}</h3>
              {dayChores.map((chore, index) => (
                <div key={`${day}-${index}`} className="flex items-center justify-between bg-gray-800 p-2 rounded mb-2">
                  <span>{chore}</span>
                  <button
                    onClick={() => onDeleteChore(`${day}-${chore}`)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditChoresModal;