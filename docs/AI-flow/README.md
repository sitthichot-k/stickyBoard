# AI Working Flow

How AI is driven on this project: a strict, phase-by-phase workflow with scoped
prompts and a fixed result summary. Follow it for every feature so changes stay
small, reviewable, and safe.

## Working Mode

ทำงานเป็น 3 เฟสเท่านั้น:

1. Backend
2. Frontend
3. Test + Docs

ห้ามสั่งรวมทุกเฟสในครั้งเดียว

## Rules for Every AI Prompt

- ต้องระบุ `Feature` และ `FR` ที่อ้างอิงจาก PRD
- ต้องระบุ `Scope` และ `Out of Scope`
- ห้ามแก้ไฟล์นอกขอบเขต
- ห้าม refactor ใหญ่ถ้าไม่จำเป็น
- ต้องสรุปผลลัพธ์ 4 หัวข้อทุกครั้ง:
  1. ไฟล์ที่แก้
  2. สิ่งที่เปลี่ยน
  3. วิธีทดสอบ (command + expected result)
  4. ความเสี่ยง/ผลกระทบ

## Prompt Template (Reusable)

```txt
อ้างอิง PRD: docs/PRD-stickyNote.md
Feature: [ชื่อโมดูล]
FR: [FR-NEW-001, FR-NEW-002]

รอบนี้ทำเฉพาะ [Backend|Frontend|Test/Docs] เท่านั้น

Scope:
- [รายการงาน]

Out of Scope:
- [สิ่งที่ไม่ให้ทำ]

Constraints:
- ห้ามแก้นอก scope
- ห้าม refactor ไฟล์ที่ไม่เกี่ยวข้อง
- รักษา API/behavior เดิมที่ไม่เกี่ยวข้อง

เมื่อเสร็จ ให้สรุป 4 หัวข้อ:
1) ไฟล์ที่แก้
2) สิ่งที่เปลี่ยน
3) วิธีทดสอบ (command + expected result)
4) ความเสี่ยง/ผลกระทบ
```

## Execution Checklist

1. เตรียม FR ใน PRD ให้ชัดก่อนเริ่มงาน
2. สั่ง AI เฟส Backend และรีวิว diff
3. ทดสอบ backend endpoint ที่เพิ่ม/แก้
4. สั่ง AI เฟส Frontend และรีวิว diff
5. ทดสอบ UI flow เทียบกับ FR
6. สั่ง AI เฟส Test + Docs
7. รัน regression test ที่เกี่ยวข้อง
8. Commit แยกตามโมดูลหรือฟีเจอร์

## Definition of Done (Per Feature)

- ฟีเจอร์ทำงานครบตาม FR ที่อ้างอิง
- ไม่มีผลกระทบกับฟีเจอร์เดิมที่ไม่เกี่ยวข้อง
- มี test หรือขั้นตอนทดสอบที่ทำซ้ำได้
- มีสรุปไฟล์ที่แก้และความเสี่ยงชัดเจน
