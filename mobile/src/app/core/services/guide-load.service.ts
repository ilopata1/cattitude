import { Injectable } from '@angular/core';
import { GuideLoadError, GuideLoadFailure } from './content.service';

@Injectable({ providedIn: 'root' })
export class GuideLoadService {
  private failedSlug: string | null = null;
  private failureMessage: string | null = null;
  private failureKind: GuideLoadFailure | null = null;

  get hasError(): boolean {
    return this.failedSlug !== null;
  }

  get slug(): string | null {
    return this.failedSlug;
  }

  get message(): string | null {
    return this.failureMessage;
  }

  get failure(): GuideLoadFailure | null {
    return this.failureKind;
  }

  setError(slug: string, error: unknown): void {
    this.failedSlug = slug;
    if (error instanceof GuideLoadError) {
      this.failureKind = error.failure;
      this.failureMessage = error.message;
      return;
    }
    this.failureKind = 'failed';
    this.failureMessage =
      error instanceof Error ? error.message : 'Unable to load vessel guide.';
  }

  clearError(): void {
    this.failedSlug = null;
    this.failureMessage = null;
    this.failureKind = null;
  }
}
