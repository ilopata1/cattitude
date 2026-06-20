import { Component } from '@angular/core';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage } from '../../core/models/bootstrap-content.model';

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
    await this.chat.send(question);
  }

  useSuggestion(text: string): void {
    this.draft = text;
    void this.send();
  }

  toggleSource(message: ChatMessage, index: number): void {
    const key = `${message.content.slice(0, 20)}-${index}`;
    this.expandedSourceKey = this.expandedSourceKey === key ? null : key;
  }

  sourceKey(message: ChatMessage, index: number): string {
    return `${message.content.slice(0, 20)}-${index}`;
  }
}
