'use client'

import { useEffect, useMemo, useCallback, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps, ToolDefinition, CategoryDefinition, CategoryId } from '@/types'
import { useHistory } from '@/hooks/useHistory'
import { useToolState } from '@/hooks/useToolState'
import { usePreferences } from '@/hooks/usePreferences'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'
import { analytics } from '@/lib/analytics'

type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>

const toolMap: Partial<Record<CategoryId, Record<string, ToolLoader>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    'json-converter': () => import('@/components/tools/encoding/DataConverter'),
    'base64': () => import('@/components/tools/encoding/Base64'),
    'url-html-encode': () => import('@/components/tools/encoding/UrlHtmlEncode'),
    'code-beautifier': () => import('@/components/tools/encoding/CodeBeautifier'),
    'case-converter': () => import('@/components/tools/encoding/CaseConverter'),
    'line-tools': () => import('@/components/tools/encoding/LineTools'),
    'string-tools': () => import('@/components/tools/encoding/StringTools'),
    'sql-formatter': () => import('@/components/tools/encoding/SqlFormatter'),
    'schema-generator': () => import('@/components/tools/encoding/SchemaGenerator'),
    'csv-merger': () => import('@/components/tools/encoding/CsvMerger'),
  },
  dev: {
    'regex-tester': () => import('@/components/tools/dev/RegexTester'),
    'cron-builder': () => import('@/components/tools/dev/CronBuilder'),
    'timestamp-converter': () => import('@/components/tools/dev/TimestampConverter'),
    'base-converter': () => import('@/components/tools/dev/BaseConverter'),
    'color-converter': () => import('@/components/tools/dev/ColorConverter'),
    'fake-data-generator': () => import('@/components/tools/dev/FakeDataGenerator'),
    'text-diff': () => import('@/components/tools/dev/TextDiff'),
    'markdown-converter': () => import('@/components/tools/dev/MarkdownConverter'),
    'markdown-editor': () => import('@/components/tools/dev/MarkdownEditor'),
    'lorem-ipsum': () => import('@/components/tools/dev/LoremIpsum'),
    'http-reference': () => import('@/components/tools/dev/HttpReference'),
    'curl-to-code': () => import('@/components/tools/dev/CurlToCode'),
    'api-tester': () => import('@/components/tools/dev/ApiTester'),
    'protobuf-inspector': () => import('@/components/tools/dev/ProtobufInspector'),
    'ktp-mock-generator': () => import('@/components/tools/dev/KtpMockGenerator'),
  },
  crypto: {
    'hash-generator': () => import('@/components/tools/crypto/HashGenerator'),
    'password-generator': () => import('@/components/tools/crypto/PasswordGenerator'),
    'bcrypt': () => import('@/components/tools/crypto/Bcrypt'),
    'aes-encrypt': () => import('@/components/tools/crypto/AesEncrypt'),
    'jwt-decoder': () => import('@/components/tools/crypto/JwtDecoder'),
    'uuid-ulid': () => import('@/components/tools/crypto/UuidUlid'),
    'totp': () => import('@/components/tools/crypto/Totp'),
    'qr-code': () => import('@/components/tools/crypto/QrCode'),
  },
  office: {
    'pomodoro': () => import('@/components/tools/office/Pomodoro'),
    'timezone-clock': () => import('@/components/tools/office/TimezoneClock'),
    'unit-converter': () => import('@/components/tools/office/UnitConverter'),
    'date-calculator': () => import('@/components/tools/office/DateCalculator'),
    'calculator': () => import('@/components/tools/office/Calculator'),
    'csv-editor': () => import('@/components/tools/office/CsvEditor'),
    'word-counter': () => import('@/components/tools/office/WordCounter'),
    'scratchpad': () => import('@/components/tools/office/Scratchpad'),
    'meeting-cost': () => import('@/components/tools/office/MeetingCost'),
    'pastebin': () => import('@/components/tools/office/Pastebin'),
    'task-tracker': () => import('@/components/tools/office/TaskTracker'),
    'session-timer': () => import('@/components/tools/office/SessionTimer'),
    'text-cleaner': () => import('@/components/tools/office/TextCleaner'),
    'speech-timer': () => import('@/components/tools/office/SpeechTimer'),
    'hours-calculator': () => import('@/components/tools/office/HoursCalculator'),
    'income-tax-calculator': () => import('@/components/tools/office/IncomeTaxCalculator'),
    'ppn-calculator': () => import('@/components/tools/office/VatCalculator'),
  },
  visual: {
    'css-generators': () => import('@/components/tools/visual/CssGenerators'),
    'whiteboard': () => import('@/components/tools/visual/Whiteboard'),
    'mermaid': () => import('@/components/tools/visual/MermaidDiagram'),
    'image-annotator': () => import('@/components/tools/visual/ImageAnnotator'),
    'color-palette': () => import('@/components/tools/visual/ColorPalette'),
  },
  image: {
    'pdf-image-converter': () => import('@/components/tools/image/PdfImageConverter'),
    'image-converter': () => import('@/components/tools/image/ImageConverter'),
    'image-resize': () => import('@/components/tools/image/ImageResize'),
    'svg-tools': () => import('@/components/tools/image/SvgTools'),
    'image-base64': () => import('@/components/tools/image/ImageBase64'),
    'exif-remover': () => import('@/components/tools/image/ExifRemover'),
    'pdf-splitter': () => import('@/components/tools/image/PdfTools'),
  },
  education: {
    'quadratic-solver': () => import('@/components/tools/education/QuadraticSolver'),
    'matrix-calculator': () => import('@/components/tools/education/MatrixCalculator'),
    'scientific-calculator': () => import('@/components/tools/education/ScientificCalculator'),
    'statistics-calculator': () => import('@/components/tools/education/StatisticsCalculator'),
    'molar-mass': () => import('@/components/tools/education/MolarMassCalculator'),
    'physics-solver': () => import('@/components/tools/education/PhysicsSolver'),
    'citation-generator': () => import('@/components/tools/education/CitationGenerator'),
    'gpa-calculator': () => import('@/components/tools/education/GpaCalculator'),
  },
}

interface ToolPageClientProps {
  tool: ToolDefinition
  category: CategoryDefinition
  toolSlug: string
  categorySlug: string
}

export function ToolPageClient({ tool, category, toolSlug, categorySlug }: ToolPageClientProps) {
  const { add: addHistory } = useHistory(tool.id)
  const { state: toolState, update: updateToolState } = useToolState(tool.id)
  const { addRecent } = usePreferences()

  useEffect(() => {
    addRecent(tool.id)
    analytics.toolView(categorySlug, toolSlug)
  }, [tool.id, addRecent, categorySlug, toolSlug])

  const handleOutput = useCallback((
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    addHistory(inputs, outputs)
    updateToolState(inputs)
    analytics.toolUse(categorySlug, toolSlug)
  }, [addHistory, updateToolState, categorySlug, toolSlug])

  const loader = toolMap[categorySlug as CategoryId]?.[toolSlug]

  const ToolComponent = useMemo(() => loader
    ? dynamic(loader, {
        ssr: false,
        loading: () => (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading tool…
          </div>
        ),
      })
    : null,
  // loader is derived from static toolMap + route params : stable per page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [toolSlug, categorySlug])

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={tool} category={category} />
      <div className="flex-1 overflow-auto p-6">
        {ToolComponent ? (
          <ToolComponent
            onOutput={handleOutput}
            initialState={Object.keys(toolState).length > 0 ? toolState : undefined}
          />
        ) : (
          <ToolPlaceholder tool={tool} category={category} />
        )}
      </div>
    </div>
  )
}
