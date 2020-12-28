/**
 * @file Music player
 * @module service/music
 * @author Surmon <https://github.com/surmon-china>
 * @document https://521dimensions.com/open-source/amplitudejs/docs
 */

import { App, Plugin, inject, readonly, reactive, computed } from 'vue'
import { getFileProxyUrl } from '/@/transforms/url'
import { TunnelModule } from '/@/constants/tunnel'
import type { ISong } from '/@/server/tunnel/music'
import tunnel from '/@/services/tunnel'

export interface MusicConfig {
  amplitude: any
  volume?: number
  autoStart?: boolean
}

type MusicId = string | number

const createMusicPlayer = (config: MusicConfig) => {
  const { amplitude } = config

  // Player state
  const initVolume = config.volume ?? 40
  const state = reactive({
    // 是否初始化
    inited: false,
    // 是否可用
    ready: false,
    // 活动项
    index: 0,
    // 总数
    count: 0,
    // 音量
    volume: initVolume,
    // 图形化
    wave: false,
    // 播放中
    playing: false,
    // 进度
    speeds: 0,
    progress: 0,
  })

  // mute state
  const muted = computed<boolean>(() => state.volume === 0)

  // 原始播放列表
  const songList = reactive({
    fetching: false,
    data: [] as Array<ISong>
  })

  // 可消费播放列表
  const playableSongList = computed<ISong[]>(() => {
    return songList.data.map(song => ({
      ...song,
      // https://binaryify.github.io/NeteaseCloudMusicApi/#/?id=%e8%8e%b7%e5%8f%96%e9%9f%b3%e4%b9%90-url
      url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
      // MARK: 403!
      // url: song.url
      //   ? song.url.replace(/(http:\/\/|https:\/\/)/gi, getFileProxyUrl('/music/'))
      //   : null as any as string,
      cover_art_url: song.cover_art_url
        ? getFileProxyUrl(song.cover_art_url.replace('http://', '/music/') + '?param=600y600')
        : null as any as string,
    }))
  })

  const fetchSongList = async () => {
    try {
      songList.fetching = true
      songList.data = await tunnel.dispatch<ISong[]>(TunnelModule.Music)
      state.count = songList.data.length
    } catch (error) {
      songList.data = []
      state.count = 0
      throw error
    } finally {
      songList.fetching = false
    }
  }

  // MARK: 暂时停用
  const fetchSongLrc = async (songId: MusicId) => {}

  // eslint-disable-next-line vue/return-in-computed-property
  const currentSong = computed<ISong | void>(() => {
    if (state.inited && state.index !== undefined) {
      return amplitude.getActiveSongMetadata()
    }
  })

  const currentSongRealTimeLrc = computed<string | null>(() => {
    return null

    /*
    if (!state.inited) {
      return null
    }
    const lrc = musicLrc.data
    const lyric = lrc && !lrc.nolyric && lrc.lrc

    // not roll
    if (!lyric || lrc.version < 3) {
      return null
    }

    const currentSongLrcs = lyric
      .split('\n')
      .map((timeSentence: string) => {
        // eslint-disable-next-line no-useless-escape
        let time: $TODO = /\[([^\[\]]*)\]/.exec(timeSentence)
        time = time?.length && time[1]
        time = time?.split(':').map((t: string) => Number(t))
        time = time?.length && time.length > 1 && time[0] * 60 + time[1]
        time = time || ''
        let sentence: $TODO = /([^\]]+)$/.exec(timeSentence)
        sentence = sentence?.[1] || ''
        return { time, sentence }
      })
      .filter((timestamp: $TODO) => timestamp.time) as Array<{
        time: number
        sentence: string
      }>

    // empty
    if (!currentSongLrcs.length) {
      return null
    }

    const targetSentence = currentSongLrcs.find(
      (timestamp, index, array) => {
        const next = array[index + 1]
        return timestamp.time <= state.speeds && next && next.time > state.speeds
      }
    )
    return targetSentence ? targetSentence.sentence : '...'
    */
  })

  const play = () => amplitude.play()
  const pause = () => amplitude.pause()
  const prevSong = () => amplitude.prev()
  const nextSong = () => amplitude.next()
  const changeVolume = (volume: number) => amplitude.setVolume(volume)
  const toggleMuted = () => changeVolume(muted.value ? initVolume : 0)
  const togglePlay = () => amplitude.getPlayerState() === 'playing'
    ? pause()
    : play()

  const initPlayer = (songs: ISong[]) => {
    amplitude.init({
      // 歌曲切换之间的延时
      // https://521dimensions.com/open-source/amplitudejs/docs/configuration/delay.html#public-function
      delay: 668,
      debug: false,
      volume: state.volume,
      songs,
      /*
      songs: songs.map(song => ({
        ...song,
        time_callbacks: {
          // 当任何一首音乐播放到第三秒时开始获取歌词
          3: () => fetchSongLrc((currentSong.value as ISong).id)
        }
      })),
      */
      start_song: 0,
      continue_next: true,
      callbacks: {
        initialized: () => {
          // console.log('----initialized')
          state.ready = true
          state.inited = true
        },
        play: () => {
          state.ready = true
          state.wave = true
          state.playing = true
        },
        pause: () => {
          state.wave = false
          state.playing = false
        },
        stop: () => {
          state.wave = false
          state.playing = false
        },
        volumechange: () => {
          state.volume = amplitude.getVolume()
        },
        timeupdate: () => {
          state.speeds = amplitude.getSongPlayedSeconds()
          state.progress = amplitude.getSongPlayedPercentage()
        },
        song_change: () => {
          state.index = amplitude.getActiveIndex()
        },
        ended: () => {
          state.playing = false
        },
        error: (error: any) => {
          console.warn('播放器出现异常，自动下一首！', state.index, error)
          state.playing = false
          // 播放异常时不再清除音乐，不作 url 可能不可用的假设
          // amplitude.removeSong(state.index)
          // HACK: 网络阻塞会导致紧邻的后续请求中断，所以下一首操作需要延时，避免瀑布式请求
          window.setTimeout(nextSong, 1668)
        }
      }
    })
    amplitude.setRepeat(true)
  }

  const start = () => {
    fetchSongList().then(() => {
      if (!playableSongList.value.length) {
        state.ready = false
        console.warn('播放列表为空，未找到有效音乐，无法初始化！')
        return
      }

      initPlayer(playableSongList.value)
      window.$defer.addTask(() => {
        window.onmousemove = () => {
          state.playing || play()
          window.onmousemove = null
        }
      })
    }).catch(error => {
      state.ready = false
      console.warn('播放列表请求失败，无法初始化！', error)
    })
  }

  return {
    state: readonly(state),
    muted,
    currentSong,
    currentSongRealTimeLrc,

    start,
    play,
    pause,
    changeVolume,
    toggleMuted,
    togglePlay,
    prevSong,
    nextSong
  }
}

const MusicPlayerSymbol = Symbol('music-player')
export type Music = ReturnType<typeof createMusicPlayer>
export const createMusic = (config: MusicConfig): Music & Plugin => {
  const musicPlayer = createMusicPlayer(config)
  if (config.autoStart) {
    musicPlayer.start()
  }

  return {
    ...musicPlayer,
    install(app: App) {
      app.provide(MusicPlayerSymbol, musicPlayer)
    }
  }
}

export const useMusic = (): Music => {
  return inject(MusicPlayerSymbol) as Music
}
