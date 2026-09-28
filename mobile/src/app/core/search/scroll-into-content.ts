import { IonContent } from '@ionic/angular';

/** Scroll an element inside ion-content into view once it has been rendered. */
export function scrollToElement(content: IonContent | undefined, id: string): void {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el || !content) {
      return;
    }
    void content.getScrollElement().then((scrollEl) => {
      const top =
        el.getBoundingClientRect().top -
        scrollEl.getBoundingClientRect().top +
        scrollEl.scrollTop;
      void content.scrollToPoint(0, Math.max(0, top - 8), 250);
    });
  }, 60);
}
