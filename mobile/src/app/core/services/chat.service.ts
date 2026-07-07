import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatMessage, ChatSource } from '../models/bootstrap-content.model';
import { environment } from '../../../environments/environment';
import { ContentService } from './content.service';
import { VesselContextService } from './vessel-context.service';

interface QueryResponse {
  answer: string;
  sources: ChatSource[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private history: ChatMessage[] = [];
  private busy = false;

  constructor(
    private readonly http: HttpClient,
    private readonly content: ContentService,
    private readonly vesselContext: VesselContextService,
  ) {}

  get messages(): ChatMessage[] {
    return this.history;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  clearHistory(): void {
    this.history = [];
  }

  async send(question: string): Promise<void> {
    const trimmed = question.trim();
    if (!trimmed || this.busy) {
      return;
    }

    this.history.push({ role: 'user', content: trimmed });
    this.busy = true;

    try {
      const body: Record<string, unknown> = {
        question: trimmed,
        conversation_history: this.history.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const vesselId = this.vesselContext.vesselId;
      if (vesselId) {
        body['vessel_id'] = vesselId;
      }

      const charterId = this.vesselContext.snapshot.charterId;
      if (charterId) {
        body['charter_id'] = charterId;
      }

      const response = await firstValueFrom(
        this.http.post<QueryResponse>(`${environment.apiUrl}/query`, body),
      );

      this.history.push({
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      });
    } catch (error: unknown) {
      const message = this.formatError(error);
      this.history.push({ role: 'assistant', content: message });
    } finally {
      this.busy = false;
    }
  }

  formatSourceLabel(source: ChatSource): string {
    const title =
      source.title?.trim() ||
      this.content.formatManualTitle(source.manual_id);
    const page = this.formatPageLabel(source.page_start, source.page_end);
    return page ? `${title} · ${page}` : title;
  }

  private formatPageLabel(
    pageStart?: number | null,
    pageEnd?: number | null,
  ): string | null {
    if (pageStart == null) {
      return null;
    }
    if (pageEnd != null && pageEnd !== pageStart) {
      return `pp. ${pageStart}–${pageEnd}`;
    }
    return `p. ${pageStart}`;
  }

  private formatError(error: unknown): string {
    if (!navigator.onLine) {
      return 'You appear to be offline. Connect to the internet to ask questions about the manuals.';
    }

    if (error && typeof error === 'object' && 'error' in error) {
      const err = error as { error?: { detail?: string }; status?: number };
      if (err.status === 422) {
        return 'Your question could not be processed. Try rephrasing it.';
      }
      if (err.status === 500) {
        return (
          err.error?.detail ||
          'The manual service returned an error. Check Railway logs for the backend.'
        );
      }
      if (err.error?.detail) {
        return err.error.detail;
      }
    }

    return 'Sorry — something went wrong reaching the manual service. Try again in a moment.';
  }
}
