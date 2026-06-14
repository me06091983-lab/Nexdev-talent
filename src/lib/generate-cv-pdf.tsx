import React from 'react'
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

// ─── Brand ───────────────────────────────────────────────────────────────────

const NAVY  = '#0B1A33'
const CYAN  = '#2AA3FF'
const WHITE = '#FFFFFF'
const DARK  = '#1A1A2E'
const GRAY  = '#888888'
const GRAY_LIGHT = '#CCCCCC'

const A4_H = 841.92
const SIDEBAR_W = '29%'
const PAD_TOP    = 20
const PAD_BOTTOM = 18
const PAD_SIDE   = 14
const PAD_MAIN   = 18

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CVExperiencePDF {
  role: string
  company: string
  start_date: string | null
  end_date: string | null
  is_present: boolean
  location: string | null
  description: string | null
}

export interface CVCertificationPDF {
  name: string
  issuer: string | null
  date_obtained: string | null
}

export interface CVEducationPDF {
  degree: string
  institution: string
  year?: string | null
}

export interface CVDataPDF {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  seniority: string | null
  profile_name: string | null
  profile_summary: string
  skills: string[]
  languages: string[]
  education: CVEducationPDF[]
  experiences: CVExperiencePDF[]
  certifications: CVCertificationPDF[]
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: WHITE,
    fontFamily: 'Helvetica',
  },
  // Fixed navy background — absolute, repeats on every page via `fixed` prop
  sidebarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: A4_H,
    backgroundColor: NAVY,
  },
  row: {
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_W,
    paddingHorizontal: PAD_SIDE,
  },
  main: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: PAD_MAIN,
  },
  // ── Sidebar ───────────────────────────────────────────────────────────────
  logoRow: {
    flexDirection: 'row',
    marginBottom: 1,
    marginTop: 2,
  },
  logoNex: { fontSize: 22, color: CYAN,  fontFamily: 'Helvetica-Bold' },
  logoDev: { fontSize: 22, color: WHITE, fontFamily: 'Helvetica-Bold' },
  logoTagline: {
    fontSize: 8, color: CYAN, letterSpacing: 2, marginBottom: 16,
  },
  sHead: {
    fontSize: 7.5,
    color: CYAN,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: CYAN,
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 5,
    marginTop: 12,
  },
  sTxt: { fontSize: 8, color: WHITE, marginBottom: 3, lineHeight: 1.4 },
  sTxtDim: { fontSize: 7.5, color: GRAY_LIGHT, marginBottom: 2, lineHeight: 1.3 },
  sBulletRow: { flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start' },
  sBulletDot: { fontSize: 8, color: CYAN, width: 9, paddingTop: 0.5 },
  sBulletTxt: { fontSize: 8, color: WHITE, flex: 1, lineHeight: 1.3 },
  // ── Main col ─────────────────────────────────────────────────────────────
  candidateName: {
    fontSize: 22, color: NAVY, fontFamily: 'Helvetica-Bold',
    marginTop: 2, marginBottom: 2, lineHeight: 1.1,
  },
  candidateTitle: { fontSize: 11, color: CYAN, marginBottom: 4 },
  mHead: {
    fontSize: 8,
    color: CYAN,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    borderBottomWidth: 1.5,
    borderBottomColor: CYAN,
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginTop: 12,
    marginBottom: 6,
  },
  profileText: { fontSize: 8.5, color: DARK, lineHeight: 1.55 },
  // Experience
  expBlock: { marginBottom: 9 },
  expHeaderRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  expRole:    { fontSize: 9.5, color: DARK, fontFamily: 'Helvetica-Bold' },
  expSep:     { fontSize: 9.5, color: GRAY, marginLeft: 3, marginRight: 3 },
  expCompany: { fontSize: 9.5, color: CYAN, fontFamily: 'Helvetica-Bold' },
  expDates:   {
    fontSize: 7.5, color: GRAY, fontFamily: 'Helvetica-Oblique',
    marginTop: 2, marginBottom: 3,
  },
  expBulletRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-start' },
  expBulletDot: { fontSize: 8, color: DARK, width: 10, paddingTop: 1 },
  expBulletTxt: { fontSize: 8, color: DARK, flex: 1, lineHeight: 1.4 },
  toolsRow:   { flexDirection: 'row', marginTop: 3, flexWrap: 'wrap' },
  toolsLabel: { fontSize: 7.5, color: CYAN, fontFamily: 'Helvetica-Bold' },
  toolsVal:   { fontSize: 7.5, color: DARK, flex: 1 },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null, present: boolean, isEnd: boolean): string {
  if (isEnd && present) return 'Present'
  if (!d) return '?'
  const [y, m] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return m ? `${months[parseInt(m) - 1]} ${y}` : y
}

function dateRange(exp: CVExperiencePDF): string {
  return `${fmtDate(exp.start_date, false, false)} – ${fmtDate(exp.end_date, exp.is_present, true)}`
}

