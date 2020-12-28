/**
 * @file vue-awesome-swiper
 * @module event
 * @author Linyj <https://github.com/Linyj>
 */

import Swiper from 'swiper'
import { SWIPER_EVENTS, ComponentEvents } from './constants'
import { kebabcase } from './utils'

export type EventEmiter = (eventName: string, ...args: any) => void

export const handleClickSlideEvent = (swiper: Swiper | null, event: MouseEvent, emit: any): void => {
  if (swiper && !((swiper as any).destroyed)) {
    const eventPath = event.composedPath?.() || (event as any).path
    if (event?.target && eventPath) {
      const slides = Array.from(swiper.slides)
      const paths = Array.from(eventPath)
      // Click slide || slide[children]
      if (slides.includes(event.target) || paths.some(item => slides.includes(item))) {
        const clickedIndex = swiper.clickedIndex
        const reallyIndex = Number(swiper.clickedSlide?.dataset?.swiperSlideIndex)
        const reallyIndexValue = Number.isInteger(reallyIndex) ? reallyIndex : null
        emit(ComponentEvents.ClickSlide, clickedIndex, reallyIndexValue)
        emit(kebabcase(ComponentEvents.ClickSlide), clickedIndex, reallyIndexValue)
      }
    }
  }
}

export const bindSwiperEvents = (swiper: Swiper, emit: EventEmiter, autoCase: boolean): void => {
  SWIPER_EVENTS.forEach(eventName => {
    swiper.on(eventName, (...args: any[]) => {
      emit(eventName, ...args)
      if (autoCase) {
        const kebabcaseName = kebabcase(eventName)
        if (kebabcaseName !== eventName) {
          emit(kebabcaseName, ...args)
        }
      }
    })
  })
}
