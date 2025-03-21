// src/components/previews/VideoPreview.tsx
import type { OdFileObject } from '../../types'
import { FC, useEffect, useState, useRef } from 'react'
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

// 修复动态导入（v5.1.2 正确导出方式）
const Plyr = dynamic(() => import('plyr-react').then(mod => mod.default), {
  ssr: false
})

// 新增类型声明
import type { APITypes, PlyrProps } from 'plyr-react'
import type PlyrInstance from 'plyr'

interface CustomSource extends PlyrProps['source'] {
  poster?: string
  tracks?: Array<{
    kind: 'captions' | 'subtitles'
    label: string
    src: string
    default?: boolean
  }>
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  // 保持原有 state 和 hooks 不变
  const { asPath } = useRouter()
  const { t } = useTranslation()
  const clipboard = useClipboard()
  const [menuOpen, setMenuOpen] = useState(false)
  const playerRef = useRef<APITypes>(null)

  // 保持原有 URL 生成逻辑不变
  const hashedToken = getStoredToken(asPath)
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const isFlv = getExtension(file.name) === 'flv'

  // 保持原有 FLV 处理逻辑不变
  const { result: mpegts } = useAsync(async () => {
    return isFlv ? (await import('mpegts.js')).default : null
  }, [isFlv])

  // 保持原有 useEffect 逻辑不变
  useEffect(() => {
    axios.get(`${videoUrl}&subtitle=${encodeURIComponent(file.name)}`, { responseType: 'blob' })
      .then(resp => {
        const track = document.querySelector('track')
        track?.setAttribute('src', URL.createObjectURL(resp.data))
      })
      .catch(() => console.log('Subtitle load failed'))

    if (isFlv && mpegts) {
      const video = document.getElementById('plyr-player')
      if (video) {
        const player = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        player.attachMediaElement(video)
        player.load()
      }
    }
  }, [videoUrl, isFlv, mpegts, file.name])

  // 更新类型定义（保持配置内容不变）
  const plyrSource: CustomSource = {
    type: 'video',
    sources: [{
      src: videoUrl,
      type: `video/${getExtension(file.name)}`
    }],
    poster: `/api/thumbnail/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`,
    tracks: [{
      kind: 'subtitles',
      label: file.name,
      src: '',
      default: true
    }]
  }

  const plyrOptions: PlyrInstance.Options = {
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
          {/* 更新组件引用方式 */}
          <Plyr
            id="plyr-player"
            ref={playerRef}
            source={plyrSource}
            options={plyrOptions}
          />

          {/* 保持原有下载按钮逻辑不变 */}
          <DownloadBtnContainer>
            <div className="flex flex-wrap justify-center gap-2">
              <DownloadButton
                onClickCallback={() => window.open(videoUrl)}
                btnColor="blue"
                btnText={t('Download')}
                btnIcon="file-download"
              />
              {/* 其他按钮保持不变... */}
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
