import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

// ─── Brand ───────────────────────────────────────────────────────────────────

const NAVY  = '0B1A33'
const CYAN  = '2AA3FF'
const WHITE = 'FFFFFF'
const DARK  = '1A1A2E'
const GRAY  = '888888'
const FONT  = 'Calibri'

// ─── Page geometry (A4 twips) ────────────────────────────────────────────────

const PAGE_W = 11906
const M_TOP  = convertInchesToTwip(0.4)
const M_BOT  = convertInchesToTwip(0.4)
const M_LEFT = 0
const M_RIGHT = convertInchesToTwip(0.5)

const USABLE = PAGE_W - M_LEFT - M_RIGHT
const L_COL  = Math.round(USABLE * 0.295)
const R_COL  = USABLE - L_COL

const PAD_L  = convertInchesToTwip(0.18)  // sidebar inner padding
const PAD_R  = convertInchesToTwip(0.22)  // main col inner padding

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CVExperience {
  role: string
  company: string
  start_date: string | null
  end_date: string | null
  is_present: boolean
  location: string | null
  description: string | null
}

export interface CVCertification {
  name: string
  issuer: string | null
  date_obtained: string | null
}

export interface CVCandidate {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  seniority: string | null
  profile_name: string | null
  skills: string[]
  languages: string[]
  education: { degree: string; institution: string } | null
  experiences: CVExperience[]
  certifications: CVCertification[]
  profile_summary: string        // AI-generated or manually provided
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sp(before = 0, after = 0) { return { before, after } }

function noBorder() {
  const s = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const
  return { top: s, bottom: s, left: s, right: s }
}

function fmtDate(d: string | null, present: boolean, isEnd: boolean): string {
  if (isEnd && present) return 'Present'
  if (!d) return '?'
  const [y, m] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return m ? `${months[parseInt(m) - 1]} ${y}` : y
}

function dateRange(exp: CVExperience): string {
  return `${fmtDate(exp.start_date, false, false)} – ${fmtDate(exp.end_date, exp.is_present, true)}`
}

function stripLinkedIn(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

// ─── Sidebar builders ────────────────────────────────────────────────────────

function sHead(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: CYAN, font: FONT, size: 18, allCaps: true })],
    spacing: sp(220, 80),
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: CYAN } },
  })
}

function sTxt(text: string, opts?: { bold?: boolean; size?: number; color?: string; after?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, color: opts?.color ?? WHITE, font: FONT, size: opts?.size ?? 17 })],
    spacing: sp(0, opts?.after ?? 40),
  })
}

function sBullet(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '▪ ', color: CYAN, font: FONT, size: 17 }),
      new TextRun({ text, color: WHITE, font: FONT, size: 17 }),
    ],
    spacing: sp(0, 36),
  })
}

function sEmpty(h = 80): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: sp(0, h) })
}

// ─── Right-col builders ──────────────────────────────────────────────────────

function rHead(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: CYAN, font: FONT, size: 22, allCaps: true })],
    spacing: sp(240, 80),
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: CYAN } },
  })
}

function rPara(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string; size?: number; after?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic, color: opts?.color ?? DARK, font: FONT, size: opts?.size ?? 19 })],
    spacing: sp(0, opts?.after ?? 60),
  })
}

function expHeader(role: string, company: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: role, bold: true, color: DARK, font: FONT, size: 20 }),
      new TextRun({ text: '  |  ', color: GRAY, font: FONT, size: 20 }),
      new TextRun({ text: company, bold: true, color: CYAN, font: FONT, size: 20 }),
    ],
    spacing: sp(220, 20),
  })
}

function expBullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'exp-bullet', level: 0 },
    children: [new TextRun({ text, color: DARK, font: FONT, size: 18 })],
    spacing: sp(0, 36),
  })
}

function toolsLine(tools: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: 'Tools & Technologies: ', bold: true, color: CYAN, font: FONT, size: 18 }),
      new TextRun({ text: tools, color: DARK, font: FONT, size: 18 }),
    ],
    spacing: sp(50, 80),
  })
}

// ─── Parse experience description ────────────────────────────────────────────

