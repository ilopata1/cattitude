import { AlertController, ToastController } from '@ionic/angular';
import { liveToast } from '../../../core/toast-live';
import { ProgressService } from '../../../core/services/progress.service';

/** Confirm a checklist clear, then offer undo for a few seconds. */
export async function confirmChecklistReset(
  alerts: AlertController,
  toasts: ToastController,
  progress: ProgressService,
  key: string,
): Promise<void> {
  const previous = progress.getChecklistState(key);
  const alert = await alerts.create({
    header: 'Reset this checklist?',
    message: 'Checked items will be cleared. You can undo for a few seconds.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Reset',
        role: 'destructive',
        handler: () => {
          progress.resetChecklist(key);
          void offerUndo(toasts, progress, key, previous);
        },
      },
    ],
  });
  await alert.present();
}

async function offerUndo(
  toasts: ToastController,
  progress: ProgressService,
  key: string,
  previous: Record<string, boolean>,
): Promise<void> {
  const toast = await toasts.create(liveToast({
    message: 'Checklist cleared',
    duration: 6000,
    position: 'bottom',
    buttons: [
      {
        text: 'Undo',
        handler: () => {
          progress.saveChecklistState(key, previous);
        },
      },
    ],
  }));
  await toast.present();
}
