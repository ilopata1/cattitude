import { Component, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AlertController, IonContent } from '@ionic/angular';
import { resolveAskSuggestions } from '../../core/guide/ask-suggestions';
import { chatMarkdownHtml } from '../../core/guide/chat-markdown';
import { ChatService } from '../../core/services/chat.service';
import { ContentService } from '../../core/services/content.service';
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

  expandedSourceKey: string | null = null;

  @ViewChild(IonContent) private ionContent?: IonContent;

  constructor(
    public readonly chat: ChatService,
    private readonly content: ContentService,
    private readonly sanitizer: DomSanitizer,
    private readonly alerts: AlertController,
  ) {}

  ionViewDidEnter(): void {
    void this.scrollToLatest();
  }

  get suggestions(): string[] {
    const bootstrap = this.content.bootstrap;
    return resolveAskSuggestions(bootstrap.ui.askSuggestions, bootstrap.systems);
  }

  async send(): Promise<void> {
    const question = this.draft;
    this.draft = '';
    this.expandedSourceKey = null;
    await this.scrollToLatest();
    await this.chat.send(question);
    await this.scrollToLatest();
  }

  onDraftKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) {
      return;
    }
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void this.send();
  }

  markdown(source: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(chatMarkdownHtml(source));
  }

  async clear(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Clear this conversation?',
      message: 'The questions and answers on this screen will be removed.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.chat.clearHistory();
            this.expandedSourceKey = null;
          },
        },
      ],
    });
    await alert.present();
  }

  private async scrollToLatest(): Promise<void> {
    await this.ionContent?.scrollToBottom(200);
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