function parseExpDescription(raw: string | null): { bullets: string[]; tools: string | null } {
  if (!raw?.trim()) return { bullets: [], tools: null }
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  let tools: string | null = null
  const bullets: string[] = []
  for (const line of lines) {
    if (/^tools\s*(&|and)?\s*tech/i.test(line)) {
      tools = line.replace(/^tools\s*(&|and)?\s*technologies?:\s*/i, '').trim()
    } else {
      const clean = line.replace(/^[•\-\*▪]\s*/, '')
      if (clean) bullets.push(clean)
    }
  }
  return { bullets, tools }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateCVDocx(c: CVCandidate): Promise<Buffer> {

  // ── Sidebar content ──
  const sidebarChildren: Paragraph[] = [

    // Logo area — styled NEXDEV text (swap for ImageRun when logo PNG is available)
    new Paragraph({
      children: [
        new TextRun({ text: 'NEX', bold: true, color: CYAN, font: FONT, size: 52 }),
        new TextRun({ text: 'DEV', bold: true, color: WHITE, font: FONT, size: 52 }),
      ],
      spacing: sp(40, 4),
    }),
    new Paragraph({
      children: [new TextRun({ text: 'talent', color: CYAN, font: FONT, size: 20 })],
      spacing: sp(0, 180),
    }),

    // Contact
    sHead('Contact'),
    ...(c.phone    ? [sTxt(c.phone)]    : []),
    ...(c.email    ? [sTxt(c.email)]    : []),
    ...(c.location ? [sTxt(c.location)] : []),
    ...(c.linkedin_url ? [sTxt(stripLinkedIn(c.linkedin_url))] : []),

    // Core Skills
    ...(c.skills.length > 0 ? [
      sHead('Core Skills'),
      ...c.skills.map(s => sBullet(s)),
    ] : []),

    // Languages
    ...(c.languages.length > 0 ? [
      sHead('Languages'),
      ...c.languages.map(l => sBullet(l)),
    ] : []),

    // Education
    ...(c.education ? [
      sHead('Education'),
      sTxt(c.education.degree, { bold: true, after: 20 }),
      sTxt(c.education.institution, { size: 16, color: 'CCCCCC' }),
    ] : []),

    // Certifications
    ...(c.certifications.length > 0 ? [
      sHead('Certifications'),
      ...c.certifications.map(cert => sBullet(cert.name)),
    ] : []),

    sEmpty(40),
  ]

  // ── Right column content ──
  const rightChildren: Paragraph[] = [

    // Name
    new Paragraph({
      children: [new TextRun({ text: `${c.first_name} ${c.last_name}`, bold: true, color: NAVY, font: FONT, size: 52 })],
      spacing: sp(40, 20),
    }),

    // Title
    new Paragraph({
      children: [new TextRun({
        text: [c.profile_name, c.seniority ? `${c.seniority.charAt(0).toUpperCase()}${c.seniority.slice(1)}` : null]
          .filter(Boolean).join(' · '),
        bold: false,
        color: CYAN,
        font: FONT,
        size: 26,
      })],
      spacing: sp(0, 40),
    }),

    // Profile
    rHead('Profile'),
    rPara(c.profile_summary, { after: 80 }),

    // Experience
    ...(c.experiences.length > 0 ? [
      rHead('Professional Experience'),
      ...c.experiences.flatMap(exp => {
        const { bullets, tools } = parseExpDescription(exp.description)
        return [
          expHeader(exp.role, exp.company),
          rPara(dateRange(exp), { italic: true, color: GRAY, size: 18, after: 60 }),
          ...bullets.map(b => expBullet(b)),
          ...(tools ? [toolsLine(tools)] : []),
        ]
      }),
    ] : []),
  ]

  // ── Assemble document ──
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'exp-bullet',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 360, hanging: 280 },
            },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: M_TOP, right: M_RIGHT, bottom: M_BOT, left: M_LEFT },
        },
      },
      children: [
        new Table({
          width: { size: USABLE, type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                // Left — navy sidebar
                new TableCell({
                  width: { size: L_COL, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  shading: { fill: NAVY, type: ShadingType.SOLID, color: NAVY },
                  margins: { top: PAD_L, bottom: PAD_L, left: PAD_L, right: PAD_L },
                  borders: noBorder(),
                  children: sidebarChildren,
                }),
                // Right — main content
                new TableCell({
                  width: { size: R_COL, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  shading: { fill: WHITE, type: ShadingType.SOLID, color: WHITE },
                  margins: { top: PAD_R, bottom: PAD_R, left: PAD_R, right: PAD_R },
                  borders: noBorder(),
                  children: rightChildren,
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
