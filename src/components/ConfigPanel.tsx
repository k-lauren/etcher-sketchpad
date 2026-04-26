import { useState } from 'react';
import type { AppConfig, LayoutDirection, Provider, Theme } from '../types';
import {
  Key,
  Sun,
  Moon,
  Bug,
  Check,
  Sparkles,
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onSave: (c: AppConfig) => void;
  proMode?: boolean;
}

export function ConfigPanel({ config, onSave, proMode = false }: Props) {
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

  if (proMode) return renderPro({ draft, savedAt, update, updateKey, updateModel, save });
  return renderClassic({ draft, savedAt, update, updateKey, updateModel, save });
}

/* ────────────────────────────── Classic ────────────────────────────── */

interface RenderArgs {
  draft: AppConfig;
  savedAt: number | null;
  update: (patch: Partial<AppConfig>) => void;
  updateKey: (p: Provider, v: string) => void;
  updateModel: (p: Provider, v: string) => void;
  save: () => void;
}

function renderClassic({ draft, savedAt, update, updateKey, updateModel, save }: RenderArgs) {
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
          <div className="toggle-row">
            <button
              className={'toggle-chip' + (draft.devMode ? ' active' : '')}
              onClick={() => update({ devMode: !draft.devMode })}
            >
              {draft.devMode ? 'On' : 'Off'}
            </button>
            <span className="toggle-help">
              Shows tool calls and their results on sticky notes and in the sidebar.
            </span>
          </div>
        </div>

        <div className="field">
          <label>Settings as Overlay</label>
          <div className="toggle-row">
            <button
              className={'toggle-chip' + (draft.settingsAsOverlay ? ' active' : '')}
              onClick={() => update({ settingsAsOverlay: !draft.settingsAsOverlay })}
            >
              {draft.settingsAsOverlay ? 'On' : 'Off'}
            </button>
            <span className="toggle-help">
              Open Settings as a floating modal instead of a full-page tab.
            </span>
          </div>
        </div>

        <div className="field">
          <label>Professional Mode</label>
          <div className="toggle-row">
            <button
              className={'toggle-chip' + (draft.saasMode ? ' active' : '')}
              onClick={() => update({ saasMode: !draft.saasMode })}
            >
              {draft.saasMode ? 'On' : 'Off'}
            </button>
            <span className="toggle-help">
              Clean, minimal interface — less sticky note, more SaaS.
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

/* ────────────────────────────── Pro ────────────────────────────── */

function ProToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={'pro-toggle' + (on ? ' on' : '')}
      onClick={onToggle}
    >
      <span className="pro-toggle-dot" />
    </button>
  );
}

