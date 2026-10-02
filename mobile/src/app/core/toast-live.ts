import { ToastOptions } from '@ionic/angular';

/**
 * Marks a toast as a live region. Warnings and errors interrupt;
 * other notices wait for a pause in speech.
 */
export function liveToast(options: ToastOptions): ToastOptions {
  const urgent = options.color === 'warning' || options.color === 'danger';
  return {
    ...options,
    htmlAttributes: {
      ...options.htmlAttributes,
      role: urgent ? 'alert' : 'status',
      'aria-live': urgent ? 'assertive' : 'polite',
      'aria-atomic': 'true',
    },
  };
}
