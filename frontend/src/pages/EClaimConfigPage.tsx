import { ConfigCatalog } from '../components/shared/ConfigCatalog'

export function EClaimConfigPage() {
  return (
    <ConfigCatalog
      apiBase="/api/eclaim-config"
      sidebarTitle="ตั้งค่าข้อมูลพื้นฐาน ส่ง E-Claim"
    />
  )
}
