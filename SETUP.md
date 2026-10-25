# Second Serving — Setup ứng dụng và PostgreSQL

Hướng dẫn cài đặt từ source, dành cho bản local pilot hiện tại (24/10/2026). Các lệnh bên dưới dùng PowerShell trên Windows và chạy tại thư mục chứa `package.json`, trừ khi có ghi chú khác.

Không chạy lại toàn bộ phần cài mới trên database đã có dữ liệu. Không chép đè `.env`, xóa `data/` hoặc tạo lại database chỉ để khởi động ứng dụng.

## 1. Chọn cách chạy database

| | Cách A — PostgreSQL local đi kèm | Cách B — PostgreSQL cài riêng |
|---|---|---|
| Phù hợp | Chạy thử, phát triển, quay demo trên máy | Đã có PostgreSQL hoặc dùng dịch vụ database riêng |
| Cần Docker / PostgreSQL service riêng? | Không | Cần một PostgreSQL server đang chạy; Docker không bắt buộc |
| Cổng database | `127.0.0.1:55432` theo cấu hình local tạo lần đầu | Theo server của bạn; ví dụ `127.0.0.1:5432` |
| Khởi động app | `npm run dev:local-db` | `npm start` |
| Migration | Local runner tự áp dụng | Chạy `npm run db:migrate` trước khi chạy app |
| Tạo admin lần đầu | `npm run admin:local` | `npm run admin:setup` |

Chỉ chọn một cách cho workspace bạn muốn sử dụng. Hai database khác nhau không tự chia sẻ tài khoản hoặc dữ liệu. Nếu chỉ muốn dùng thử ngay trên Windows x64, bắt đầu với **Cách A**.

## 2. Chuẩn bị chung

### 2.1. Phần mềm và source

