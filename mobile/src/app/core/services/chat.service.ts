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

    const vesselId = this.vesselContext.vesselId;
    if (!vesselId) {
      this.history.push({
        role: 'user',
        content: trimmed,
      });
      this.history.push({
        role: 'assistant',
        content:
          'Ask needs an active vessel. Open this app from a vessel link so questions stay limited to that boat’s manuals.',
      });
      return;
    }

    this.history.push({ role: 'user', content: trimmed });
    this.busy = true;

    try {
      const body: Record<string, unknown> = {
        question: trimmed,
        vessel_id: vesselId,
        conversation_history: this.history.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

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

    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as {
        error?: { detail?: string | Array<{ msg?: string }> };
        status?: number;
      };
      const detail = this.detailMessage(err.error?.detail);
      if (err.status === 422) {
        return (
          detail ||
          'Your question could not be processed. Try rephrasing it.'
        );
      }
      if (err.status === 502 || err.status === 504) {
        return 'That question took too long for the manual service. Try a shorter or more specific question.';
      }
      if (err.status === 500) {
        return (
          detail ||
          'The manual service returned an error. Check Railway logs for the backend.'
        );
      }
      if (err.status === 0) {
        return 'Sorry — something went wrong reaching the manual service. Try again in a moment.';
      }
      if (detail) {
        return detail;
      }
    }

    return 'Sorry — something went wrong reaching the manual service. Try again in a moment.';
  }

  private detailMessage(
    detail: string | Array<{ msg?: string }> | undefined,
  ): string | undefined {
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
    if (Array.isArray(detail) && detail.length) {
      const parts = detail
        .map((item) => (typeof item?.msg === 'string' ? item.msg.trim() : ''))
        .filter(Boolean);
      if (parts.length) {
        return parts.join(' ');
      }
    }
    return undefined;
  }
}
