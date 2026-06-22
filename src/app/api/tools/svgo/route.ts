import { NextRequest, NextResponse } from 'next/server'
import { optimize } from 'svgo'

export async function POST(req: NextRequest) {
  try {
    const { svg } = await req.json() as { svg: string }
    if (!svg || typeof svg !== 'string') {
      return NextResponse.json({ error: 'Missing svg field' }, { status: 400 })
    }
    const result = optimize(svg, { multipass: true, plugins: ['preset-default'] })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
