'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, useEditor, createShapeId, AssetRecordType } from 'tldraw'

function blobToDataUrl(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = blobUrl
  })
}

function ImageLoader({ imageUrl }: { imageUrl: string }) {
  const editor = useEditor()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !editor) return
    loaded.current = true

    const img = new Image()
    img.onload = async () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const dataUrl = await blobToDataUrl(imageUrl)
      const assetId = AssetRecordType.createId()
      editor.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: { name: 'background', src: dataUrl, w, h, mimeType: 'image/png', isAnimated: false },
        meta: {},
      }])
      editor.createShapes([{
        id: createShapeId(),
        type: 'image',
        x: 0, y: 0,
        isLocked: true,
        props: { assetId, w, h },
      }])
      editor.zoomToFit()
    }
    img.src = imageUrl
  }, [editor, imageUrl])

  return null
}

export default function TldrawAnnotatorInner({ imageUrl }: { imageUrl: string }) {
  return (
    <Tldraw>
      <ImageLoader imageUrl={imageUrl} />
    </Tldraw>
  )
}
