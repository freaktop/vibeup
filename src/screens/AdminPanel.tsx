import React, { useState, useEffect } from 'react';
import { Report } from '../types';
import { useToast } from '../hooks/useToast';
import { clearAllReports, listenReports, resolveReport as resolveReportById } from '../firestore';
import './AdminPanel.css';

export default function AdminPanel() {
  const { showToast, ToastContainer } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = listenReports((rows) => {
      setReports(rows);
    });

    return () => unsubscribe();
  }, []);

  const resolveReport = (reportId: string) => {
    resolveReportById(reportId).catch(() => {
      showToast('Unable to resolve report right now.', 'error');
    });
  };

  const clearAll = () => {
    clearAllReports()
      .then(() => {
        setReports([]);
        setShowClearConfirm(false);
        showToast('All reports cleared.', 'success');
      })
      .catch(() => {
        showToast('Unable to clear reports right now.', 'error');
      });
  };

  return (
    <div className="admin-container">
      <ToastContainer />
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button className="admin-clear-btn" onClick={() => setShowClearConfirm(true)}>
          Clear Reports
        </button>
      </div>

      <div className="admin-section">
        <h3>Reports</h3>
        {reports.length === 0 ? (
          <div className="admin-empty">No reports yet.</div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className={`admin-report ${report.status}`}>
              <div className="admin-report-header">
                <span className="admin-report-type">{report.type.toUpperCase()}</span>
                <span className={`admin-report-status ${report.status}`}>{report.status}</span>
              </div>
              <div className="admin-report-target">
                {report.targetName || report.targetId || 'General'}
              </div>
              {report.reason && <div className="admin-report-reason">Reason: {report.reason}</div>}
              <div className="admin-report-meta">
                {new Date(report.createdAt).toLocaleString()}
              </div>
              {report.status === 'open' && (
                <button className="admin-action-btn" onClick={() => resolveReport(report.id)}>
                  Mark Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showClearConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="admin-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Clear all reports?</h3>
            <p>This action removes all current reports.</p>
            <div className="admin-modal-actions">
              <button className="admin-modal-btn cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="admin-modal-btn danger" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
