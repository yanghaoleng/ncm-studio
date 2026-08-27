import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DONATE_QR_PRELOADS = [
  '/donate/wechat-qr.webp',
  '/donate/alipay-qr.webp',
]

function preloadDonateQrCodes() {
  return {
    name: 'preload-donate-qr-codes',
    transformIndexHtml() {
      return DONATE_QR_PRELOADS.map((href) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          as: 'image',
          href,
          type: 'image/webp',
          fetchpriority: 'low',
        },
        injectTo: 'head',
      }))
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadDonateQrCodes()],
})
