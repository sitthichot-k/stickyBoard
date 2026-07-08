# หยุดใช้งาน AWS + ล้างให้เป็น $0 — จับมือทำทีละสเต็ป

คู่มือปิดโปรเจกต์บน AWS ให้เรียบร้อยและ**ไม่มีค่าใช้จ่ายค้าง** — สำรองข้อมูลก่อน แล้ว
ลบ EC2 พร้อมทรัพยากรที่อาจแอบคิดเงินต่อ (ดิสก์ EBS, Elastic IP, snapshot)

> จะทำตอนไหนก็ได้ ไม่ต้องรอ Free Tier หมด · โค้ดอยู่บน GitHub อยู่แล้ว deploy ใหม่ได้เสมอ
> (ดู [AWS_DEPLOY.md](AWS_DEPLOY.md))

---

## ภาพรวม 5 สเต็ป

```
1. สำรองข้อมูล (backup DB → ดึงลงเครื่อง)   →  2. Terminate EC2
3. ล้าง EBS volume / Elastic IP / snapshot  →  4. เช็กบิลให้เป็น $0
5. (ทีหลัง) กู้คืน + deploy ใหม่ เมื่ออยากกลับมา
```

⚠️ **Terminate = ลบถาวร กู้ไม่ได้** — ทำสเต็ป 1 (backup) ให้เสร็จก่อนเสมอ

---

## สเต็ป 1 — สำรองข้อมูลก่อนลบ

**1a. บนเซิร์ฟเวอร์** — ดัมพ์ MongoDB เป็นไฟล์เดียว:

```bash
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongodump --db stickyBoard --archive | gzip > ~/backup-$(date +%F).gz
ls -lh ~/backup-*.gz          # เช็กว่าไฟล์ถูกสร้าง (ขนาด > 0)
```

**1b. จากเครื่องคุณ (PowerShell)** — ดึงไฟล์ลงมาเก็บ:

```powershell
scp -i "C:\Users\donut\Downloads\sticky-key.pem" `
  ubuntu@13.212.221.74:~/backup-*.gz "C:\Users\donut\Downloads\"
```

> เก็บ `backup-*.gz` ไว้ให้ดี — นี่คือข้อมูลทั้งหมด (users, sheets, notes, settings ฯลฯ)
> ส่วนโค้ด/config ไม่ต้องห่วง อยู่บน GitHub แล้ว

**1c. เช็กว่ามีอะไรค้างที่ยังไม่ได้ commit/push ไหม** (ถ้าเคยแก้ไฟล์บนเซิร์ฟเวอร์):

```bash
cd ~/sticky-board && git status
```
ถ้ามีของแก้บนเซิร์ฟเวอร์ที่อยากเก็บ ให้ commit/push ก่อน (หรือ scp ไฟล์นั้นลงมา)

---

## สเต็ป 2 — Terminate EC2 instance

1. คอนโซล AWS → **EC2 → Instances**
2. เลือกเครื่อง `sticky-board`
3. เมนู **Instance state → Terminate (delete) instance** → ยืนยัน
4. สถานะจะเปลี่ยนเป็น **Shutting-down → Terminated** (รอสักครู่)

จากจุดนี้ค่า compute หยุดทันที ✅ แต่ยัง**ต้องเช็กสเต็ป 3** ให้ครบ

> **Terminate ไม่ใช่ Stop:** Stop = แค่พักเครื่อง (ดิสก์ยังคิดเงิน ~$2-3/เดือน) · Terminate = ลบทิ้งถาวร → มุ่งสู่ $0

---

## สเต็ป 3 — ล้างทรัพยากรที่อาจคิดเงินต่อ

Terminate EC2 อย่างเดียวไม่พอ ต้องไล่เช็ก 3 จุดนี้:

### 3a. EBS Volume (ดิสก์)
- EC2 → เมนูซ้าย **Elastic Block Store → Volumes**
- root volume ปกติถูกลบตาม instance อัตโนมัติ (Delete on termination) — แต่**เช็กให้ชัวร์**ว่าไม่มี volume สถานะ `Available` ค้างอยู่
- ถ้ามีค้าง → เลือก → **Actions → Delete volume** (volume ที่ไม่ผูกเครื่อง = คิดเงินต่อ)

### 3b. Elastic IP (ถ้าเคยจอง)
- EC2 → **Network & Security → Elastic IPs**
- ถ้ามี IP ค้างอยู่ (ไม่ผูกกับเครื่องแล้ว = คิดเงิน) → เลือก → **Actions → Release Elastic IP address**
- ถ้าไม่เคยจอง Elastic IP หน้านี้จะว่าง (ข้ามได้)

### 3c. Snapshots / AMIs (ถ้าเคยสร้างเอง)
- EC2 → **Snapshots** และ **AMIs**
- ลบอันที่ไม่ใช้ (ถ้าไม่เคยสร้าง snapshot/backup image เอง หน้านี้จะว่าง)

> Security group กับ Key pair **ไม่มีค่าใช้จ่าย** — จะเก็บไว้หรือลบก็ได้

---

## สเต็ป 4 — ยืนยันว่าเป็น $0

1. คอนโซล → ค้นหา **Billing** (Billing and Cost Management)
2. ดู **Bills** เดือนปัจจุบัน → ควรไม่มีรายการ EC2/EBS/EIP เพิ่มหลังจากนี้
3. ดู **Free Tier** → เช็กว่าไม่มีบริการไหนใกล้/เกินโควต้า
4. Budget **Zero spend** ที่ตั้งไว้จะเตือนอีเมลทันทีถ้ามีค่าใช้จ่ายโผล่มา

> ค่าใช้จ่ายที่เกิดไปแล้วก่อนลบ (ถ้ามี) จะยังขึ้นในบิลเดือนนั้นตามจริง — หลังลบครบจะไม่มีเพิ่ม

---

## สเต็ป 5 — กลับมาใหม่ทีหลัง (กู้คืน + deploy ซ้ำ)

อยากรันอีกครั้ง:

1. สร้าง EC2 + ติดตั้ง Docker + clone โค้ด + ตั้ง `.env` ตาม [AWS_DEPLOY.md](AWS_DEPLOY.md) (สเต็ป 1–6)
2. สตาร์ตสแตก:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
3. **กู้ข้อมูลกลับ** — ส่งไฟล์ backup ขึ้นเครื่องใหม่ก่อน (`scp` แบบสเต็ป 1b แต่สลับทิศ) แล้ว:
   ```bash
   gunzip -c backup-YYYY-MM-DD.gz | \
     docker compose -f docker-compose.prod.yml exec -T mongo \
     mongorestore --archive --drop
   ```
   (`--drop` = ล้างข้อมูลเดิมก่อน restore ป้องกันข้อมูลซ้ำ)
4. อย่าลืมแก้ `FRONTEND_ORIGIN` ใน `.env` เป็น **IP เครื่องใหม่** (Public IP เปลี่ยนทุกครั้งที่สร้างเครื่องใหม่)

---

## เช็กลิสต์สุดท้าย

- [ ] Backup DB แล้ว (`backup-*.gz` อยู่ในเครื่องคุณ)
- [ ] ของที่แก้บนเซิร์ฟเวอร์ commit/push หรือดึงลงมาแล้ว
- [ ] EC2 instance = **Terminated**
- [ ] EBS Volumes = ไม่มีค้าง (`Available`)
- [ ] Elastic IP = ปล่อย (Release) แล้ว / ไม่มี
- [ ] Snapshots / AMIs = ลบแล้ว / ไม่มี
- [ ] Billing = ไม่มีรายการเพิ่ม · Budget alert ยังเปิดอยู่
