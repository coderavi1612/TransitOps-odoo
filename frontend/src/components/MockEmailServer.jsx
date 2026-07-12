import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MockEmailServer() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState(() => {
    const saved = localStorage.getItem('transitops_mock_emails');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        subject: '[Action Required] Driver Driving License Expiring Soon',
        body: "Reminder: Driver Ananya Reddy's driving license (KA0120140056789) is scheduled to expire on 2030-12-31. Please initiate verification and renewal procedures.",
        from: 'compliance@transitops.com',
        to: 'safety@transitops.com',
        date: new Date(Date.now() - 3600000 * 2).toLocaleString(),
        path: '/drivers',
        read: false,
      },
      {
        id: '2',
        subject: '[Alert] Vehicle MH12AB1234 Maintenance Due',
        body: 'Vehicle Tata Prima 5530.S (MH12AB1234) has reached 84,210 km. A Routine Inspection is due in the next 15 days.',
        from: 'telematics@transitops.com',
        to: 'manager@transitops.com',
        date: new Date(Date.now() - 3600000 * 5).toLocaleString(),
        path: '/maintenance',
        read: false,
      }
    ];
  });

  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    localStorage.setItem('transitops_mock_emails', JSON.stringify(emails));
  }, [emails]);

  useEffect(() => {
    const handleNewEmail = (e) => {
      const { subject, body, from, to, path } = e.detail;
      const newEmail = {
        id: String(Date.now()),
        subject,
        body,
        from: from || 'system@transitops.com',
        to: to || 'all@transitops.com',
        date: new Date().toLocaleString(),
        path: path || '/',
        read: false,
      };
      setEmails(prev => [newEmail, ...prev]);
    };

    window.addEventListener('mock-email', handleNewEmail);
    return () => window.removeEventListener('mock-email', handleNewEmail);
  }, []);

  const unreadCount = emails.filter(e => !e.read).length;

  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
  };

  const handleDelete = (id, event) => {
    event.stopPropagation();
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
  };

  const handleClearAll = () => {
    setEmails([]);
    setSelectedEmail(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-body text-left">
      {/* Floating Mail Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all cursor-pointer relative"
      >
        <span className="material-symbols-outlined text-2xl">mail</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Email Inbox Panel Overlay */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 max-h-[500px] bg-surface-container-lowest border border-outline-variant/60 rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-outline-variant/40 bg-surface-container-low flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">dns</span>
                Mock SMTP Server
              </h3>
              <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Incoming Corporate Alerts</p>
            </div>
            <div className="flex gap-2 items-center">
              {emails.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-error font-bold px-2 py-1 rounded-md hover:bg-error/10 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Email View Body */}
          {selectedEmail ? (
            /* Email Detail View */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-[300px]">
              <button
                onClick={() => setSelectedEmail(null)}
                className="flex items-center gap-1 text-[10px] text-primary font-bold self-start hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">arrow_back</span>
                Back to Inbox
              </button>

              <div className="space-y-1.5 border-b border-outline-variant/40 pb-3">
                <h4 className="text-xs font-extrabold text-on-surface leading-snug">{selectedEmail.subject}</h4>
                <p className="text-[10px] text-on-surface-variant font-medium">From: <span className="font-mono">{selectedEmail.from}</span></p>
                <p className="text-[10px] text-on-surface-variant font-medium">To: <span className="font-mono">{selectedEmail.to}</span></p>
                <p className="text-[9px] text-outline font-medium">{selectedEmail.date}</p>
              </div>

              <div className="flex-1 text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap font-medium">
                {selectedEmail.body}
              </div>

              <div className="pt-4 border-t border-outline-variant/40 flex justify-end gap-2">
                <button
                  onClick={(e) => {
                    handleDelete(selectedEmail.id, e);
                  }}
                  className="px-3 py-1.5 text-[10px] text-error font-bold rounded-lg hover:bg-error/5 transition-colors border border-transparent"
                >
                  Delete
                </button>
                {selectedEmail.path && (
                  <button
                    onClick={() => {
                      navigate(selectedEmail.path);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 text-[10px] bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                    Navigate to Page
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Inbox List View */
            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30 min-h-[300px]">
              {emails.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <span className="material-symbols-outlined text-outline text-4xl">mail_outline</span>
                  <p className="text-xs text-on-surface-variant font-semibold">No incoming emails received</p>
                  <p className="text-[10px] text-outline font-medium">Actions like dispatching, completes, and maintenance trigger live SMTP logs.</p>
                </div>
              ) : (
                emails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3 text-xs flex gap-3 hover:bg-primary-fixed/20 transition-colors cursor-pointer relative ${!email.read ? 'bg-surface-container-low/40 font-bold' : 'font-medium'}`}
                  >
                    {!email.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5 pl-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[10px] text-primary truncate font-bold">{email.from}</p>
                        <p className="text-[9px] text-outline shrink-0 font-medium">{email.date.split(',')[1]?.trim() || email.date}</p>
                      </div>
                      <p className="text-on-surface truncate font-semibold">{email.subject}</p>
                      <p className="text-on-surface-variant text-[10px] line-clamp-1 opacity-80">{email.body}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(email.id, e)}
                      className="text-outline hover:text-error self-center p-1 rounded-md hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
