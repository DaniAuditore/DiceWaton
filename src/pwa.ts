export function setupPwaRegistration() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) {
    return
  }

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onOfflineReady() {
          window.dispatchEvent(new CustomEvent('pwa:offline-ready'))
        },
        onNeedRefresh() {
          window.dispatchEvent(
            new CustomEvent('pwa:update-available', {
              detail: {
                applyUpdate: () => updateSW(true)
              }
            })
          )
        }
      })
    })
    .catch(() => {
      // Non-blocking: if SW registration is unavailable, core flows stay intact.
    })
}
