import type { OdFileObject } from '../../types'
import { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { useAsync } from 'react-async-hook'
import { useClipboard } from 'use-clipboard-copy'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu'

// 修正后的类型导入方式
const PlyrDynamic = dynamic(() => import('plyr-react').then(m => m.Plyr), {
  ssr: false
})
import type { Plyr } from 'plyr-react'

// 使用 Plyr 命名空间中的类型
interface PlyrSource {
  type?: string
  title?: string
  poster?: string
  tracks?: Plyr.Track[]
  sources: Plyr.Source[]
}

interface PlyrOptions {
  ratio?: string
  fullscreen?: { iosNative: boolean }
  [key: string]: any
}

import 'plyr-react/plyr.css'

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const { t } = useTranslation()
  const clipboard = useClipboard()
  const [menuOpen, setMenuOpen] = useState(false)

  const hashedToken = getStoredToken(asPath)
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  
  // 字幕处理
  const subtitleUrl = `${videoUrl}&subtitle=${encodeURIComponent(file.name)}`
  const isFlv = getExtension(file.name) === 'flv'

  // FLV 加载处理
  const { result: mpegts } = useAsync(async () => {
    return isFlv ? (await import('mpegts.js')).default : null
  }, [isFlv])

  useEffect(() => {
    // 字幕加载
    axios.get(subtitleUrl, { responseType: 'blob' })
      .then(resp => {
        const track = document.querySelector('track')
        track?.setAttribute('src', URL.createObjectURL(resp.data))
      })
      .catch(() => console.log('Subtitle load failed'))

    // FLV 特殊处理
    if (isFlv && mpegts) {
      const video = document.getElementById('plyr-player')
      if (video) {
        const player = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        player.attachMediaElement(video)
        player.load()
      }
    }
  }, [subtitleUrl, isFlv, mpegts, videoUrl])

  // Plyr 配置
  const plyrSource: PlyrSource = {
    sources: [{
      src: videoUrl,
      type: `video/${getExtension(file.name)}`
    }],
    poster: `/api/thumbnail/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`,
    tracks: [{
      kind: 'captions',
      label: file.name,
      src: '',
      default: true
    }]
  }

  const plyrOptions: PlyrOptions = {
    ratio: '16:9',
    fullscreen: { iosNative: true },
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'captions',
      'settings',
      'fullscreen'
    ]
  }

  return (
    <PreviewContainer>
      {isFlv && !mpegts ? (
        <Loading loadingText={t('Loading FLV support...')} />
      ) : (
        <>
          <PlyrDynamic
            id="plyr-player"
            source={plyrSource as any} // 临时类型断言
            options={plyrOptions}
          />
          
          <DownloadBtnContainer>
            <div className="flex flex-wrap justify-center gap-2">
              <DownloadButton
                onClickCallback={() => window.open(videoUrl)}
                btnColor="blue"
                btnText={t('Download')}
                btnIcon="file-download"
              />
              <DownloadButton
                onClickCallback={() => {
                  clipboard.copy(`${getBaseUrl()}${videoUrl}`)
                  toast.success(t('Copied direct link to clipboard.'))
                }}
                btnColor="pink"
                btnText={t('Copy direct link')}
                btnIcon="copy"
              />
              <DownloadButton
                onClickCallback={() => setMenuOpen(true)}
                btnColor="teal"
                btnText={t('Customise link')}
                btnIcon="pen"
              />
              {/* 播放器快捷方式 */}
              <DownloadButton
                onClickCallback={() => window.open(`iina://weblink?url=${getBaseUrl()}${videoUrl}`)}
                btnText="IINA"
                btnImage="/players/iina.png"
              />
              <DownloadButton
                onClickCallback={() => window.open(`vlc://${getBaseUrl()}${videoUrl}`)}
                btnText="VLC"
                btnImage="/players/vlc.png"
              />
              <DownloadButton
                onClickCallback={() => window.open(`potplayer://${getBaseUrl()}${videoUrl}`)}
                btnText="PotPlayer"
                btnImage="/players/potplayer.png"
              />
              <DownloadButton
                onClickCallback={() => window.open(`nplayer-http://${window?.location.hostname ?? ''}${videoUrl}`)}
                btnText="nPlayer"
                btnImage="/players/nplayer.png"
              />
            </div>
          </DownloadBtnContainer>

          <CustomEmbedLinkMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            path={asPath}
            hashedToken={hashedToken}
          />
        </>
      )}
    </PreviewContainer>
  )
}

export default VideoPreview
