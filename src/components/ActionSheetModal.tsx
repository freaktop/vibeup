import './ActionSheetModal.css';

interface ActionSheetModalProps {
  isOpen: boolean;
  title?: string;
  options: string[];
  onSelect: (option: string) => void;
  onClose: () => void;
}

export default function ActionSheetModal({
  isOpen,
  title = 'Actions',
  options,
  onSelect,
  onClose,
}: ActionSheetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
        <h3 className="action-sheet-title">{title}</h3>
        <div className="action-sheet-options">
          {options.map((option) => (
            <button
              key={option}
              className="action-sheet-option"
              onClick={() => {
                onSelect(option);
                onClose();
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <button className="action-sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
