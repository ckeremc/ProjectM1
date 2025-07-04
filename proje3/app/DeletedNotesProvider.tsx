import React, { createContext, useContext, useState } from 'react';

export type Note = {
  id: string;
  text: string;
  done: boolean;
  type: string;
  folderId: string;
  hasCounter: boolean;
  counter: number;
  hasCountdown: boolean;
  countdown: number;
  countdownEnd: number | null;
  reminder: string;
  hasChecklist: boolean;
  checklist: any[];
  reminderDate: number | null;
  priority?: 'Low' | 'Medium' | 'High';
};

type DeletedNotesContextType = {
  deletedNotes: Note[];
  addDeletedNote: (note: Note) => void;
  permanentlyDeleteNote: (id: string) => void;
};

const DeletedNotesContext = createContext<DeletedNotesContextType>({
  deletedNotes: [],
  addDeletedNote: () => {},
  permanentlyDeleteNote: () => {},
});

export const useDeletedNotes = () => useContext(DeletedNotesContext);

export const DeletedNotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deletedNotes, setDeletedNotes] = useState<Note[]>([]);

  const addDeletedNote = (note: Note) => {
    setDeletedNotes(prev => [note, ...prev]);
  };

  const permanentlyDeleteNote = (id: string) => {
    setDeletedNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <DeletedNotesContext.Provider value={{ deletedNotes, addDeletedNote, permanentlyDeleteNote }}>
      {children}
    </DeletedNotesContext.Provider>
  );
}; 