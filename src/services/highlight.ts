/**
 * @file highlight.js
 * @module service/highlight
 * @author Linyj <https://github.com/Linyj>
 */

// MARK: vite.config.js
import type HLJSApi from 'highlight.js'
import hljs from 'highlight.js/lib/core'
import go from 'highlight.js/lib/languages/go'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import php from 'highlight.js/lib/languages/php'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import less from 'highlight.js/lib/languages/less'
import scss from 'highlight.js/lib/languages/scss'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import shell from 'highlight.js/lib/languages/shell'
import nginx from 'highlight.js/lib/languages/nginx'
import stylus from 'highlight.js/lib/languages/stylus'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'

import 'highlight.js/styles/ocean.css'

const languages = {
  go,
  css,
  sql,
  php,
  xml,
  yaml,
  json,
  bash,
  less,
  scss,
  rust,
  java,
  shell,
  nginx,
  stylus,
  python,
  javascript,
  typescript,
}

Object.keys(languages).forEach(name => hljs.registerLanguage(name, languages[name]))

export default hljs as HLJSApi
