/**
 * @file BFF Server render
 * @module server/render
 * @author Surmon <https://github.com/surmon-china>
 */

import fs from 'fs'
import path from 'path'
import LRU from 'lru-cache'
import serialize from 'serialize-javascript'
import { createSSRApp } from 'vue'
import { Middleware, Context } from 'koa'
import { createMemoryHistory } from 'vue-router'
import { renderToString } from '@vue/server-renderer'
import { getLayoutByRouteMeta } from '/@/services/layout'
import { Theme, THEME_STORAGE_KEY } from '/@/services/theme'
import { INVALID_ERROR } from '/@/constants/error'
import { getSSRContextScript, getSSRStoreScript, SSRContext } from '/@/universal'
import { createVueApp, VueApp } from '/@/main'
import { APP_PATH } from './helper'

const SPA_INDEX_HTML = fs
  .readFileSync(path.join(APP_PATH, 'index.html'))
  .toString()

const createApp = (context: Context): VueApp => {
  const { headers } = context.request
  return createVueApp({
    appCreator: createSSRApp,
    historyCreator: createMemoryHistory,
    language: headers['accept-language'],
    userAgent: headers['user-agent'],
    theme: context.cookies.get(THEME_STORAGE_KEY) as Theme || Theme.Default
  })
}

const getCacheKey = (vueApp: VueApp, url: string): string => {
  const { i18n, theme, globalState } = vueApp
  const language = i18n.language.value
  const themeV = theme.theme.value
  const device = globalState.userAgent.isMobile ? 'mobile' : 'pc'
  return `${url}-${language}-${themeV}-${device}`
}

const renderHTML = async (vueApp: VueApp, url: string, error?: any) => {
  const { app, router, store, helmet, theme, globalState } = vueApp

  // 1. init store prefetch
  await store.serverInit()

  // render error: don't push url
  if (!error) {
    // 2. push route
    // 3. route validate
    // 4. router error: next() -> renderError
    // 4. !router error: next() -> renderPage
    await router.push(url)
    await router.isReady()
  }

  // render error: set error
  if (error) {
    globalState.setRenderError(error)
  }

  // 5. init server layout
  globalState.setLayoutColumn(
    getLayoutByRouteMeta(router.currentRoute.value.meta)
  )

  // 7. render
  let preRenderError = !!globalState.renderError.value
  let APP_HTML = await renderToString(app)
  // render -> error -> reRender -> error page
  if (!preRenderError && !!globalState.renderError.value) {
    APP_HTML = await renderToString(app)
  }

  // render error: clear helmet
  if (error) {
    helmet.resetComputer()
  }

  // 8. SSR context
  const STORE_SCRIPT = getSSRStoreScript(serialize(store.state))
  // TODO: SSR context?
  const SSR_CONTEXT_SCRIPT = getSSRContextScript(serialize({
    url,
    theme: theme.theme.value,
    globalState: globalState.toRawState()
  }))

  // 9. assemble HTML
  const HEAD = [
    helmet.html.value.title,
    helmet.html.value.keywords,
    helmet.html.value.description
  ].join('\n')

  const FOOTER = [
    `<script>${STORE_SCRIPT}</script>`,
    `<script>${SSR_CONTEXT_SCRIPT}</script>`
  ].join('\n')

  const HTML = SPA_INDEX_HTML
    .replace(/<title>[\s\S]*<\/title>/, '')
    .replace(
      `<head>`,
      `<head>\n${HEAD}`
    )
    .replace(
      `<div id="app">`,
      `<div id="app" data-server-rendered="true">${APP_HTML}`
    ).replace(
      `</body>`,
      `${FOOTER}\n</body>`
    )

  return HTML
}

const renderCache = new LRU({
  max: Infinity,
  maxAge: 1000 * 60 * 1
})

export const renderSSR: Middleware = async context => {
  const { url } = context.request
  const app = createApp(context)
  const cacheKey = getCacheKey(app, url)
  if (renderCache.has(cacheKey)) {
    // cache render
    context.body = renderCache.get(cacheKey)
  } else {
    // 1. render page
    // 2. render route validate error page
    // 2. render 404 error page
    try {
      const html = await renderHTML(app, url)
      const error = app.globalState.renderError.value
      const isStatic = !!app.router.currentRoute.value.meta?.static
      if (error) {
        // render error page
        context.status = error.code
        context.body = html
      } else {
        // render page
        context.body = html
        renderCache.set(
          cacheKey,
          html,
          isStatic ? Infinity : undefined
        )
      }
    } catch (unknownError) {
      // unknown error
      const error = {
        code: INVALID_ERROR,
        message: unknownError.message
      }
      const html = await renderHTML(app, url, error)
      context.status = error.code
      context.body = html
    }
  }
}
