import { ConfigCatalog } from '../components/shared/ConfigCatalog'

export function BasicConfigPage() {
  return (
    <ConfigCatalog
      apiBase="/api/basic-config"
      sidebarTitle="ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม"
    />
  )
}