- Node.js **22 trở lên** theo yêu cầu trong `package.json`, cùng npm. Tải bản LTS đáp ứng yêu cầu từ [trang Node.js chính thức](https://nodejs.org/en/download).
- Source đầy đủ, gồm `package.json`, `package-lock.json`, `database/`, `public/` và `.env.example`.
- Quyền ghi vào thư mục project và `data/`; kết nối mạng để tải dependencies lần đầu.

Mở terminal tại thư mục project. Ví dụ trên máy hiện tại; thay đường dẫn nếu source ở nơi khác:

```powershell
Set-Location 'F:\project\Nebius-NVDIA'
node --version
npm --version
```

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay `npm` trong các lệnh, ví dụ `npm.cmd ci`. Không cần nới chính sách bảo mật toàn máy để cài project.

### 2.2. Cài dependencies

```powershell
npm ci
```

Giữ `package-lock.json`. Với Cách A và bộ kiểm thử PostgreSQL, không dùng `--omit=dev`, không bỏ optional dependencies hoặc tắt các install script cần cho bundled PostgreSQL. Runtime database đi kèm là một devDependency.

Không cần build frontend riêng: máy chủ Node phục vụ trực tiếp các file trong `public/`.

### 2.3. Tạo `.env` nếu chưa có

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Mở `.env` bằng trình soạn thảo và chỉ sửa các trường cần thiết. Không đăng ảnh hoặc gửi nội dung file thật lên GitHub/chat. `.env` và `data/` đã được loại khỏi Git bằng `.gitignore`.

| Biến | Mục đích |
|---|---|
| `PORT` | Cổng HTTP của app; mặc định `3000` |
| `STORAGE_DRIVER` | Dùng `postgres` cho các luồng trong tài liệu này |
| `DATABASE_URL` | Chuỗi kết nối của Cách B; Cách A tự thay trong bộ nhớ khi chạy |
| `NEBIUS_API_KEY` | Khóa riêng để gọi AI; có thể để trống nếu chỉ thử thủ công |
| `NEBIUS_BASE_URL` | Endpoint Nebius Token Factory, xem mục 5 |
| `NEBIUS_MODEL` | Model dùng cho AI advice, xem mục 5 |

Nếu chưa có khóa thật, để `NEBIUS_API_KEY=` trống; không giữ giá trị mẫu `your_key_here` rồi kỳ vọng AI hoạt động. Thay đổi `.env` cần khởi động lại app.

## 3. Cách A — Chạy ngay với PostgreSQL local đi kèm

### 3.1. Khởi động database và app

Trong terminal thứ nhất:

```powershell
npm run dev:local-db
```

Local runner sẽ:

1. Tạo cụm PostgreSQL thật và database `second_serving` nếu chưa có.
2. Tạo mật khẩu database ngẫu nhiên cho role `second_serving` và lưu riêng trên máy.
3. Khởi động PostgreSQL trên loopback, mặc định `127.0.0.1:55432`.
4. Áp dụng migration, rồi khởi động app trên cổng `PORT`.

Khi thành công, terminal có thông báo tương tự:

```text
Local PostgreSQL ready on 127.0.0.1:55432. Data is persistent; credentials are not printed.
Second Serving (postgres): http://localhost:3000
```

Giữ terminal này chạy. Đây không phải database trong bộ nhớ và không phải sandbox tự xóa khi đóng app.

### 3.2. Tạo admin ứng dụng lần đầu

Mở terminal tương tác thứ hai tại cùng thư mục project, trong khi terminal thứ nhất vẫn chạy:

```powershell
npm run admin:local
```

Nhập username, mật khẩu **12–200 ký tự**, rồi xác nhận mật khẩu. Mật khẩu không hiển thị khi gõ. Sau thông báo tạo thành công, mở hoặc tải lại [Staff sign-in](http://127.0.0.1:3000/login).

Không có tài khoản admin mặc định cho bản cài mới. Tài khoản đăng nhập ứng dụng khác với role/mật khẩu PostgreSQL. Nếu báo **Admin already configured. No account was changed.**, database này đã có admin; lệnh không đổi hoặc reset mật khẩu cũ.

### 3.3. Lưu dữ liệu, dừng và chạy lại

| Đường dẫn | Nội dung | Lưu ý |
|---|---|---|
| `data/postgres/` | File của cụm PostgreSQL local | Không xóa để restart; không sao chép lúc đang chạy làm backup |
| `data/local-postgres-credentials.json` | Thông tin kết nối local được tạo lần đầu | Bí mật, không commit/chụp màn hình hoặc tự sửa để đổi mật khẩu |
| `.env` | Cấu hình app và khóa Nebius nếu có | Giữ riêng, không ghi đè khi cập nhật source |

Dừng bằng **Ctrl+C** trong terminal thứ nhất và đợi tiến trình kết thúc. Lần sau chỉ cần:

```powershell
npm run dev:local-db
```

Tài khoản và dữ liệu đã lưu được giữ lại; phiên trình duyệt cần đăng nhập lại sau khi server restart. Không cần tạo admin lại mỗi lần.

Không chạy hai local runner cùng lúc. Không tự xóa `postmaster.pid`, file database hoặc file credentials để xử lý lỗi cổng/khởi động.

### 3.4. Không trộn lệnh của hai cách

Cách A thay `DATABASE_URL` và `STORAGE_DRIVER` trong bộ nhớ, dùng credentials riêng; nó không ghi URL đó trở lại `.env`.

Vì vậy, không chạy `npm start`, `npm run db:migrate`, `npm run db:check` hoặc `npm run admin:setup` rồi cho rằng các lệnh này tự trỏ tới database local ở 55432. Chúng đọc `.env`, có thể kết nối nhầm database khác hoặc dùng URL mẫu không hợp lệ.

Với Cách A thông thường, dùng **`dev:local-db` + `admin:local`**; migration đã được local runner thực hiện. Kiểm tra app/database qua mục 6 thay vì dùng `db:check` với URL mẫu.

Local runner dùng bundled binaries; cấu hình hiện tại có gói Windows x64. Không mặc định mọi hệ điều hành/kiến trúc đều đã được kiểm thử. Nếu môi trường không có binary phù hợp, dùng Cách B. Trên Unix, không chạy PostgreSQL bằng tài khoản root.

## 4. Cách B — Dùng PostgreSQL cài riêng hoặc dịch vụ bên ngoài

### 4.1. Chuẩn bị PostgreSQL server

Cài và khởi động PostgreSQL theo hệ điều hành/nhà cung cấp. Trên Windows, xem [Windows installers từ PostgreSQL](https://www.postgresql.org/download/windows/). Cần PostgreSQL server và command-line tools nếu dùng các lệnh `psql`, `pg_dump`, `createdb`, `pg_restore` bên dưới; pgAdmin là lựa chọn GUI, không bắt buộc cho app.

Nếu đã có server, kiểm tra host, port và thông tin truy cập do người quản trị cung cấp. Project chưa công bố một phiên bản PostgreSQL tối thiểu riêng; không coi số phiên bản trong link tài liệu là yêu cầu cài đặt của app.

### 4.2. Tạo role và database riêng, chỉ cho lần cài mới

Ví dụ dưới đây dùng PostgreSQL local cổng `5432`. Đăng nhập bằng tài khoản quản trị database:

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -W
```

Trong `psql`, tạo role và database mới:

```sql
CREATE ROLE second_serving LOGIN;
\password second_serving
CREATE DATABASE second_serving OWNER second_serving;
\q
```

Lệnh `\password` hỏi mật khẩu tương tác, không cần đặt mật khẩu thật trong câu SQL. Không chạy lại phần tạo mới nếu role/database đã tồn tại; không drop chúng để bỏ qua lỗi. Với managed database, nhờ quản trị viên cấp một database/role tương đương.

### 4.3. Cấu hình kết nối trong `.env`

Sửa hai dòng sau trong `.env` hiện có, giữ nguyên các cấu hình Nebius cần dùng:

```dotenv
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://second_serving:YOUR_URL_ENCODED_DB_PASSWORD@127.0.0.1:5432/second_serving
PORT=3000
```

Thay placeholder bằng mật khẩu database thật và đúng host/port. Ký tự đặc biệt trong username/password phải được URL-encode; ví dụ ký tự `@` trong mật khẩu được ghi thành `%40`. Không dùng một web encoder công khai để nhập mật khẩu thật.

Với database từ xa, dùng cấu hình TLS được nhà cung cấp xác minh. Project không có biến `DATABASE_SSL` riêng. Không tắt kiểm tra chứng chỉ chỉ để bỏ qua lỗi TLS.

### 4.4. Tạo schema và admin, rồi chạy app

Nếu cần nhập dữ liệu JSON cũ, đọc mục 9 trước: phải import trước khi tạo tài khoản/dữ liệu mới.

Với database mới không import:

```powershell
npm run db:migrate
npm run db:check
npm run admin:setup
npm start
```

- `db:migrate` tạo schema `second_serving` và các bảng/index; role chạy migration cần quyền tạo schema và DDL trong database.
- `db:check` kiểm tra kết nối và phiên bản migration đã ghi nhận; không phải kiểm thử toàn bộ nghiệp vụ.
- `admin:setup` cần terminal tương tác, hỏi username/mật khẩu 12–200 ký tự; không ghi đè admin đã tồn tại.
- `npm start` khởi động app; nó không tự chạy migration cho database bên ngoài.

Kỳ vọng có **PostgreSQL migrations applied.**, **PostgreSQL connected; migrations: 1**, rồi **Admin created in PostgreSQL. Open /login.** khi tạo mới thành công.

Mở [Staff sign-in](http://127.0.0.1:3000/login) sau khi app chạy. Dừng app bằng Ctrl+C; PostgreSQL service bên ngoài được quản lý riêng, không tự dừng theo Node. Lần sau dùng `npm start`, không cần tạo admin lại.

Nếu chỉ cài runtime với database ngoài, có thể dùng `npm ci --omit=dev`; khi đó không có local runner/bộ kiểm thử cần bundled PostgreSQL. Môi trường phát triển và kiểm thử vẫn nên cài đủ bằng `npm ci`.

## 5. Bật AI Nebius / NVIDIA, tùy chọn

Trong `.env`:

```dotenv
NEBIUS_API_KEY=YOUR_PRIVATE_NEBIUS_KEY
NEBIUS_BASE_URL=https://api.tokenfactory.us-central1.nebius.com/v1/
NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b
```

Thay khóa mẫu bằng khóa riêng có quyền/quota phù hợp, rồi restart bằng đúng lệnh của Cách A hoặc B. Khóa ở phía server, không điền vào mã frontend hoặc tài liệu công khai.

Sau khi có chi nhánh và sự cố, mở **Incidents & recovery → AI advice**, chờ phản hồi thật và thông tin model. Yêu cầu này có thể tiêu tốn credit của nhà cung cấp. Nếu chỉ thử luồng thủ công, không cần khóa AI.

Không có phản hồi AI không đồng nghĩa database lỗi. AI advice không tự thay đổi kho, thiết bị hoặc trạng thái chuyển món.

## 6. Kiểm tra cài đặt thành công

### App và storage

1. Mở `/login` tại cổng đã cấu hình và đăng nhập bằng admin vừa tạo.
2. Kiểm tra vào được workspace `/ops`.
3. Nếu muốn kiểm tra không cần đăng nhập, dùng lệnh chỉ đọc:

```powershell
$sessionInfo = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/auth/session'
$sessionInfo | Select-Object configured, storage
```

Sau khi tạo admin, kỳ vọng `configured = True`, `storage = postgres`. Nếu đổi `PORT`, đổi cổng trong URL tương ứng. Không in toàn bộ `.env` hoặc URL chứa mật khẩu để chẩn đoán.

### Dữ liệu và các chức năng

Bản cài mới không tự có chi nhánh, món, nguyên liệu hay câu chuyện demo. Thiết lập dữ liệu thật hoặc dữ liệu thử được ghi rõ theo [USER-GUIDE.md](USER-GUIDE.md#3-thiết-lập-chi-nhánh-lần-đầu).

Bạn có thể tạo một chi nhánh thử qua UI, restart đúng cách rồi đăng nhập lại để kiểm tra dữ liệu còn được lưu. Không thực hiện thay đổi thử nghiệm trên database đang vận hành thực tế.

### Kiểm thử dành cho người phát triển

Sau `npm ci` đầy đủ:

```powershell
npm test
npm run test:postgres
```

Bộ PostgreSQL integration test dùng cụm tạm trên cổng loopback riêng, không dùng `DATABASE_URL` của database ứng dụng và chỉ dọn thư mục kiểm thử của nó. Không dùng local runner để trỏ vào database production.

## 7. Lỗi setup thường gặp

| Lỗi/hiện tượng | Kiểm tra |
|---|---|
| `node` / `npm` không nhận diện | Cài Node phù hợp, mở terminal mới và kiểm tra PATH; với lỗi `npm.ps1`, dùng `npm.cmd`. |
| Không tìm thấy `.env` | Tạo từ `.env.example` nếu chưa có; các npm script chạy server cần file này. |
| Thiếu `embedded-postgres` hoặc binary | Cài đủ bằng `npm ci`; không bỏ dev/optional dependencies. Kiểm tra OS/kiến trúc, quyền chạy binary và thông báo antivirus; không tắt bảo vệ toàn máy. |
| `Start npm run dev:local-db first.` | Khởi động và giữ local runner chạy trước khi dùng `admin:local`. |
| `DATABASE_URL is required` hoặc URL mẫu/authentication failed | Với Cách B, kiểm tra `.env`, role, password đã encode, host/port. Với Cách A, dùng đúng local runner, không `npm start` với URL mẫu. |
| Connection refused / timeout | Kiểm tra PostgreSQL đang chạy đúng host/port; Cách A mặc định 55432, Cách B theo server riêng. |
| Schema chưa khởi tạo | Cách B: chạy `npm run db:migrate` với đúng database và quyền DDL. Cách A: xem lỗi migration của local runner. |
| Permission denied khi migrate | Nhờ quản trị viên cấp quyền tạo schema/bảng cho role migration; không dùng app với superuser như giải pháp mặc định. |
| Migration checksum changed | Khôi phục đúng file migration đã áp dụng và rà soát source. Không sửa thêm migration cũ, xóa dữ liệu hoặc bỏ bảng lịch sử để lách lỗi. |
| `Admin already configured` | Dùng tài khoản đã tạo hoặc nhờ admin quản lý tài khoản trong UI; lệnh setup không phải reset password. |
| Lệnh tạo admin báo cần interactive terminal | Chạy trực tiếp trong terminal, không pipe password hoặc chạy như tác vụ không có TTY. |
| Cổng 3000 hoặc 55432 đã được dùng | Kiểm tra tiến trình đang chạy; dừng đúng app cũ từ terminal của nó. Có thể đổi `PORT` cho HTTP trong `.env`; không tự xóa dữ liệu hoặc credentials để giải quyết xung đột DB. |
| AI trả 401/403, hết quota hoặc timeout | Kiểm tra khóa/quyền/quota/endpoint của Nebius và restart sau sửa `.env`; không gửi khóa thật trong log hỗ trợ. |
| Đăng nhập lại sau restart | Bình thường: tài khoản lưu trong PostgreSQL, phiên đăng nhập lưu trong bộ nhớ tiến trình. |

Trên Windows, có thể xem tiến trình lắng nghe mà không dừng chúng:

```powershell
Get-NetTCPConnection -State Listen |
    Where-Object { $_.LocalPort -in @(3000, 5432, 55432) } |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

## 8. Backup và phục hồi, tùy chọn nhưng cần trước khi đổi dữ liệu quan trọng

### 8.1. Backup logic

Dùng [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) với định dạng custom, không sao chép thư mục PostgreSQL đang chạy. Cần cài PostgreSQL command-line tools; dùng công cụ tương thích với phiên bản server.

Ví dụ **Cách B**, database local cổng 5432, ghi file mới vào `data/backups/` đang được Git ignore:

```powershell
New-Item -ItemType Directory -Path 'data/backups' -Force | Out-Null
$backupFile = Join-Path 'data/backups' ('second-serving-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $backupFile) { throw 'Choose a new backup filename.' }
pg_dump -h 127.0.0.1 -p 5432 -U second_serving -d second_serving -W -Fc -f $backupFile
```

Nhập mật khẩu khi được hỏi, kiểm tra lệnh thành công và giữ thêm bản sao ở nơi bảo mật ngoài máy/repository. Dump chứa dữ liệu nghiệp vụ và password hash của tài khoản; không công khai. `pg_dump` cho một database không đồng nghĩa đã backup mọi role/cấu hình toàn PostgreSQL server.

Với **Cách A**, giữ local runner chạy, dùng cổng `55432`, database/user `second_serving` và mật khẩu trong tệp credentials local. Chỉ mở tệp này riêng trên máy khi cần; không in ra terminal hoặc đưa lên Git. Không dùng mật khẩu đăng nhập app thay mật khẩu database.

### 8.2. Thử phục hồi vào database mới, không ghi đè database gốc

Chỉ khôi phục dump do bạn tin cậy; một dump có thể chứa mã SQL thực thi. Theo [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html), custom dump được khôi phục bằng công cụ này.

Ví dụ cho server riêng cổng 5432, với role `second_serving` đã tồn tại:

```powershell
createdb -h 127.0.0.1 -p 5432 -U postgres -W -O second_serving second_serving_restore
pg_restore -h 127.0.0.1 -p 5432 -U second_serving -d second_serving_restore -W --no-owner --no-privileges --single-transaction --exit-on-error $backupFile
```

Ở terminal mới, đặt `$backupFile` thành đường dẫn tới dump bạn đã kiểm tra trước khi chạy. Tên `second_serving_restore` phải chưa tồn tại; nếu đã có, chọn tên database mới và sửa cả hai lệnh. Không thêm `--clean` để ghi đè dữ liệu cũ.

Database phục hồi phải trống; không chạy migration tạo bảng trước khi restore một dump đã chứa schema. Kiểm tra bằng một cấu hình/app kiểm thử riêng, không tự đổi kết nối của app đang sử dụng. Chỉ chuyển kết nối sau khi người phụ trách đã xác minh và đồng ý. Không xóa database gốc như một bước thử phục hồi.

## 9. Nhập dữ liệu JSON cũ, chỉ khi cần

Bỏ qua mục này cho bản cài mới không có `data/admin.json`. Import là bước bootstrap một lần, không phải đồng bộ hay backup PostgreSQL.

- Giữ bản JSON gốc và backup dữ liệu hiện có.
- Database đích phải rỗng, chưa tạo admin/chi nhánh hoặc dữ liệu nghiệp vụ.
- Không chạy import lặp lại để cập nhật dữ liệu; hệ thống sẽ từ chối.
- Nếu đích đã có dữ liệu, không xóa nó để import. Dùng database mới hoặc nhờ người phụ trách lên kế hoạch chuyển dữ liệu.

Với **Cách A**, dừng local runner rồi dùng thay cho lần khởi động thông thường:

```powershell
npm run dev:local-db -- --import-legacy
```

Với **Cách B**, cấu hình đúng database đích rồi chạy:

```powershell
npm run db:migrate
npm run db:import -- data/admin.json
npm run db:check
```

Import giữ ID, tài khoản/password hash và dữ liệu hợp lệ, không sửa JSON nguồn. Chỉ chạy lệnh tạo admin tương ứng nếu dữ liệu import chưa cung cấp admin. Xem thêm [DATABASE.md](DATABASE.md) về transaction và giới hạn migration.

## 10. Trước khi đưa lên GitHub hoặc cho người khác truy cập

- Đưa source, lockfile, `.env.example` chỉ chứa placeholder, [USER-GUIDE.md](USER-GUIDE.md) và tài liệu setup vào repository.
- Không đưa `.env`, `data/`, dump database, password hoặc khóa Nebius vào repository/video/log; kiểm tra lại trước khi public.
- Không dùng lại tài khoản/mật khẩu demo yếu cho một hệ thống công khai.
- App hiện bind `127.0.0.1` và giới hạn Host/origin cho cách chạy local. Chuyển database lên cloud hoặc đổi `PORT` không tự làm app truy cập được từ máy khác.
- Triển khai công khai cần cấu hình HTTPS, Host/origin và cookie phù hợp, quản lý phiên/rate limit dùng chung nếu nhiều instance, quyền database tối thiểu, giới hạn chi phí AI, backup và rà soát bảo mật. Tài liệu này không coi bản local đã sẵn sàng production.

Sau khi setup, theo [USER-GUIDE.md](USER-GUIDE.md) để tạo menu, chi nhánh, kho, thiết bị và thử luồng xử lý sự cố. Mô hình dữ liệu và lưu trữ được mô tả sâu hơn trong [DATABASE.md](DATABASE.md).
