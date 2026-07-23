import { Component } from '@angular/core';
import { ChatService } from '../../core/services/chat.service';
import {
  ChatMessage,
  ChatSource,
  ChatSourceGroup,
} from '../../core/models/bootstrap-content.model';

@Component({
  selector: 'app-ask',
  templateUrl: './ask.page.html',
  styleUrls: ['./ask.page.scss'],
  standalone: false,
})
export class AskPage {
  draft = '';
  suggestions = [
    'How do I start the port engine?',
    'Where is the main DC panel?',
    'How does the watermaker work?',
  ];

  expandedSourceKey: string | null = null;

  constructor(public readonly chat: ChatService) {}

  async send(): Promise<void> {
    const question = this.draft;
    this.draft = '';
    this.expandedSourceKey = null;
    await this.chat.send(question);
  }

  useSuggestion(text: string): void {
    this.draft = text;
    void this.send();
  }

  sourceGroups(message: ChatMessage): ChatSourceGroup[] {
    return this.chat.groupSources(message.sources);
  }

  toggleSource(messageIndex: number, sourceIndex: number): void {
    const key = this.sourceKey(messageIndex, sourceIndex);
    this.expandedSourceKey = this.expandedSourceKey === key ? null : key;
  }

  sourceKey(messageIndex: number, sourceIndex: number): string {
    return `${messageIndex}-${sourceIndex}`;
  }

  expandedSnippet(
    message: ChatMessage,
    messageIndex: number,
  ): ChatSource | null {
    if (this.expandedSourceKey == null || !message.sources?.length) {
      return null;
    }
    const prefix = `${messageIndex}-`;
    if (!this.expandedSourceKey.startsWith(prefix)) {
      return null;
    }
    const sourceIndex = Number(this.expandedSourceKey.slice(prefix.length));
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0) {
      return null;
    }
    return message.sources[sourceIndex] ?? null;
  }

  /** Fallback when a group has no page numbers — toggle first untitled excerpt. */
  toggleUntitledGroup(
    messageIndex: number,
    group: ChatSourceGroup,
  ): void {
    const target =
      group.untitledSources[0] ?? group.pages[0] ?? null;
    if (!target) {
      return;
    }
    this.toggleSource(messageIndex, target.sourceIndex);
  }
}
