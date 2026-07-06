import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GuideLoadService {
  private failedSlug: string | null = null;
  private failureMessage: string | null = null;

  get hasError(): boolean {
    return this.failedSlug !== null;
  }

  get slug(): string | null {
    return this.failedSlug;
  }

  get message(): string | null {
    return this.failureMessage;
  }

  setError(slug: string, error: unknown): void {
    this.failedSlug = slug;
    this.failureMessage =
      error instanceof Error ? error.message : 'Unable to load vessel guide.';
  }

  clearError(): void {
    this.failedSlug = null;
    this.failureMessage = null;
  }
}
