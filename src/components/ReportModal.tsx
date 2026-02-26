import { useState } from 'react';
import './ReportModal.css';

interface ReportModalProps {
  isOpen: boolean;
  profileName?: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

export default function ReportModal({ isOpen, profileName, onSubmit, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Report Profile</h3>
        <p>{profileName ? `Report ${profileName}` : 'Report this profile'} for violating guidelines.</p>
        <textarea
          className="report-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason"
          rows={4}
        />
        <div className="report-actions">
          <button className="report-btn cancel" onClick={onClose}>Cancel</button>
          <button
            className="report-btn submit"
            onClick={() => {
              onSubmit(reason.trim());
              setReason('');
              onClose();
            }}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
