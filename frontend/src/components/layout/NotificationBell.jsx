import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Calendar, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : `${dateString}Z`);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'AppointmentCreated':
    case 'AppointmentConfirmed':
      return { icon: Calendar, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    case 'AppointmentCancelled':
      return { icon: AlertCircle, color: 'text-rose-700 bg-rose-50 border-rose-100' };
    case 'PaymentProofSubmitted':
      return { icon: CreditCard, color: 'text-amber-700 bg-amber-50 border-amber-100' };
    case 'PaymentVerified':
      return { icon: Check, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    case 'PaymentRejected':
      return { icon: AlertCircle, color: 'text-rose-700 bg-rose-50 border-rose-100' };
    case 'PaymentRefunded':
      return { icon: RefreshCw, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' };
    case 'AppointmentReminder24H':
    case 'AppointmentReminder2H':
      return { icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-100' };
    default:
      return { icon: Bell, color: 'text-primary-rose bg-soft-blush border-rose-100' };
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const popoverRef = useRef(null);

  const role = user?.role || 'User';
  const isSuperAdmin = role === 'SuperAdmin';

  // 1. Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user || isSuperAdmin) return;
    try {
      const res = await notificationService.getUnreadCountByRole(role);
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Gracefully ignore background count failures
    }
  }, [user, role, isSuperAdmin]);

  // 2. Initial count + sync on navigation
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, location.pathname]);

  // 3. Lightweight 30-second polling
  useEffect(() => {
    if (!user || isSuperAdmin) return;
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, user, isSuperAdmin]);

  // 4. Load notification list when popover is toggled open
  const loadNotifications = async () => {
    if (!user || isSuperAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotificationsByRole(role, { take: 30 });
      setNotifications(Array.isArray(data) ? data : []);
      // Also refresh the count
      const countRes = await notificationService.getUnreadCountByRole(role);
      if (countRes && typeof countRes.unreadCount === 'number') {
        setUnreadCount(countRes.unreadCount);
      }
    } catch (err) {
      setError(err?.message || 'Could not load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (e, notification) => {
    e.stopPropagation();
    if (notification.isRead) return;

    try {
      await notificationService.markAsReadByRole(role, notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Failed to mark as read
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsReadByRole(role);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Failed to mark all as read
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Navigate to appointment or relevant page
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsReadByRole(role, notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // Continue navigation even if mark read network call fails
      }
    }

    setIsOpen(false);

    // Role-based target navigation
    const isAdmin = role === 'Admin' || role === 'SalonAdmin';
    if (isAdmin) {
      navigate('/admin/appointments');
    } else {
      if (notification.type?.startsWith('Payment')) {
        navigate('/my-bookings?tab=payments');
      } else {
        navigate('/my-bookings?tab=appointments');
      }
    }
  };

  if (isSuperAdmin) {
    return null;
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications (${unreadCount} unread)`}
        className="text-muted hover:text-primary-rose transition-colors relative p-2 rounded-full hover:bg-soft-blush focus:outline-none focus:ring-2 focus:ring-primary-rose/40"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 bg-primary-rose text-white text-[11px] font-bold rounded-full border-2 border-white flex items-center justify-center shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-border-color z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Notification Center"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-ivory border-b border-border-color flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-medium text-deep-plum text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-soft-blush text-primary-rose text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="text-xs text-primary-rose hover:text-deep-plum font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-deep-plum p-1 rounded-md hover:bg-soft-blush transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-border-color/60">
            {isLoading ? (
              <div className="p-8 flex flex-col items-center justify-center text-muted gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary-rose" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-600 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="text-xs text-primary-rose hover:underline font-medium"
                >
                  Retry loading
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-soft-blush flex items-center justify-center text-primary-rose mb-3">
                  <Bell className="h-6 w-6 opacity-60" />
                </div>
                <p className="text-sm font-medium text-deep-plum mb-1">All caught up!</p>
                <p className="text-xs text-muted max-w-[14rem]">
                  No notifications to display right now. New booking and payment alerts will show up here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const iconInfo = getNotificationIcon(item.type);
                const IconComponent = iconInfo.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start group relative hover:bg-soft-blush/40 ${
                      item.isRead ? 'bg-white opacity-85' : 'bg-soft-blush/25'
                    }`}
                  >
                    {/* Unread Indicator Bar */}
                    {!item.isRead && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 bg-primary-rose rounded-r-full" />
                    )}

                    {/* Icon Badge */}
                    <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${iconInfo.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className={`text-xs truncate ${item.isRead ? 'font-medium text-deep-plum' : 'font-semibold text-deep-plum'}`}>
                          {item.subject}
                        </p>
                        <span className="text-[10px] text-muted shrink-0">
                          {formatRelativeTime(item.createdAtUtc)}
                        </span>
                      </div>

                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Quick Mark-Read Button */}
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(e, item)}
                        title="Mark as read"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-primary-rose rounded-md hover:bg-white shrink-0"
                        aria-label="Mark notification as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted/40 group-hover:text-primary-rose shrink-0 self-center transition-colors" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-ivory/60 border-t border-border-color text-center">
              <span className="text-[11px] text-muted">
                Showing recent {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
