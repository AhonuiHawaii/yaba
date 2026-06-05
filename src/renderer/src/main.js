import './assets/main.css'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import 'material-symbols'

import { createPinia } from 'pinia'

import { createApp } from 'vue'
import App from './App.vue'

import { createVuetify } from 'vuetify'
import themes from './theme'
import { useUserSettingsStore } from './stores/userSettings'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

const userSettings = useUserSettingsStore()
const defaultTheme = themes[userSettings.theme] ? userSettings.theme : 'greyDark'

const vuetify = createVuetify({
  theme: {
    defaultTheme,
    themes
  }
})

app.use(vuetify).mount('#app')
