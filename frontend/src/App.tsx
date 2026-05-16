import { ValidatePage } from './pages/ValidatePage'

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-wide">BGS Check Export</h1>
          <p className="text-blue-200 text-sm">ระบบตรวจสอบข้อมูลสุขภาพ 43 แฟ้มมาตรฐาน</p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ValidatePage />
      </main>
    </div>
  )
}
