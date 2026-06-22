'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, useEditor, createShapeId, AssetRecordType } from 'tldraw'

function ImageLoader({ imageUrl }: { imageUrl: string }) {
  const editor = useEditor()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !editor) return
    loaded.current = true

    const img = new Image()
    img.onload = () => {
      const assetId = AssetRecordType.createId()
      editor.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: { name: 'background', src: imageUrl, w: img.naturalWidth, h: img.naturalHeight, mimeType: 'image/png', isAnimated: false },
        meta: {},
      }])
      editor.createShape({
        id: createShapeId(),
        type: 'image',
        x: 0, y: 0,
        isLocked: true,
        props: { assetId, w: img.naturalWidth, h: img.naturalHeight },
      })
      editor.zoomToFit()
    }
    img.src = imageUrl
  }, [editor, imageUrl])

  return null
}

export default function TldrawAnnotatorInner({ imageUrl }: { imageUrl: string }) {
  return (
    <Tldraw persistenceKey="gawe-annotator">
      <ImageLoader imageUrl={imageUrl} />
    </Tldraw>
  )
}
