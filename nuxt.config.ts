import { defineNuxtConfig } from 'nuxt'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    ssr: false,
    components: [
        '~/components',
    ],
    plugins: [
        '~/plugins/contextMenu.client.js'
    ],
    vue: {
        config: {
            devtools: true
        }
    },
    modules: [
        '@kevinmarrec/nuxt-pwa'
    ],
    pwa: {
        workbox: {
            enabled: true
        }
    }
})
