import * as vscode from 'vscode';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class Analytics {
  private static ctx: vscode.ExtensionContext | null = null;
  private static plugin: 'FlashMintlify' | 'FlashDocusaurus';
  private static inited = false;

  static init(context: vscode.ExtensionContext, plugin: 'FlashMintlify' | 'FlashDocusaurus') {
    this.ctx = context;
    this.plugin = plugin;
    this.inited = true;
  }

  static track(feature: string, userId?: string) {
    // fire-and-forget; never block user flow
    void this._send(feature, userId);
  }

  private static async _deviceId(): Promise<string> {
    const mid = vscode.env.machineId;
    if (mid && mid !== 'someValue.machineId') return mid;
    const key = 'flashdocs.deviceId';
    let id = this.ctx?.globalState.get<string>(key);
    if (!id) {
      id = uuid();
      await this.ctx?.globalState.update(key, id);
    }
    return id ?? 'unknown';
  }

  private static async _send(feature: string, userId?: string) {
    try {
      if (!this.inited || !this.ctx) return;
      const cfg = vscode.workspace.getConfiguration('flashdocs');
      const cfgBase = cfg.get<string>('analytics.baseUrl');
      const debug = cfg.get<boolean>('analytics.debug') ?? true;
      const finalBase = (cfgBase && cfgBase.length > 0) ? cfgBase : 'https://flashdocs.fastcar.fun';
      const endpoint = `${finalBase.replace(/\/$/, '')}/api/track`;
      const deviceId = await this._deviceId();
      const extId = this.plugin === 'FlashDocusaurus' ? 'FlashDocs.flash-docusaurus' : 'FlashDocs.flash-mintlify';

      const body = {
        plugin: this.plugin,
        feature,
        userId: userId ?? null,
        deviceId,
        meta: {
          vscodeVersion: vscode.version,
          extVersion: vscode.extensions.getExtension(extId)?.packageJSON?.version || null,
          platform: process.platform,
        },
      };

      const gfetch: any = (globalThis as any).fetch;
      if (!gfetch) { if (debug) console.log('[FlashDocs][analytics] fetch unavailable'); return; }
      if (debug) console.log('[FlashDocs][analytics] -> /api/track', { endpoint, feature });
      const res = await gfetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (debug) console.log('[FlashDocs][analytics] <-', res?.status, res?.ok);
    } catch (err) {
      console.error('[FlashDocs][analytics] error', err);
    }
  }
}
