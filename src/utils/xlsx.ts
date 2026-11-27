// 외부 라이브러리 없이 .xlsx(Office Open XML) 파일을 만드는 최소 구현.
// 시트 1개, 문자열·숫자 셀, 병합 셀, 열 너비, 간단한 서식(머리글/본문/퍼센트)을 지원한다.

export type XlsxCellStyle = 'header' | 'body' | 'percent' | 'title'
export type XlsxCell = { value: string | number | null; style?: XlsxCellStyle }
export type XlsxSheet = {
  name: string
  rows: XlsxCell[][]
  /** 열 너비(문자 수 기준) */
  columnWidths?: number[]
  /** 병합 범위, 예: 'A1:D1' */
  merges?: string[]
  /** 머리글 고정 행 수 */
  freezeRows?: number
}

const styleIndex: Record<XlsxCellStyle, number> = { body: 1, header: 2, percent: 3, title: 4 }

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function columnName(index: number) {
  let name = ''
  let value = index + 1
  while (value > 0) {
    const rest = (value - 1) % 26
    name = String.fromCharCode(65 + rest) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

function sheetXml(sheet: XlsxSheet) {
  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const pane = sheet.freezeRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : ''
  const rows = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`
      const style = cell.style ? ` s="${styleIndex[cell.style]}"` : ''
      if (cell.value === null || cell.value === '') return `<c r="${ref}"${style}/>`
      if (typeof cell.value === 'number') return `<c r="${ref}"${style}><v>${cell.value}</v></c>`
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((range) => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`
}

const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>'
  + '<fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="13"/><name val="맑은 고딕"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EDF9"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC9D3DF"/></left><right style="thin"><color rgb="FFC9D3DF"/></right><top style="thin"><color rgb="FFC9D3DF"/></top><bottom style="thin"><color rgb="FFC9D3DF"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="5">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

function workbookFiles(sheet: XlsxSheet): [string, string][] {
  return [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', stylesXml],
    ['xl/worksheets/sheet1.xml', sheetXml(sheet)],
  ]
}

// ── ZIP(무압축, STORE) 작성 ─────────────────────────────────────

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (let index = 0; index < data.length; index += 1) crc = crcTable[(crc ^ data[index]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zip(files: [string, string][]) {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  files.forEach(([name, content]) => {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true) // UTF-8 파일명
    view.setUint16(8, 0, true) // STORE
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    chunks.push(local, data)

    const entry = new Uint8Array(46 + nameBytes.length)
    const entryView = new DataView(entry.buffer)
    entryView.setUint32(0, 0x02014b50, true)
    entryView.setUint16(4, 20, true)
    entryView.setUint16(6, 20, true)
    entryView.setUint16(8, 0x0800, true)
    entryView.setUint16(10, 0, true)
    entryView.setUint32(16, crc, true)
    entryView.setUint32(20, data.length, true)
    entryView.setUint32(24, data.length, true)
    entryView.setUint16(28, nameBytes.length, true)
    entryView.setUint32(42, offset, true)
    entry.set(nameBytes, 46)
    central.push(entry)
    offset += local.length + data.length
  })
  const centralSize = central.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  // 모든 조각을 하나의 ArrayBuffer로 합친다.
  const parts = [...chunks, ...central, end]
  const buffer = new ArrayBuffer(parts.reduce((sum, item) => sum + item.length, 0))
  const output = new Uint8Array(buffer)
  let position = 0
  parts.forEach((part) => { output.set(part, position); position += part.length })
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** 시트 하나짜리 .xlsx 파일을 만들어 브라우저 다운로드를 시작한다. */
export function downloadXlsx(fileName: string, sheet: XlsxSheet) {
  const blob = zip(workbookFiles(sheet))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 테스트·검증용: 다운로드 없이 Blob만 만든다. */
export const createXlsxBlob = (sheet: XlsxSheet) => zip(workbookFiles(sheet))
