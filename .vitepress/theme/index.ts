import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import VersionNote from './VersionNote.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(VersionNote),
    }),
}
