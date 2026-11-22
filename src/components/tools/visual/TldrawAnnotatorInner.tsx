'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, createShapeId, AssetRecordType, type Editor } from 'tldraw'

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

function loadImage(editor: Editor, imageUrl: string) {
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
}

export default function TldrawAnnotatorInner({ imageUrl, onEditor }: { imageUrl: string; onEditor?: (editor: Editor) => void }) {
  const done = useRef(false)
  useEffect(() => { done.current = false }, [imageUrl])
  return (
    <Tldraw
      licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
      onMount={(editor) => {
        onEditor?.(editor)
        if (done.current) return
        done.current = true
        loadImage(editor, imageUrl)
      }}
    />
  )
}
