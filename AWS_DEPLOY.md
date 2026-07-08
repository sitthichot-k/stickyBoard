# Deploy ขึ้น AWS (Free Tier) — จับมือทำทีละสเต็ป

คู่มือ deploy **Sticky Board** ขึ้น AWS EC2 หนึ่งเครื่องด้วย Docker Compose
โดยใช้ทรัพยากรที่อยู่ในกรอบ **Free Tier** (12 เดือนแรก)

สแตกที่ deploy: **frontend (nginx) + backend (Node) + MongoDB** รวมในเครื่องเดียว
(ตัด `ai-detector` ออก — เพิ่มทีหลังได้) เข้าเว็บผ่าน **IP** ก่อน แล้วค่อยต่อโดเมน/HTTPS

```
[ browser ] --http:80--> [ nginx (frontend) ] --/api--> [ backend:8081 ] --> [ mongo:27017 ]
                          เปิดออกเน็ตแค่พอร์ต 80        └──── เครือข่ายภายใน compose ────┘
```

ไฟล์ที่ใช้: [docker-compose.prod.yml](docker-compose.prod.yml) + [.env.prod.example](.env.prod.example)

---

## 💰 เรื่องเงิน — อ่านก่อนเริ่ม

ทำได้ฟรีใน **12 เดือนแรก** ถ้าเลือกทรัพยากรตามตารางนี้:

| ทรัพยากร | Free Tier ให้ | ที่เราใช้ |
|---|---|---|
| EC2 **t3.micro / t2.micro** | 750 ชม./เดือน (รัน 1 เครื่อง 24/7) | ✅ 1 เครื่อง |
| EBS ดิสก์ | 30 GB | ✅ 30 GB |
| Public IPv4 | 750 ชม./เดือน (12 เดือนแรก) | ✅ 1 IP |
| Data transfer ออก | ~100 GB/เดือน | ✅ แอปเล็กใช้ไม่ถึง |
| MongoDB (self-host) | รันในเครื่องเดิม | ✅ ไม่มีค่า managed DB |

**⚠️ กับดักที่ต้องระวัง**

1. ฟรีแค่ **12 เดือนแรก** — พ้นปีเริ่มคิดเงิน (~$7.5/เดือน + IP ~$3.6 + ดิสก์ ~$2–3)
2. ต้องเลือก instance ที่มีป้าย **"Free tier eligible"** (t3.micro/t2.micro) — เผลอกดตัวใหญ่กว่า = เสียเงินทันที
3. Public IPv4 ฟรีแค่ปีแรก หลังจากนั้น ~$3.6/เดือนต่อ IP
4. ใช้ Region **Singapore `ap-southeast-1`** (รองรับ Free Tier ครบ) — Region ใหม่บางตัวอาจไม่รวม
5. บัญชีใหม่ (สมัครหลังกลางปี 2025) อาจได้โมเดล **เครดิต $100 / 6 เดือน** แทน — เช็กที่ **Billing → Free Tier**

**👉 ทำก่อนเลย:** คอนโซล AWS → ค้นหา **Budgets** → **Create budget** → **Zero spend budget** → ใส่อีเมล → Create
(เตือนทันทีที่มีค่าใช้จ่ายเกิน $0 กันบิลช็อก)

---

## สิ่งที่ต้องมี

- บัญชี AWS (ผูกบัตรแล้ว)
- โค้ดโปรเจกต์อยู่บน GitHub (repo ส่วนตัวได้)
- เครื่อง Windows ที่มี `ssh` ในตัว (Windows 10/11 มีอยู่แล้ว)

---

## สเต็ป 1 — สร้างเครื่อง EC2 (Free Tier)

