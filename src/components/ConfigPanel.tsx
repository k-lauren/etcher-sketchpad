import { useState } from 'react';
import type { AppConfig, LayoutDirection, Provider, Theme } from '../types';

interface Props {
  config: AppConfig;
  onSave: (c: AppConfig) => void;
}

export function ConfigPanel({ config, onSave }: Props) {
  const [draft, setDraft] = useState<AppConfig>(config);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const update = (patch: Partial<AppConfig>) => setDraft({ ...draft, ...patch });
  const updateKey = (p: Provider, v: string) =>
    setDraft({ ...draft, apiKeys: { ...draft.apiKeys, [p]: v } });
  const updateModel = (p: Provider, v: string) =>
    setDraft({ ...draft, model: { ...draft.model, [p]: v } });

  const save = () => {
    onSave(draft);
    setSavedAt(Date.now());
  };

  return (
    <div className="config-page">
      <div className="config-card">
        <div>
          <h2 className="config-title">Configuration</h2>
          <p className="config-sub">
            Pick an inference provider and paste your API keys. Keys are stored in your
            browser's local storage and are never sent anywhere except the chosen provider.
          </p>
        </div>

        <div className="field">
          <label>Active Provider</label>
          <div className="provider-row">
            {(['deepseek', 'openai', 'claude'] as Provider[]).map((p) => (
              <button
                key={p}
                className={'provider-chip' + (draft.provider === p ? ' active' : '')}
                onClick={() => update({ provider: p })}
              >
                {p === 'deepseek' ? 'DeepSeek' : p === 'openai' ? 'OpenAI' : 'Claude'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>DeepSeek API Key</label>
          <input
            type="password"
            value={draft.apiKeys.deepseek}
            onChange={(e) => updateKey('deepseek', e.target.value)}
            placeholder="sk-..."
          />
          <input
            value={draft.model.deepseek}
            onChange={(e) => updateModel('deepseek', e.target.value)}
            placeholder="deepseek-chat"
          />
        </div>

        <div className="field">
          <label>OpenAI API Key</label>
          <input
            type="password"
            value={draft.apiKeys.openai}
            onChange={(e) => updateKey('openai', e.target.value)}
            placeholder="sk-..."
          />
          <input
            value={draft.model.openai}
            onChange={(e) => updateModel('openai', e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </div>

        <div className="field">
          <label>Anthropic (Claude) API Key</label>
          <input
            type="password"
            value={draft.apiKeys.claude}
            onChange={(e) => updateKey('claude', e.target.value)}
            placeholder="sk-ant-..."
          />
          <input
            value={draft.model.claude}
            onChange={(e) => updateModel('claude', e.target.value)}
            placeholder="claude-sonnet-4-5"
          />
        </div>

        <div className="field">
          <label>Theme</label>
          <div className="provider-row">
            {(['light', 'dark'] as Theme[]).map((t) => (
              <button
                key={t}
                className={'provider-chip' + (draft.theme === t ? ' active' : '')}
                onClick={() => update({ theme: t })}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Auto-layout Direction</label>
          <div className="provider-row">
            {(['vertical', 'horizontal'] as LayoutDirection[]).map((d) => (
              <button
                key={d}
                className={'provider-chip' + (draft.layoutDirection === d ? ' active' : '')}
                onClick={() => update({ layoutDirection: d })}
              >
                {d === 'vertical' ? 'Vertical (roots on top)' : 'Horizontal (roots on left)'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Dev Mode</label>
          <div className="provider-row">
            <button
              className={'provider-chip' + (draft.devMode ? ' active' : '')}
              onClick={() => update({ devMode: !draft.devMode })}
            >
              {draft.devMode ? 'On' : 'Off'}
            </button>
            <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>
              Shows tool calls and their results on sticky notes and in the sidebar.
            </span>
          </div>
        </div>

        <div className="save-row">
          {savedAt && <span style={{ fontSize: 12, color: '#2a9d5c', alignSelf: 'center' }}>Saved</span>}
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
