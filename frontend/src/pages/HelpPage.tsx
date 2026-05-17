export function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-2 space-y-8 text-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-1">ช่วยเหลือ — คู่มือการใช้งาน</h1>
        <p className="text-sm text-gray-500">ระบบตรวจสอบการส่งออกข้อมูลมาตรฐาน · BGS Check Export</p>
      </div>

      {/* ─── Section 1: Overview ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-3">1. ภาพรวมระบบ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-semibold text-blue-800 mb-1">✅ ระบบตรวจสอบ 43 แฟ้ม</p>
            <p className="text-sm text-gray-700">ตรวจสอบความถูกต้องของข้อมูลก่อนส่งออก เช่น รหัสที่ยังไม่ได้จับคู่ โครงสร้างแฟ้มข้อมูลมาตรฐาน 43 แฟ้ม ตามมาตรฐาน สปสช.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">🗂️ ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม</p>
            <p className="text-sm text-gray-700">จับคู่รหัสข้อมูลใน HIS กับรหัสมาตรฐาน สปสช. เช่น อาชีพ ศาสนา สิทธิการรักษา คลินิก ยา และอื่นๆ ที่ใช้ในแฟ้มส่งออก 43 แฟ้ม</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">💳 ส่ง E-Claim</p>
            <p className="text-sm text-gray-700">จับคู่รหัสข้อมูล HIS สำหรับการส่ง E-Claim ได้แก่ สิทธิการรักษา สถานะสมรส คลินิก รายการยา รายการค่ารักษาพยาบาล และเหตุผลการสั่งยา NED</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">🔗 ลิงก์บริการ สปสช.</p>
            <p className="text-sm text-gray-700">รวมลิงก์เว็บไซต์และระบบที่เกี่ยวข้องกับงานจัดเก็บรายได้ สปสช. เพื่อความสะดวกในการเข้าใช้งาน</p>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Mapping table guide ──────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-3">2. วิธีใช้ตารางจับคู่รหัส</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-blue-600 font-bold mt-0.5">→</span>
            <p><span className="font-semibold">รหัส HIS → รหัสมาตรฐาน:</span> คอลัมน์ "รหัส" และ "ชื่อ (HIS)" คือข้อมูลจากระบบ HIS ของโรงพยาบาล คอลัมน์ "รหัสมาตรฐาน" คือรหัสที่ใช้ส่งออกตามมาตรฐาน สปสช.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-red-500 font-bold mt-0.5">⚠</span>
            <p><span className="font-semibold">ไฮไลต์แดง = ยังไม่ map:</span> แถวที่มีพื้นหลังสีแดงอ่อนและไอคอน ⚠ หมายความว่ายังไม่ได้กำหนดรหัสมาตรฐาน — ต้องจับคู่ก่อนส่งออกข้อมูล</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-blue-600 font-bold mt-0.5">⚡</span>
            <p><span className="font-semibold">ปุ่มจับคู่อัตโนมัติ:</span> ระบบจะเปรียบเทียบชื่อใน HIS กับชื่อในตารางมาตรฐาน ถ้าตรงกันพอดีจะจับคู่ให้อัตโนมัติ (ใช้ได้เฉพาะรายการที่ยังไม่ได้ map เท่านั้น)</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-gray-500 font-bold mt-0.5">🔍</span>
            <p><span className="font-semibold">ช่องค้นหา:</span> พิมพ์ข้อความเพื่อกรองรายการ รองรับการค้นหาจากรหัส ชื่อ และรหัสมาตรฐาน ทั้งภาษาไทยและภาษาอังกฤษ</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-gray-500 font-bold mt-0.5">↕</span>
            <p><span className="font-semibold">คลิกหัวคอลัมน์เพื่อเรียง:</span> คลิกที่ชื่อคอลัมน์เพื่อเรียงลำดับจากน้อยไปมาก หรือมากไปน้อย คลิกซ้ำเพื่อสลับทิศทาง</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-blue-500 font-bold mt-0.5">⇔</span>
            <p><span className="font-semibold">ปรับขนาดคอลัมน์:</span> ลากขอบขวาของหัวคอลัมน์เพื่อปรับความกว้าง ระบบจะจำค่าไว้สำหรับครั้งถัดไป</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-green-600 font-bold mt-0.5">✏</span>
            <p><span className="font-semibold">พิมพ์รหัสเองได้แม้ไม่มีในตัวเลือก:</span> ในช่องเลือกรหัสมาตรฐาน หากพิมพ์รหัสที่ไม่มีในรายการ แล้วกด Enter หรือคลิกออก ระบบจะบันทึกรหัสนั้นตรงๆ — เหมาะสำหรับรหัสที่ยังไม่ปรากฏในตารางอ้างอิง</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="shrink-0 text-orange-500 font-bold mt-0.5">💾</span>
            <p><span className="font-semibold">การบันทึกจะเขียนกลับ HIS ทันที:</span> เมื่อเลือกหรือพิมพ์รหัสมาตรฐาน ระบบจะส่ง PUT request ไปยัง API และเขียนค่ากลับลงฐานข้อมูล HIS โดยตรง — ไม่ต้องกดปุ่มบันทึกแยกต่างหาก</p>
          </div>
        </div>
      </section>

      {/* ─── Section 3: Pending categories ───────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-3">3. หมวดที่แก้ไขไม่ได้ (pending)</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
          <p>หมวดที่มีจุดสีเหลือง <span className="inline-block w-2 h-2 rounded-full bg-amber-400 align-middle" /> ในเมนูด้านซ้ายคือหมวดที่ยัง <span className="font-semibold">ยังไม่พร้อมแก้ไข</span></p>
          <p>สาเหตุหลัก: ยังไม่ได้ยืนยันการจับคู่รหัสกับฐานข้อมูล หรือโครงสร้างตารางไม่รองรับการแก้ไขแบบอัตโนมัติ</p>
          <p>ผู้ดูแลระบบสามารถดูข้อมูลได้ แต่ระบบจะไม่อนุญาตให้บันทึกการเปลี่ยนแปลงจนกว่าจะได้รับการยืนยัน</p>
        </div>
      </section>

      {/* ─── Section 4: Theme ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-3">4. การเปลี่ยนธีมสี</h2>
        <p className="text-sm text-gray-700">
          ที่มุมบนขวาของหน้าจอมีเมนูเลือกธีม สามารถเปลี่ยนสีของแถบด้านบน (header) ได้ตามความชอบ
          ระบบจะจำธีมที่เลือกไว้ในเบราว์เซอร์ — แม้ปิดแล้วเปิดใหม่ก็ยังคงธีมเดิม
        </p>
      </section>

      <p className="text-xs text-gray-400 pt-2 border-t">BGS Check Export · พัฒนาเพื่อโรงพยาบาล BGS · สงวนลิขสิทธิ์</p>
    </div>
  )
}
