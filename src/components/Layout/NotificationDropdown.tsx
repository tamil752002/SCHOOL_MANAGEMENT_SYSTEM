import { AlertCircle, Bell, CheckCircle, Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
}

export function NotificationDropdown({
    isOpen,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead
}: NotificationDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    return (
        <div
            ref={dropdownRef}
            className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Action Bar with Mark All as Read button */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className={`px-3 py-1 rounded text-sm ${unreadCount > 0
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Mark all as read
                </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p>No notifications</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                            onClick={() => onMarkAsRead(notification.id)}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className={`text-sm font-medium ${!notification.read
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {notification.title}
                                        </h4>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                    <p className={`text-sm ${!notification.read
                                        ? 'text-gray-700 dark:text-gray-300'
                                        : 'text-gray-500 dark:text-gray-500'
                                        }`}>
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {formatTime(notification.timestamp)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 