const AREAS = [
  { icon: '✅', title: 'ระบบตรวจสอบ 43 แฟ้ม', desc: 'ตรวจความถูกต้องของข้อมูลก่อนส่งออก — โครงสร้างแฟ้ม 43 แฟ้มมาตรฐาน สปสช. และรหัสที่ยังไม่ได้จับคู่', tone: 'a' },
  { icon: '🗂️', title: 'ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม', desc: 'จับคู่รหัสใน HIS กับรหัสมาตรฐาน สปสช. เช่น อาชีพ ศาสนา สิทธิการรักษา คลินิก ยา ฯลฯ', tone: 'b' },
  { icon: '💳', title: 'ส่ง E-Claim', desc: 'จับคู่รหัสสำหรับส่ง E-Claim: สิทธิการรักษา สถานะสมรส คลินิก รายการยา ค่ารักษา และเหตุผลการสั่งยา NED', tone: 'b' },
  { icon: '🔗', title: 'ลิงก์บริการ สปสช.', desc: 'รวมลิงก์เว็บไซต์/ระบบที่เกี่ยวกับงานจัดเก็บรายได้ สปสช. ในที่เดียว', tone: 'b' },
]

const STEPS = [
  { n: 1, title: 'เลือกหมวดข้อมูล', desc: 'เปิดเมนู "ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม" แล้วเลือกหมวดที่ต้องการ เช่น อาชีพ หรือ สิทธิการรักษา' },
  { n: 2, title: 'จับคู่รหัสมาตรฐาน', desc: 'แถวสีแดง = ยังไม่จับคู่ เลือกรหัสมาตรฐานจากช่อง หรือกด "จับคู่อัตโนมัติ" ให้ระบบช่วย' },
  { n: 3, title: 'ตรวจก่อนส่งออก', desc: 'เมื่อไม่เหลือแถวแดง ไปที่ "ระบบตรวจสอบ 43 แฟ้ม" เพื่อตรวจความถูกต้องสุดท้าย' },
]

const TIPS = [
  { icon: '⚠', color: 'text-red-500', title: 'ไฮไลต์แดง = ยังไม่ map', desc: 'แถวพื้นแดงอ่อน + ไอคอน ⚠ คือยังไม่ได้กำหนดรหัสมาตรฐาน ต้องจับคู่ก่อนส่งออก' },
  { icon: '⚡', color: 'text-amber-500', title: 'จับคู่อัตโนมัติ', desc: 'ระบบเทียบชื่อ HIS กับชื่อมาตรฐาน ถ้าตรงพอดีจะจับคู่ให้ (เฉพาะรายการที่ยังไม่ map)' },
  { icon: '✏', color: 'text-green-600', title: 'พิมพ์รหัสเองได้', desc: 'ถ้ารหัสไม่มีในตัวเลือก พิมพ์แล้วกด Enter/คลิกออก ระบบบันทึกรหัสนั้นให้ทันที' },
  { icon: '🔍', color: 'text-gray-500', title: 'ค้นหา', desc: 'พิมพ์เพื่อกรองรายการ ค้นจากรหัส ชื่อ และรหัสมาตรฐาน รองรับไทย/อังกฤษ' },
  { icon: '↕', color: 'text-gray-500', title: 'เรียงลำดับ', desc: 'คลิกหัวคอลัมน์เพื่อเรียง คลิกซ้ำเพื่อสลับน้อย↔มาก' },
  { icon: '⇔', color: 'text-sky-500', title: 'ปรับขนาดคอลัมน์', desc: 'ลากขอบขวาหัวคอลัมน์เพื่อปรับความกว้าง ระบบจำค่าไว้ให้' },
  { icon: '💾', color: 'text-orange-500', title: 'บันทึกอัตโนมัติ', desc: 'เลือก/พิมพ์รหัสแล้วเขียนกลับ HIS ทันที ไม่ต้องกดปุ่มบันทึกแยก' },
  { icon: '🎨', color: 'text-purple-500', title: 'เปลี่ยนธีมสี', desc: 'เมนูมุมขวาบนเปลี่ยนสีแถบหัวได้ ระบบจำธีมไว้ในเบราว์เซอร์' },
]

export function HelpPage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 text-gray-800 pb-10">
      {/* Hero */}
      <section className="app-header text-white rounded-2xl px-7 py-8 shadow-lg">
        <p className="text-white/70 text-sm font-medium tracking-wide">BGS CHECK EXPORT</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 leading-snug">ยินดีต้อนรับ 👋 มาเริ่มใช้งานกัน</h1>
        <p className="text-white/85 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          ระบบช่วยจับคู่รหัสข้อมูลโรงพยาบาลกับรหัสมาตรฐาน สปสช. และตรวจความถูกต้องก่อนส่งออก
          43 แฟ้ม — คู่มือนี้สรุปทุกอย่างที่ผู้ใช้งานใหม่ต้องรู้ใน 2 นาที
        </p>
      </section>

      {/* Quick start */}
      <section>
        <h2 className="text-lg font-bold app-accent-text mb-4">🚀 เริ่มใช้งานใน 3 ขั้นตอน</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(s => (
            <div key={s.n} className="relative bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="app-accent-bg app-accent-text w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg mb-3">
                {s.n}
              </div>
              <p className="font-semibold text-gray-800">{s.title}</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Areas */}
      <section>
        <h2 className="text-lg font-bold app-accent-text mb-4">🧭 ระบบมีอะไรบ้าง</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {AREAS.map(a => (
            <div
              key={a.title}
              className={`rounded-xl p-5 border shadow-sm bg-white ${a.tone === 'a' ? 'border-2 app-accent-border' : 'border-gray-200'}`}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <p className={`font-semibold ${a.tone === 'a' ? 'app-accent-text' : 'text-gray-800'}`}>{a.title}</p>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-lg font-bold app-accent-text mb-4">💡 เคล็ดลับใช้ตารางจับคู่รหัส</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map(t => (
            <div key={t.title} className="flex gap-3 items-start bg-white rounded-lg border border-gray-200 p-4">
              <span className={`shrink-0 text-xl font-bold ${t.color}`}>{t.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending callout */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="font-bold text-amber-800 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
          หมวดที่ยังแก้ไขไม่ได้ (pending)
        </h2>
        <p className="text-sm text-amber-800 mt-2 leading-relaxed">
          หมวดที่มีจุดสีเหลืองในเมนูซ้ายคือยัง <span className="font-semibold">ไม่พร้อมแก้ไข</span> —
          เพราะยังไม่ได้ยืนยันการจับคู่ หรือโครงสร้างตารางไม่รองรับการแก้แบบปลอดภัย
          ดูข้อมูลได้ แต่ระบบจะไม่ให้บันทึกจนกว่าจะยืนยัน (ป้องกันข้อมูลหลักเสียหาย)
        </p>
      </section>

      <p className="text-xs text-gray-400 pt-2 border-t">
        BGS Check Export · พัฒนาเพื่อโรงพยาบาล BGS · ต้องการความช่วยเหลือเพิ่มเติม ติดต่อผู้ดูแลระบบ
      </p>
    </div>
  )
}
