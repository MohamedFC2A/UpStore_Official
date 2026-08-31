'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getClientTelemetry,
  ClientTelemetryData,
  getPermanentDeviceId,
  generateClientHardwareFingerprint,
  isDeviceAlreadyNotifiedLocally,
  markDeviceAsNotifiedLocally,
} from '@/utils/clientTelemetry';

function getOrGenerateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session';
  try {
    let sid = window.sessionStorage.getItem('upstore_visitor_sid');
    if (!sid) {
      sid = 'vis_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      window.sessionStorage.setItem('upstore_visitor_sid', sid);
    }
    return sid;
  } catch {
    return 'vis_' + Math.random().toString(36).substring(2, 10);
  }
}

async function harvestBatteryInfo(): Promise<{ level?: number; isCharging?: boolean }> {
  if (typeof window === 'undefined') return {};
  try {
    const nav = window.navigator as any;
    if (nav.getBattery && typeof nav.getBattery === 'function') {
      const battery = await nav.getBattery();
      if (battery) {
        return {
          level: Math.round(battery.level * 100),
          isCharging: Boolean(battery.charging),
        };
      }
    }
  } catch {}
  return {};
}

async function harvestHighEntropyDevice(): Promise<{ model?: string; platformVersion?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const nav = window.navigator as any;
    if (nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
      const entropy = await nav.userAgentData.getHighEntropyValues([
        'model',
        'platformVersion',
        'architecture',
        'bitness',
      ]);
      return {
        model: entropy.model || undefined,
        platformVersion: entropy.platformVersion || undefined,
      };
    }
  } catch {}
  return {};
}

// Module-level guard to ensure single execution per browser runtime instance
let hasTriggeredInCurrentPageLifecycle = false;

export function VisitorIntelligenceTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const alertDispatchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Strict Deduplication: If this exact mobile/device was already alerted, NEVER re-alert
    if (isDeviceAlreadyNotifiedLocally() || hasTriggeredInCurrentPageLifecycle || alertDispatchedRef.current) {
      return;
    }

    // Set immediate memory guards to avoid concurrent race conditions
    hasTriggeredInCurrentPageLifecycle = true;
    alertDispatchedRef.current = true;

    // Run telemetry harvest in background idle phase for new unrecorded mobile device
    const harvestTimeout = setTimeout(async () => {
      try {
        const permanentDeviceId = getPermanentDeviceId();
        const hwFingerprint = generateClientHardwareFingerprint();
        const telemetry: ClientTelemetryData = getClientTelemetry();
        const sessionId = getOrGenerateSessionId();
        const battery = await harvestBatteryInfo();
        const highEntropy = await harvestHighEntropyDevice();

        // Extract UTM and Marketing Parameters
        const sp = searchParams || new URLSearchParams(window.location.search);
        const utmSource = sp.get('utm_source') || undefined;
        const utmMedium = sp.get('utm_medium') || undefined;
        const utmCampaign = sp.get('utm_campaign') || undefined;
        const utmTerm = sp.get('utm_term') || undefined;
        const utmContent = sp.get('utm_content') || undefined;
        const refCode = sp.get('ref') || sp.get('aff') || undefined;
        const gclid = sp.get('gclid') || undefined;
        const fbclid = sp.get('fbclid') || undefined;
        const ttclid = sp.get('ttclid') || undefined;

        const nav = window.navigator as any;

        // Resolve exact model name (prefer High Entropy userAgentData if available)
        let resolvedModel = telemetry.deviceModel;
        if (highEntropy.model && highEntropy.model.trim()) {
          resolvedModel = highEntropy.model.trim();
        }

        const payload = {
          deviceId: permanentDeviceId,
          hardwareFingerprint: hwFingerprint,
          sessionId,
          url: window.location.href,
          pathname: pathname || '/',
          hostname: window.location.hostname,
          referrer: document.referrer || 'Direct',
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
          refCode,
          gclid,
          fbclid,
          ttclid,
          timestamp: new Date().toISOString(),
          telemetry: {
            ...telemetry,
            deviceId: permanentDeviceId,
            hardwareFingerprint: hwFingerprint,
          },
          batteryLevel: battery.level,
          isCharging: battery.isCharging,
          networkType: telemetry.connectionType,
          downlinkSpeed: telemetry.downlinkSpeed,
          rttLatency: telemetry.rttLatency,
          deviceMemory: telemetry.deviceMemoryGb,
          cpuCores: telemetry.cpuCores,
          gpuVendor: telemetry.gpuVendor,
          gpuRenderer: telemetry.gpuRenderer,
          screenResolution: `${telemetry.screenWidth}×${telemetry.screenHeight} (@${telemetry.pixelRatio}x ${telemetry.orientation})`,
          viewportResolution: `${telemetry.viewportWidth}×${telemetry.viewportHeight}px`,
          pixelRatio: telemetry.pixelRatio,
          colorDepth: telemetry.colorDepth,
          orientation: telemetry.orientation,
          touchSupport: telemetry.touchSupport,
          maxTouchPoints: telemetry.maxTouchPoints,
          preferredLanguage: nav.language || 'ar',
          allLanguages: Array.isArray(nav.languages) ? nav.languages : [nav.language || 'ar'],
          timezone: telemetry.timezone,
          timezoneOffset: telemetry.timezoneOffset,
          deviceModel: resolvedModel,
          deviceType: telemetry.deviceType,
          os: telemetry.os,
          osVersion: highEntropy.platformVersion || telemetry.osVersion,
          browser: telemetry.browser,
          browserVersion: telemetry.browserVersion,
          isWebView: telemetry.isWebView,
          webViewType: telemetry.webViewType,
          userAgent: telemetry.userAgent,
          cookiesEnabled: nav.cookieEnabled ?? true,
          isRepeatVisit: false,
          pageViewsInSession: 1,
        };

        // Mark locally immediately before fetch to prevent any secondary trigger
        markDeviceAsNotifiedLocally();

        const jsonStr = JSON.stringify(payload);

        // High-reliability non-blocking fetch with keepalive
        try {
          fetch('/api/visitor/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStr,
            keepalive: true,
          }).catch(() => {
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
              const blob = new Blob([jsonStr], { type: 'application/json' });
              navigator.sendBeacon('/api/visitor/log', blob);
            }
          });
        } catch {
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            navigator.sendBeacon('/api/visitor/log', blob);
          }
        }
      } catch (err) {
        // Silently fail without interrupting user experience
      }
    }, 1000);

    return () => clearTimeout(harvestTimeout);
  }, []);

  return null;
}
