/**
 * @file BFF GA updater
 * @module server/gtag
 * @author Surmon <https://github.com/surmon-china>
 */

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { GA_MEASUREMENT_ID } from '/@/config/app.config'
import { getGAScriptUrl } from '/@/transforms/url'
import { PUBLIC_PATH } from './helper'

const UPDATE_TIME = {
  HOURS_1: 1000 * 60 * 60 * 1,
  HOURS_24: 1000 * 60 * 60 * 24
}

export const startGTagScriptUpdater = () => {
  (function doUpdate() {
    axios.get(getGAScriptUrl(GA_MEASUREMENT_ID), { timeout: 6000 })
      .then(response => {
        if (response.status === 200) {
          fs.writeFileSync(path.resolve(
            PUBLIC_PATH,
            'scripts',
            'gtag.js'
            ),
            response.data
          )
          console.log('GA 脚本更新成功', new Date())
          setTimeout(doUpdate, UPDATE_TIME.HOURS_24)
        } else {
          console.warn('GA 脚本更新失败', new Date(), response.data)
          setTimeout(doUpdate, UPDATE_TIME.HOURS_1)
        }
      })
      .catch(error => {
        console.warn('GA 脚本更新网络连接失败', new Date(), error.message, error?.toJSON())
        setTimeout(doUpdate, UPDATE_TIME.HOURS_1)
      })
  }())
}
