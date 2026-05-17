// Factual directory of NHSO (สปสช.) online-service links.
// Source: https://www.nhso.go.th/th/agency-th/online-service
// Categories flagged `revenue: true` are the ones relevant to revenue-collection work
// (งานจัดเก็บรายได้) and are surfaced first in the UI.

export interface NhsoLink {
  name: string
  url: string
  category: string
  revenue: boolean
}

const REVENUE = true
const OTHER = false

export const NHSO_LINKS: NhsoLink[] = [
  // --- เบิกจ่ายชดเชยค่าบริการ (revenue) ---
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'ส่งข้อมูลการให้บริการผู้ป่วยนอก OP/PP', url: 'https://op.nhso.go.th/op/main/MainWebAction.do' },
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'E-Claim ปี 2552 เป็นต้นไป', url: 'https://eclaim.nhso.go.th/webComponent/' },
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'ฝ่ายตรวจสอบก่อนการจ่ายชดเชยค่าบริการ', url: 'https://claim.nhso.go.th' },
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'ระบบบูรณาการธุรกรรม Seamless for DMIS', url: 'https://seamlessfordmis.nhso.go.th/seamlessfordmis/faces/login.jsf' },
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'ระบบตรวจสอบและยืนยันการเข้ารับบริการ New Authen Code', url: 'https://authenservice.nhso.go.th/authencode/#/login' },
  { category: 'เบิกจ่ายชดเชยค่าบริการ', revenue: REVENUE, name: 'Emergency Claim Online (UCEP)', url: 'https://ucep.nhso.go.th/UCEP/#/home' },

  // --- ลงทะเบียน/ตรวจสอบสิทธิหน่วยบริการ (revenue) ---
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ระบบหน่วยบริการ สปสช. (Service Unit)', url: 'https://serviceunit-nhsodp.nhso.go.th/login' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'สถิติและรายงาน (UC Info)', url: 'https://ucinfo.nhso.go.th/ucinfo' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ค้นหาสถานพยาบาลทั้งประเทศ (กยผ.)', url: 'https://hcode.moph.go.th/code/' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'โปรแกรมค้นหาข้อมูลหน่วยบริการ (กยผ.)', url: 'https://reghosp.nhso.go.th/hospital_search/index.xhtml' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ค้นหาและจัดเครือข่ายหน่วยบริการ (Mastercup Online)', url: 'https://ossmastercup.nhso.go.th' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ตรวจสอบสิทธิรักษาพยาบาล (กรมบัญชีกลาง)', url: 'https://mbdb.cgd.go.th/wel/' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ทะเบียนข้อมูลเด็กพิการแต่กำเนิด (Birth Defects Registry)', url: 'http://birthdefects.nhso.go.th/BirthDefects/login.xhtml' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'ทะเบียนบุคลากรองค์กรปกครองส่วนท้องถิ่น', url: 'https://govreg.nhso.go.th/GRegister/pages/login.xhtml' },
  { category: 'ลงทะเบียน/ตรวจสอบสิทธิ', revenue: REVENUE, name: 'บันทึกข้อมูลทะเบียนบุคลากรของหน่วยงานรัฐ', url: 'https://gregister.nhso.go.th/' },

  // --- ตรวจสอบและคุณภาพ (revenue) ---
  { category: 'ตรวจสอบและคุณภาพ', revenue: REVENUE, name: 'ระบบอุทธรณ์สำหรับหน่วยบริการ (OSR)', url: 'https://audit.nhso.go.th/osrappeal/frontend/#/auth/login' },
  { category: 'ตรวจสอบและคุณภาพ', revenue: REVENUE, name: 'ระบบประเมินคุณภาพเวชระเบียน (MRA)', url: 'https://mra.nhso.go.th/MRA/' },
  { category: 'ตรวจสอบและคุณภาพ', revenue: REVENUE, name: 'ระบบตรวจสอบเวชระเบียนอิเล็กทรอนิกส์ (eMA)', url: 'https://audit.nhso.go.th/ema/' },
  { category: 'ตรวจสอบและคุณภาพ', revenue: REVENUE, name: 'ลิงก์บริการ สกส. (CHI)', url: 'https://www.chi.or.th/' },

  // --- บริหารงบประมาณ (revenue) ---
  { category: 'บริหารงบประมาณ', revenue: REVENUE, name: 'รายงานการจ่ายเงินกองทุน (2566-ปัจจุบัน)', url: 'https://smt.nhso.go.th/smtf/#/bs/' },
  { category: 'บริหารงบประมาณ', revenue: REVENUE, name: 'ระบบรายงานการใช้เงินค่าบริการ Investment Budget', url: 'https://ucapps.nhso.go.th/InvestmentBudget/production/' },

  // --- ศูนย์ข้อมูล ---
  { category: 'ศูนย์ข้อมูล', revenue: OTHER, name: 'ข้อมูลพื้นฐานหน่วยบริการ (CPP)', url: 'https://cpp.nhso.go.th/index.xhtml' },
  { category: 'ศูนย์ข้อมูล', revenue: OTHER, name: 'แบบรายงาน สปสช. 0110 รง.5', url: 'http://dc.nhso.go.th/datacenter/entry.jsp' },
  { category: 'ศูนย์ข้อมูล', revenue: OTHER, name: 'ระบบร้องเรียน (Data Center)', url: 'http://dc.nhso.go.th/datacenter/entry.jsp' },

  // --- ระบบยาและเวชภัณฑ์ ---
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'กองทุนยาและเวชภัณฑ์วัคซีน', url: 'http://drugfund.nhso.go.th/drugfund/firstLogin' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'โปรแกรมยาจิตเวช', url: 'https://drug.nhso.go.th/drugserver/' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'โปรแกรมยาต้านพิษ', url: 'https://drug.nhso.go.th/Antidotes/' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'โปรแกรมยา clopidogrel', url: 'https://drug.nhso.go.th/drugserver/' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'สืบค้นรหัสยามาตรฐาน', url: 'https://drug.nhso.go.th/DrugCode/' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'ระบบข้อมูลการจ่ายยาตามใบสั่งแพทย์ (ร้านยาออนไลน์)', url: 'https://prescription.nhso.go.th/Prescription/login' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'ระบบข้อมูลพื้นฐาน LAB Catalogue', url: 'https://catalogue.nhso.go.th/labcatalogue/' },
  { category: 'ระบบยาและเวชภัณฑ์', revenue: OTHER, name: 'ระบบข้อมูลพื้นฐาน Drug Catalogue', url: 'https://drug.nhso.go.th/drugcatalogue/' },

  // --- ระบบบันทึกข้อร้องเรียน (CRM) ---
  { category: 'ระบบบันทึกข้อร้องเรียน', revenue: OTHER, name: 'โปรแกรม CRM: สำหรับหน่วยบริการภายนอก', url: 'https://nhso.my.site.com/partner' },
  { category: 'ระบบบันทึกข้อร้องเรียน', revenue: OTHER, name: 'โปรแกรม CRM: สำหรับเจ้าหน้าที่ สปสช.', url: 'https://nhso.my.salesforce.com' },

  // --- บริหารจัดการโรค ---
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบบันทึกข้อมูล Hemophilia', url: 'https://dmis.nhso.go.th/portal/login' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบบันทึกข้อมูล Cleft Lip Cleft Palate', url: 'https://dmis.nhso.go.th/portal/login' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบบันทึก HIV/AIDS (NAPPLUS)', url: 'https://dmis.nhso.go.th/NAPPLUS/login.jsp' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบรายงานข้อมูล HIV/AIDS (NAP WEB REPORT)', url: 'http://napdl.nhso.go.th/NAPWebReport/LoginServlet' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบบันทึกข้อมูล CKD DMIS', url: 'https://ucapps4.nhso.go.th/disease2/FrmDmisLogin.jsp' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบรายงานข้อมูล CKD REPORT', url: 'https://ucapps4.nhso.go.th/CKDWebReport/LoginServlet' },
  { category: 'บริหารจัดการโรค', revenue: OTHER, name: 'ระบบสารสนเทศ TB DATA HUB', url: 'https://tbdatahub.nhso.go.th/tbdatahuboln' },

  // --- กองทุนท้องถิ่น ---
  { category: 'กองทุนท้องถิ่น', revenue: OTHER, name: 'ระบบหลักประกันสุขภาพในระดับท้องถิ่น (อบต.)', url: 'https://obt.nhso.go.th/obt/home' },
  { category: 'กองทุนท้องถิ่น', revenue: OTHER, name: 'เว็บไซต์หลัก อปท.', url: 'https://portal.nhso.go.th/lgo/pages/index.xhtml' },
  { category: 'กองทุนท้องถิ่น', revenue: OTHER, name: 'ระบบดูแลผู้สูงอายุและผู้มีภาวะพึ่งพิง (LTC)', url: 'https://ltcnew.nhso.go.th/' },
  { category: 'กองทุนท้องถิ่น', revenue: OTHER, name: 'บริหารจัดการกองทุนฟื้นฟูสมรรถภาพระดับจังหวัด', url: 'https://pfr.nhso.go.th/pfr/index.htm' },

  // --- ส่งเสริมสุขภาพป้องกันโรค ---
  { category: 'ส่งเสริมสุขภาพป้องกันโรค', revenue: OTHER, name: 'ติดตามผลการให้ยาไทรอยด์สำหรับเด็กแรกเกิด', url: 'http://tsh.nhso.go.th/tsh/' },
  { category: 'ส่งเสริมสุขภาพป้องกันโรค', revenue: OTHER, name: 'ระบบบูรณาการการคัดกรองความผิดปกติ NPRP', url: 'http://nprp.nhso.go.th/nprp' },

  // --- ฟื้นฟูสมรรถภาพ ---
  { category: 'ฟื้นฟูสมรรถภาพ', revenue: OTHER, name: 'รายงานอุปกรณ์คนพิการและการให้บริการฟื้นฟู', url: 'https://portal.nhso.go.th/disability/' },

  // --- โครงการพิเศษ ---
  { category: 'โครงการพิเศษ', revenue: OTHER, name: 'โครงการพัฒนาชุดสิทธิประโยชน์ (UCBP)', url: 'https://ucbp.nhso.go.th/' },

  // --- คณะกรรมการ ---
  { category: 'คณะกรรมการ', revenue: OTHER, name: 'อนุกรรมการตรวจสอบรับข้อร้องเรียน', url: 'https://portal.nhso.go.th/cplain/login/index.jsp' },

  // --- แบบสอบถาม ---
  { category: 'แบบสอบถาม', revenue: OTHER, name: 'แบบสอบถามความพึงพอใจการใช้งานของ สปสช. (IT)', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeSFdgMgveks0MiKQ0eJ92ca_JL3-vZTOBX-6zQHcpLTu6mLQ/viewform' },
]

/** Case-insensitive filter on link name. Empty/whitespace query returns all links. */
export function searchLinks(query: string): NhsoLink[] {
  const q = query.trim().toLowerCase()
  if (!q) return NHSO_LINKS
  return NHSO_LINKS.filter(l => l.name.toLowerCase().includes(q))
}

export interface NhsoLinkGroup {
  category: string
  revenue: boolean
  links: NhsoLink[]
}

/**
 * Groups links by category, preserving first-seen order, but listing every
 * revenue-related category before every non-revenue category.
 */
export function groupByCategory(links: NhsoLink[]): NhsoLinkGroup[] {
  const groups: NhsoLinkGroup[] = []
  for (const link of links) {
    let group = groups.find(g => g.category === link.category)
    if (!group) {
      group = { category: link.category, revenue: link.revenue, links: [] }
      groups.push(group)
    }
    group.links.push(link)
  }
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => Number(b.g.revenue) - Number(a.g.revenue) || a.i - b.i)
    .map(({ g }) => g)
}
