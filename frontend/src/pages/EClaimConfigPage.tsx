import { ConfigCatalog } from '../components/shared/ConfigCatalog'

interface EClaimConfigPageProps {
  /** Optional category key to pre-select (passed from App via deep-link nav). */
  initialCategoryKey?: string
}

export function EClaimConfigPage({ initialCategoryKey }: EClaimConfigPageProps = {}) {
  return (
    <ConfigCatalog
      apiBase="/api/eclaim-config"
      sidebarTitle="ตั้งค่าข้อมูลพื้นฐาน ส่ง E-Claim"
      relatedLinks={[
        { label: 'หน่วยบริการ FDH (สธ.)', url: 'https://fdh.moph.go.th/hospital/' },
      ]}
      initialCategoryKey={initialCategoryKey}
    />
  )
}
