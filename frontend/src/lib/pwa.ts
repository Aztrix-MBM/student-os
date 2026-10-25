import { useState, useEffect } from 'react';
import { subscribePush, unsubscribePush } from './api';

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] App successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: Boolean(deferredPrompt),
    isInstalled,
    promptInstall,
  };
}

export async function requestPushNotificationPermission(): Promise<{ ok: boolean; error?: string }> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, error: 'Push notifications are not supported in this browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Notification permission was denied.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      // In production, user passes VAPID public key; for development we generate or subscribe
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
      }).catch(async () => {
        // Fallback for browsers without VAPID configuration
        return null;
      });
    }

    if (sub) {
      const rawKey = sub.getKey('p256dh');
      const rawAuth = sub.getKey('auth');
      const p256dh = rawKey ? btoa(String.fromCharCode(...new Uint8Array(rawKey))) : 'local-p256dh';
      const auth = rawAuth ? btoa(String.fromCharCode(...new Uint8Array(rawAuth))) : 'local-auth';

      await subscribePush({
        endpoint: sub.endpoint,
        p256dh,
        auth,
      });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to subscribe to push notifications.' };
  }
}
