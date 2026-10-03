import React from 'react';
import Modal from './Modal';
import { Download, ExternalLink } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, receiptUrl, title = 'Receipt Preview' }) {
  if (!receiptUrl) return null;

  const fullUrl = receiptUrl.startsWith('http')
    ? receiptUrl
    : `http://localhost:5000${receiptUrl}`;

  const isPdf = receiptUrl.toLowerCase().endsWith('.pdf');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="flex flex-col items-center">
        <div className="w-full max-h-[60vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2 mb-4">
          {isPdf ? (
            <iframe src={fullUrl} className="w-full h-96 rounded-lg" title="PDF Receipt" />
          ) : (
            <img
              src={fullUrl}
              alt="Expense Receipt"
              className="max-h-[55vh] object-contain rounded-lg shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x400?text=Receipt+Not+Available';
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 w-full justify-end">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open in New Tab
          </a>
          <a
            href={fullUrl}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      </div>
    </Modal>
  );
}
