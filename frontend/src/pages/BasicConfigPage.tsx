import { ConfigCatalog } from '../components/shared/ConfigCatalog'

interface BasicConfigPageProps {
  /** Optional category key to pre-select (passed from App via deep-link nav). */
  initialCategoryKey?: string
}

export function BasicConfigPage({ initialCategoryKey }: BasicConfigPageProps = {}) {
  return (
    <ConfigCatalog
      apiBase="/api/basic-config"
      sidebarTitle="ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม"
      initialCategoryKey={initialCategoryKey}
    />
  )
}