function stripLinkedIn(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SBullet({ text }: { text: string }) {
  return (
    <View style={s.sBulletRow}>
      <Text style={s.sBulletDot}>▪</Text>
      <Text style={s.sBulletTxt}>{text}</Text>
    </View>
  )
}

// Keeps the section heading together with the FIRST item only — prevents orphaned headings.
// Remaining items flow freely across pages.
function SidebarSection({ title, items, renderItem }: {
  title: string
  items: unknown[]
  renderItem: (item: unknown, i: number) => React.ReactNode
}) {
  if (items.length === 0) return null
  return (
    <>
      {/* Heading + first item stay together */}
      <View wrap={false}>
        <Text style={s.sHead}>{title}</Text>
        {renderItem(items[0], 0)}
      </View>
      {/* Rest flows freely */}
      {items.slice(1).map((item, i) => (
        <React.Fragment key={i + 1}>{renderItem(item, i + 1)}</React.Fragment>
      ))}
    </>
  )
}

function ExpBlock({ exp }: { exp: CVExperiencePDF }) {
  const { bullets, tools } = parseExpDescription(exp.description)
  const dateStr = dateRange(exp) + (exp.location ? `  ·  ${exp.location}` : '')

  return (
    <View style={s.expBlock}>
      {/* Title row + dates stay together — won't leave a dangling role name */}
      <View wrap={false}>
        <View style={s.expHeaderRow}>
          <Text style={s.expRole}>{exp.role}</Text>
          <Text style={s.expSep}>|</Text>
          <Text style={s.expCompany}>{exp.company}</Text>
        </View>
        <Text style={s.expDates}>{dateStr}</Text>
        {/* First bullet stays with the header */}
        {bullets[0] && (
          <View style={s.expBulletRow}>
            <Text style={s.expBulletDot}>•</Text>
            <Text style={s.expBulletTxt}>{bullets[0]}</Text>
          </View>
        )}
      </View>
      {/* Rest of bullets flow freely */}
      {bullets.slice(1).map((b, i) => (
        <View key={i} style={s.expBulletRow}>
          <Text style={s.expBulletDot}>•</Text>
          <Text style={s.expBulletTxt}>{b}</Text>
        </View>
      ))}
      {tools && (
        <View style={s.toolsRow}>
          <Text style={s.toolsLabel}>Tools & Technologies: </Text>
          <Text style={s.toolsVal}>{tools}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

function CVDocument({ c }: { c: CVDataPDF }) {
  const titleParts = [
    c.profile_name,
    c.seniority ? c.seniority.charAt(0).toUpperCase() + c.seniority.slice(1) : null,
  ].filter(Boolean).join(' · ')

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Navy sidebar background — fixed repeats on every page,
            covers full height including page padding zones */}
        <View fixed style={s.sidebarBg} />

        <View style={s.row}>

          {/* ── Left sidebar ── */}
          <View style={s.sidebar}>
            <View style={s.logoRow}>
              <Text style={s.logoNex}>NEX</Text>
              <Text style={s.logoDev}>DEV</Text>
            </View>
            <Text style={s.logoTagline}>talent</Text>

            {/* Contact */}
            <View wrap={false}>
              <Text style={[s.sHead, { marginTop: 0 }]}>Contact</Text>
              {c.phone        && <Text style={s.sTxt}>{c.phone}</Text>}
              {c.email        && <Text style={s.sTxt}>{c.email}</Text>}
              {c.location     && <Text style={s.sTxt}>{c.location}</Text>}
              {c.linkedin_url && <Text style={s.sTxt}>{stripLinkedIn(c.linkedin_url)}</Text>}
            </View>

            {/* Core Skills */}
            <SidebarSection
              title="Core Skills"
              items={c.skills}
              renderItem={(sk) => <SBullet key={String(sk)} text={String(sk)} />}
            />

            {/* Languages */}
            <SidebarSection
              title="Languages"
              items={c.languages}
              renderItem={(l) => <SBullet key={String(l)} text={String(l)} />}
            />

            {/* Education */}
            <SidebarSection
              title="Education"
              items={c.education}
              renderItem={(ed) => {
                const e = ed as CVEducationPDF
                return (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={s.sTxt}>{e.degree}</Text>
                    <Text style={s.sTxtDim}>{e.institution}{e.year ? ` · ${e.year}` : ''}</Text>
                  </View>
                )
              }}
            />

            {/* Certifications */}
            <SidebarSection
              title="Certifications"
              items={c.certifications}
              renderItem={(cert) => {
                const ct = cert as CVCertificationPDF
                return (
                  <View style={{ marginBottom: 4 }}>
                    <SBullet text={ct.name} />
                    {(ct.issuer || ct.date_obtained) && (
                      <Text style={[s.sTxtDim, { paddingLeft: 9 }]}>
                        {[ct.issuer, ct.date_obtained?.slice(0, 7)].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                )
              }}
            />
          </View>

          {/* ── Right main column ── */}
          <View style={s.main}>
            {/* Header — name + title kept together */}
            <View wrap={false}>
              <Text style={s.candidateName}>{c.first_name} {c.last_name}</Text>
              {titleParts ? <Text style={s.candidateTitle}>{titleParts}</Text> : null}

              {/* Profile heading + summary kept together */}
              <Text style={s.mHead}>Profile</Text>
              <Text style={s.profileText}>{c.profile_summary}</Text>
            </View>

            {/* Professional Experience — heading + first exp kept together,
                subsequent experiences flow freely across as many pages as needed */}
            {c.experiences.length > 0 && (
              <>
                <View wrap={false}>
                  <Text style={s.mHead}>Professional Experience</Text>
                  <ExpBlock exp={c.experiences[0]} />
                </View>
                {c.experiences.slice(1).map((exp, i) => (
                  <ExpBlock key={i} exp={exp} />
                ))}
              </>
            )}
          </View>

        </View>
      </Page>
    </Document>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateCVPdf(c: CVDataPDF): Promise<Buffer> {
  const buffer = await renderToBuffer(<CVDocument c={c} />)
  return Buffer.from(buffer)
}