function renderPro({ draft, savedAt, update, updateKey, updateModel, save }: RenderArgs) {
  const provider = draft.provider;
  const placeholder =
    provider === 'deepseek' ? 'sk-...' : provider === 'openai' ? 'sk-...' : 'sk-ant-...';
  const modelHint =
    provider === 'deepseek'
      ? 'deepseek-chat'
      : provider === 'openai'
      ? 'gpt-4o-mini'
      : 'claude-sonnet-4-5';
  const providerLabel =
    provider === 'deepseek' ? 'DeepSeek' : provider === 'openai' ? 'OpenAI' : 'Anthropic (Claude)';

  return (
    <div className="config-page pro">
      <div className="pro-config">
        <h2 className="pro-config-title">Settings</h2>
        <p className="pro-config-sub">Your keys stay in the browser — we never see them.</p>

        {/* Provider section */}
        <div className="pro-section">
          <div className="pro-section-label">
            <div className="pro-section-heading">Provider</div>
            <div className="pro-section-desc">Choose which AI service to use for inference.</div>
          </div>
          <div className="pro-section-controls">
            <div className="pro-pill-row">
              {(['deepseek', 'openai', 'claude'] as Provider[]).map((p) => (
                <button
                  key={p}
                  className={'pro-pill' + (provider === p ? ' active' : '')}
                  onClick={() => update({ provider: p })}
                >
                  {p === 'deepseek' ? 'DeepSeek' : p === 'openai' ? 'OpenAI' : 'Claude'}
                </button>
              ))}
            </div>
            <div className="pro-field">
              <label className="pro-field-label">
                <Key size={12} /> {providerLabel} API key
              </label>
              <input
                className="pro-input"
                type="password"
                value={draft.apiKeys[provider]}
                onChange={(e) => updateKey(provider, e.target.value)}
                placeholder={placeholder}
              />
            </div>
            <div className="pro-field">
              <label className="pro-field-label">Model</label>
              <input
                className="pro-input"
                value={draft.model[provider]}
                onChange={(e) => updateModel(provider, e.target.value)}
                placeholder={modelHint}
              />
            </div>
          </div>
        </div>

        <div className="pro-divider" />

        {/* Appearance section */}
        <div className="pro-section">
          <div className="pro-section-label">
            <div className="pro-section-heading">Appearance</div>
            <div className="pro-section-desc">Visual preferences and canvas layout.</div>
          </div>
          <div className="pro-section-controls">
            <div className="pro-row">
              <div>
                <div className="pro-row-title">Theme</div>
                <div className="pro-row-sub">Light or dark mode</div>
              </div>
              <div className="pro-segmented">
                {(['light', 'dark'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    className={'pro-segment' + (draft.theme === t ? ' active' : '')}
                    onClick={() => update({ theme: t })}
                  >
                    {t === 'light' ? <Sun size={13} /> : <Moon size={13} />}
                    {t === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pro-row">
              <div>
                <div className="pro-row-title">Layout direction</div>
                <div className="pro-row-sub">How auto-arrange orders your nodes</div>
              </div>
              <select
                className="pro-select"
                value={draft.layoutDirection}
                onChange={(e) => update({ layoutDirection: e.target.value as LayoutDirection })}
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>

            <div className="pro-row">
              <div>
                <div className="pro-row-title">Professional mode</div>
                <div className="pro-row-sub">Clean, minimal interface — less sticky note, more SaaS.</div>
              </div>
              <ProToggle
                on={draft.saasMode}
                onToggle={() => update({ saasMode: !draft.saasMode })}
                label="Professional mode"
              />
            </div>

            <div className="pro-row">
              <div>
                <div className="pro-row-title">Settings as overlay</div>
                <div className="pro-row-sub">Open Settings as a floating modal instead of a full-page tab.</div>
              </div>
              <ProToggle
                on={draft.settingsAsOverlay}
                onToggle={() => update({ settingsAsOverlay: !draft.settingsAsOverlay })}
                label="Settings as overlay"
              />
            </div>
          </div>
        </div>

        <div className="pro-divider" />

        {/* Advanced section */}
        <div className="pro-section">
          <div className="pro-section-label">
            <div className="pro-section-heading">Advanced</div>
            <div className="pro-section-desc">Options for power users and debugging.</div>
          </div>
          <div className="pro-section-controls">
            <div className="pro-row">
              <div>
                <div className="pro-row-title">
                  <Bug size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                  Developer mode
                </div>
                <div className="pro-row-sub">Shows tool-call details on each node and in the sidebar.</div>
              </div>
              <ProToggle
                on={draft.devMode}
                onToggle={() => update({ devMode: !draft.devMode })}
                label="Developer mode"
              />
            </div>
          </div>
        </div>

        <div className="pro-divider" />

        {/* Save row */}
        <div className="pro-section pro-save-section">
          <div className="pro-section-label" />
          <div className="pro-section-controls">
            <div className="pro-save">
              <button className="pro-btn-primary" onClick={save}>
                <Sparkles size={14} style={{ display: 'none' }} />
                Save changes
              </button>
              {savedAt && (
                <span className="pro-saved">
                  <Check size={14} /> Saved
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