1. เข้า [console.aws.amazon.com](https://console.aws.amazon.com) → ล็อกอิน
2. มุมขวาบนเลือก Region **Asia Pacific (Singapore) `ap-southeast-1`**
3. ค้นหา **EC2** → **Launch instance** → ตั้งค่า:

| ช่อง | ค่า |
|------|-----|
| **Name** | `sticky-board` |
| **AMI** | **Ubuntu Server 24.04 LTS** (64-bit x86) — มีป้าย *Free tier eligible* |
| **Instance type** | **t3.micro** — ต้องมีป้าย ✅ *Free tier eligible* |
| **Key pair** | **Create new key pair** → ชื่อ `sticky-key` → **RSA / .pem** → **Download** เก็บไฟล์ให้ดี (โหลดได้ครั้งเดียว!) |
| **Network settings** (Edit) | ✅ Allow SSH → Source **My IP** · ✅ Allow HTTP → Source **Anywhere** |
| **Storage** | **30 GB** gp3 (ไม่เกินโควต้าฟรี) |

4. **Launch instance** → เมนู **Instances** → รอสถานะ **Running**
5. คลิกเครื่อง จด **Public IPv4 address** ไว้ (เช่น `13.250.xx.xx`) — ใช้ตลอดคู่มือ

> t3.micro มีแค่ **1 GB RAM** เดี๋ยวเราเพิ่ม swap ในสเต็ป 3 เพื่อให้ build frontend ไม่พัง

---

## สเต็ป 2 — SSH เข้าเครื่อง (จาก Windows PowerShell)

สมมติไฟล์คีย์อยู่ที่ `C:\Users\<you>\Downloads\sticky-key.pem`:

```powershell
# ล็อกสิทธิ์ไฟล์คีย์ให้เฉพาะเราอ่านได้ (ทำครั้งเดียว) — ไม่งั้น ssh จะปฏิเสธ
icacls "$env:USERPROFILE\Downloads\sticky-key.pem" /inheritance:r
icacls "$env:USERPROFILE\Downloads\sticky-key.pem" /grant:r "$($env:USERNAME):(R)"

# เข้าเครื่อง (แทน <PUBLIC_IP> ด้วย IP จริง)
ssh -i "$env:USERPROFILE\Downloads\sticky-key.pem" ubuntu@<PUBLIC_IP>
```

ครั้งแรกถามยืนยัน host → พิมพ์ `yes` เมื่อเห็น prompt `ubuntu@ip-xxx:~$` = เข้ามาแล้ว 🎉

> **ทางเลือก:** หน้า Instances → ปุ่ม **Connect → EC2 Instance Connect** เปิด terminal ในเบราว์เซอร์ได้เลย
> (ถ้าตั้ง SSH = My IP อาจต้องเปลี่ยนเป็น Anywhere ก่อน — วิธี PowerShell ด้านบนเสถียรกว่า)

---

## สเต็ป 3 — เพิ่ม Swap แล้วติดตั้ง Docker

**3a. เพิ่ม swap 2 GB** (สำคัญสำหรับ t3.micro 1 GB — กัน build frontend ค้าง/พัง)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab   # ให้ swap ติดถาวรหลัง reboot
free -h                                                       # ควรเห็น Swap: 2.0Gi
```

**3b. ติดตั้ง Docker + Compose plugin**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER      # รัน docker ได้โดยไม่ต้อง sudo
```

**ออกแล้วเข้าใหม่** ให้สิทธิ์กลุ่มมีผล:

```bash
exit
```
แล้ว `ssh ...` กลับเข้าไป → เช็ก:

```bash
docker --version
docker compose version
```

---

## สเต็ป 4 — ดึงโค้ดขึ้นเครื่อง (private repo ด้วย deploy key)

```bash
# สร้าง SSH key บนเซิร์ฟเวอร์
ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/id_ed25519 -N ""

# แสดง public key แล้วก็อปทั้งบรรทัด
cat ~/.ssh/id_ed25519.pub
```

เปิด GitHub → repo → **Settings → Deploy keys → Add deploy key** → วาง public key →
**ไม่ต้อง**ติ๊ก "Allow write access" → Add

กลับมาที่เซิร์ฟเวอร์ (แทน `<user>/<repo>` ด้วยของจริง):

```bash
git clone git@github.com:<user>/<repo>.git sticky-board
cd sticky-board
```
(ครั้งแรกถาม host ของ github.com → พิมพ์ `yes`)

> ทางเลือก Personal Access Token: `git clone https://<TOKEN>@github.com/<user>/<repo>.git sticky-board`

---

## สเต็ป 5 — ตั้งค่า `.env`

```bash
cp .env.prod.example .env      # docker compose อ่าน .env อัตโนมัติ; ไฟล์นี้ถูก gitignore

openssl rand -hex 32           # รัน 2 ครั้ง เก็บค่าไว้ (สำหรับ JWT_SECRET และ MAIL_SECRET)
openssl rand -hex 32

nano .env
```

แก้ในไฟล์ `.env` 4 จุด:

```ini
FRONTEND_ORIGIN=http://<PUBLIC_IP>      # IP เครื่องจากสเต็ป 1 (ไม่ต้องมี :port)
JWT_SECRET=<ค่า openssl ชุดที่ 1>
MAIL_SECRET=<ค่า openssl ชุดที่ 2>
SEED_ADMIN_PASSWORD=<รหัสผ่านแอดมินที่แข็งแรง>
```

เซฟใน nano: **Ctrl+O → Enter → Ctrl+X**

---

## สเต็ป 6 — Build แล้วรัน

```bash
# build + สตาร์ตทั้งสแตก (ครั้งแรก ~5-10 นาทีบน t3.micro)
docker compose -f docker-compose.prod.yml up -d --build

# สร้างแอดมิน + ข้อมูลเริ่มต้น (รันครั้งเดียว)
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

เช็ก:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend   # ออกด้วย Ctrl+C
curl http://localhost/api/v1/health                         # ควรได้ JSON status ok
```

---

## สเต็ป 7 — เปิดเว็บ

เบราว์เซอร์ → **`http://<PUBLIC_IP>`** → ล็อกอิน:

- อีเมล: `SEED_ADMIN_EMAIL` (ดีฟอลต์ `admin@example.com`)
- รหัสผ่าน: `SEED_ADMIN_PASSWORD` ที่ตั้งไว้

เข้าได้ = สำเร็จ 🎉

---

## สเต็ป 8 — คำสั่งดูแลประจำ

```bash
# ดู log
docker compose -f docker-compose.prod.yml logs -f backend

# รีสตาร์ต / หยุด
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml down          # หยุด (ข้อมูล mongo ยังอยู่)

# อัปเดตเวอร์ชันใหม่ (หลัง push ขึ้น GitHub)
git pull
docker compose -f docker-compose.prod.yml up -d --build

# สำรอง MongoDB → ไฟล์ .gz
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongodump --db stickyBoard --archive | gzip > backup-$(date +%F).gz
```

> ⚠️ **อย่า**ใช้ `down -v` เว้นแต่ตั้งใจลบข้อมูลทั้งหมด (`-v` ลบ volume `mongo-data` ทิ้ง)

---

## สเต็ป 9 — ก้าวต่อไป (ทำเมื่อพร้อม)

- **โดเมน + HTTPS** — ชี้ A record มาที่ IP แล้ววาง **Caddy** หน้าสุด (auto Let's Encrypt) เปลี่ยน `FRONTEND_ORIGIN` เป็น `https://...`
- **ยก DB ไป MongoDB Atlas** (managed + backup อัตโนมัติ) — เปลี่ยน `MONGODB_URI` แล้วตัด service `mongo` ออก
- **Backup อัตโนมัติ** — ใส่คำสั่ง mongodump ใน cron + อัปขึ้น S3
- **เพิ่ม ai-detector** — ต้องมีทางให้ cloud เข้าถึงกล้อง RTSP (VPN) และเครื่องแรงพอ (YOLO)

---

## แก้ปัญหาเบื้องต้น

| อาการ | เช็ก |
|---|---|
| เว็บเปิดไม่ขึ้น | Security group เปิด **HTTP 80 = Anywhere** แล้วจริงไหม |
| `docker: permission denied` | ยังไม่ได้ออก/เข้า ssh ใหม่หลัง `usermod -aG docker` |
| build ค้าง/ถูก kill | ยังไม่ได้ทำ swap (สเต็ป 3a) — `free -h` เช็ก |
| login ไม่ได้ | รัน `npm run seed` แล้วหรือยัง · ดู `logs backend` |
| SSH เข้าไม่ได้หลังเปลี่ยนเน็ต | IP บ้านเปลี่ยน → แก้ Source ของ SSH ใน Security group เป็น IP ใหม่ |
