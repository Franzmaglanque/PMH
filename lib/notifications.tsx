import { notifications as mantineNotifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

// Define the types of notifications your application supports
// This creates a contract that ensures you can only use notification types that actually exist
type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Define the configuration interface for your notification function
// This specifies exactly what parameters can be passed when showing a notification
interface ShowNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  autoClose?: number; // Optional - if not provided, we'll use defaults based on type
  withCloseButton?: boolean; // Optional - defaults to false for most types
}

// This function is the core of your notification system
// It takes a type and message, and handles all the styling decisions internally
export function showNotification({ 
  type, 
  title, 
  message, 
  autoClose, 
  withCloseButton 
}: ShowNotificationParams) {
  
  // Define configuration objects for each notification type
  // This is where all your design decisions live in one centralized place
  const notificationConfig = {
    success: {
      color: 'green',
      icon: <IconCheck size={18} />,
      defaultAutoClose: 3000,
      defaultCloseButton: false,
    },
    error: {
      color: 'red',
      icon: <IconX size={18} />,
      defaultAutoClose: 5000,
      defaultCloseButton: false,
    },
    warning: {
      color: 'orange',
      icon: <IconAlertCircle size={18} />,
      defaultAutoClose: 6000,
      defaultCloseButton: true,
    },
    info: {
      color: 'blue',
      icon: <IconInfoCircle size={18} />,
      defaultAutoClose: 4000,
      defaultCloseButton: false,
    },
  };

  // Get the configuration for the requested notification type
  // TypeScript ensures that 'type' is one of the valid types we defined above
  const config = notificationConfig[type];

  // Show the notification using Mantine's notification system
  // We're combining the configuration from our lookup object with any custom parameters
  mantineNotifications.show({
    title,
    message,
    color: config.color,
    icon: config.icon,
    autoClose: autoClose ?? config.defaultAutoClose, // Use custom value or default
    withCloseButton: withCloseButton ?? config.defaultCloseButton,
  });
}

// Create convenience functions for common notification scenarios
// These make your code even more readable by being explicit about intent
export function showSuccessNotification(title: string, message: string, autoClose?: number) {
  showNotification({ type: 'success', title, message, autoClose });
}

export function showErrorNotification(title: string, message: string, autoClose?: number) {
  showNotification({ type: 'error', title, message, autoClose });
}

export function showWarningNotification(title: string, message: string, autoClose?: number) {
  showNotification({ type: 'warning', title, message, autoClose });
}

export function showInfoNotification(title: string, message: string, autoClose?: number) {
  showNotification({ type: 'info', title, message, autoClose });
}