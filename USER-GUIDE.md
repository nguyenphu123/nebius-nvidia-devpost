# Second Serving — Hướng dẫn sử dụng

Tài liệu dành cho quản trị chuỗi và quản lý chi nhánh, đối chiếu với bản ứng dụng ngày 24/10/2026. Phần giải thích dùng tiếng Việt; tên màn hình, trường và nút giữ nguyên tiếng Anh để dễ tìm trên giao diện.

Second Serving giúp chuỗi fast-food và cửa hàng mua mang đi quản lý menu, nguyên liệu, thiết bị và sự cố theo từng chi nhánh. Khi một cửa hàng không thể phục vụ, bạn có thể tìm cửa hàng cùng hệ thống cung cấp **món ăn đã chuẩn bị**, nếu đáp ứng các điều kiện vận hành. AI đưa ra gợi ý; con người kiểm tra và xác nhận hành động.

## Mục lục

1. [Đăng nhập và bắt đầu](#1-đăng-nhập-và-bắt-đầu)
2. [Hiểu đúng phạm vi dữ liệu và quyền sử dụng](#2-hiểu-đúng-phạm-vi-dữ-liệu-và-quyền-sử-dụng)
3. [Thiết lập chi nhánh lần đầu](#3-thiết-lập-chi-nhánh-lần-đầu)
4. [Quản lý tồn kho hằng ngày](#4-quản-lý-tồn-kho-hằng-ngày)
5. [Quản lý thiết bị](#5-quản-lý-thiết-bị)
6. [Báo cáo sự cố và tham khảo AI](#6-báo-cáo-sự-cố-và-tham-khảo-ai)
7. [Chuyển món giữa các chi nhánh](#7-chuyển-món-giữa-các-chi-nhánh)
8. [Kết thúc sự cố](#8-kết-thúc-sự-cố)
9. [Quản lý tài khoản nhân sự](#9-quản-lý-tài-khoản-nhân-sự)
10. [Xử lý các tình huống thường gặp](#10-xử-lý-các-tình-huống-thường-gặp)
11. [Giới hạn của bản hiện tại](#11-giới-hạn-của-bản-hiện-tại)

## 1. Đăng nhập và bắt đầu

1. Khi ứng dụng đã chạy, mở [Staff sign-in](http://127.0.0.1:3000/login).
2. Nhập **Username** và **Password** do quản trị viên cung cấp, rồi chọn **Sign in →**.
3. Ở đầu trang, chọn chi nhánh cần thao tác trong **YOUR WORKSPACE**.
4. Mở **Overview** để xem tình trạng menu, sự cố và các lượt chuyển món.

Luôn kiểm tra chi nhánh đang chọn và dòng **Saving to branch** hoặc **Owned by** trước khi lưu. Một số lối tắt xử lý sự cố sẽ chuyển bạn sang chi nhánh hỗ trợ.

- **Refresh data**: lấy dữ liệu mới từ máy chủ, hữu ích khi có người khác vừa thao tác.
- **Sign out**: đăng xuất khi dùng xong, đặc biệt trên máy dùng chung.
- **Save changes**: lưu biểu mẫu; **Cancel** hoặc nút đóng: thoát mà không lưu.
- Nếu lưu thất bại, đọc thông báo lỗi trong hộp thoại và bổ sung trường bắt buộc hoặc ô xác nhận.

Bản cài mới không có tài khoản mặc định, không có đăng ký công khai hoặc tự khôi phục mật khẩu. Nếu chưa có quản trị viên hoặc chưa khởi động ứng dụng, nhờ người phụ trách làm theo [hướng dẫn setup app và database](SETUP.md). Phiên đăng nhập hết hạn sau tám giờ hoặc khi máy chủ khởi động lại; dữ liệu đã lưu không bị mất vì đăng xuất.

Sử dụng `/login` và `/ops` trên cổng 3000 cho bản local hiện tại. Không dùng `/demo`, cổng 3101 hoặc bản thử nghiệm cũ `/rescue` làm luồng sử dụng chính. Địa chỉ localhost chỉ truy cập được trên máy đang chạy ứng dụng.

## 2. Hiểu đúng phạm vi dữ liệu và quyền sử dụng

### Dữ liệu dùng chung không đồng nghĩa với tồn kho dùng chung

| Dữ liệu | Phạm vi | Nơi quản lý |
|---|---|---|
| Tên, mô tả, đơn vị và loại nguyên liệu | Dùng chung toàn chuỗi | Ingredient catalog |
| Món ăn, công thức, yêu cầu thiết bị và chính sách vận chuyển | Dùng chung toàn chuỗi | Menu & recipes |
| Món được bán, trạng thái hoạt động, thời gian chờ, năng lực theo mẻ | Riêng từng chi nhánh | Branches → Operating settings |
| Tồn kho và lịch sử nhập/xuất/kiểm kê | Riêng từng chi nhánh | Branch inventory |
| Thiết bị và sự cố | Thuộc chi nhánh đã lưu | Equipment; Incidents & recovery |
| Tuyến giao có hướng, tài khoản và phân quyền | Quản trị toàn chuỗi | Branches; Team access |

Ví dụ: tạo nguyên liệu `Thịt gà` một lần trong danh mục. Sau đó, chi nhánh A có thể có 5 kg, còn B có 0 kg. Nhập kho tại A không làm tăng kho B.

### Hai vai trò

- **admin**: quản lý danh mục chung, chi nhánh, tuyến giao và tài khoản; có thể thực hiện vận hành tại mọi chi nhánh.
- **manager**: vận hành các chi nhánh được gán, gồm cài đặt hoạt động/menu được bán, kho, thiết bị, sự cố và chuyển món. Có thể xem món dùng chung nhưng không sửa danh mục/công thức chung, tuyến giao hoặc tài khoản.

Quản lý chi nhánh nhận không tự có quyền duyệt hoặc chuẩn bị món thay chi nhánh gửi. Nếu không thấy nút cần dùng, hãy kiểm tra vai trò và các chi nhánh được gán.

## 3. Thiết lập chi nhánh lần đầu

Phần danh mục chung và tuyến giao cần tài khoản admin. Sau mỗi bước, lưu thay đổi trước khi chuyển màn hình.

### Bước 1 — Tạo chi nhánh

Vào **Branches → Add branch**, nhập **Branch name**, **Address / area**, mô tả nếu cần và bật **Active**.

Nếu muốn dùng chuyển món giữa cửa hàng, cần ít nhất hai chi nhánh được thiết lập phù hợp.

### Bước 2 — Tạo danh mục nguyên liệu

Vào **Ingredient catalog → Create ingredient definition**:

- **Local ingredient name**: tên nguyên liệu thực tế, có thể là nguyên liệu địa phương.
- **Stock and recipe unit**: chọn `kg`, `g`, `l`, `ml` hoặc `pieces`.
- **Description / handling notes**: mô tả, quy cách hoặc ghi chú xử lý.
- **Food type (not a shelf-life determination)**: `Not specified`, `Fresh / raw food` hoặc `Regular / pantry food`.
- **Active**: nguyên liệu còn được sử dụng.

Kho và công thức phải dùng cùng đơn vị đã chọn. Ứng dụng không tự đổi g sang kg hoặc ml sang l. Ví dụ, nguyên liệu dùng đơn vị `kg` thì 200 g phải nhập thành `0.2` trong công thức.

Đơn vị không thể đổi sau khi nguyên liệu đã được dùng trong công thức hoặc biến động kho. Nếu cần một đơn vị khác, tạo định nghĩa mới và cập nhật công thức có chủ đích. Loại `Fresh / raw food` không tự thiết lập hạn sử dụng hay chứng minh khả năng vận chuyển an toàn.

### Bước 3 — Tạo món và công thức

1. Vào **Menu & recipes → Add menu item**.
2. Nhập tên, nhóm món, **Price (whole JPY)**, mô tả, ghi chú dị ứng nếu có và **Active**.
3. Trên món vừa tạo, chọn **Recipe & requirements**.
4. Chọn **Add ingredient row**, chọn nguyên liệu và nhập **Quantity / serving** cho **một suất**, không phải toàn bộ mẻ.
5. Điền **Required equipment types, comma-separated**, ví dụ `fryer, griller` nếu món thực sự cần cả hai loại.
6. Điền **Preparation minutes per batch** và **Packing minutes per batch**.
7. Đặt **Approved maximum travel minutes (0 disables transport)** theo chính sách đã được người phụ trách xác nhận.

Giới hạn vận chuyển bằng `0` nghĩa là không cho phép chuyển món, không phải không giới hạn. Đây là giới hạn riêng của món, khác với thời hạn khách hàng đồng ý chờ.

Thay đổi công thức hoặc yêu cầu thiết bị là thay đổi dùng chung, có thể ảnh hưởng mọi chi nhánh bán món đó.

### Bước 4 — Gán menu và điều kiện hoạt động

Vào **Branches → [chi nhánh] → Operating settings**:

- **Menu offered at this branch**: chọn các món chi nhánh thực sự phục vụ. Tạo món trong danh mục chưa tự gán cho mọi cửa hàng.
- **Operating status**: `open`, `closed` hoặc `maintenance`.
- **Queue delay (minutes)**: thời gian chờ trước khi bắt đầu chuẩn bị.
- **Concurrent batch capacity (servings)**: năng lực số suất cho mẻ đồng thời.
- **Hours (local time)** và **Responsible manager**: thông tin mô tả vận hành.

Giờ mở cửa hiện là văn bản mô tả, không tự động đóng/mở chi nhánh theo đồng hồ. Hãy cập nhật **Operating status** khi tình trạng thực tế thay đổi. Trường **Responsible manager** cũng không thay thế việc gán quyền tài khoản trong **Team access**.

### Bước 5 — Đăng ký thiết bị và nhập kho ban đầu

Chọn đúng chi nhánh, đăng ký các thiết bị cần thiết theo [mục 5](#5-quản-lý-thiết-bị), rồi nhập nguyên liệu theo [mục 4](#4-quản-lý-tồn-kho-hằng-ngày). Lặp lại cho từng chi nhánh; tài nguyên ở A không tự dùng được tại B.

### Bước 6 — Kiểm tra hướng dẫn thiết lập và độ sẵn sàng

Trong **Overview**, làm theo các mục còn thiếu ở **Set up [chi nhánh]**. Chọn **Set up** để mở biểu mẫu tương ứng. Manager có thể thấy **Ask your chain administrator** đối với việc cần quyền admin.

Thông báo **Branch setup complete · 6/6 steps — review setup** chỉ xác nhận các kết nối cơ bản đã có. Nó không đảm bảo đang bán được món hoặc đáp ứng đủ số suất cần chuyển.

Tiếp tục xem **Menu readiness**:

- **Ready to sell**: đáp ứng các điều kiện được ứng dụng kiểm tra ở thời điểm hiện tại.
- **Needs attention**: đọc lý do, ví dụ thiếu nguyên liệu, thiết bị không khả dụng hoặc món đang tạm ngừng.
- **Ingredient breakdown**: xem lượng khả dụng, lượng giữ chỗ và định lượng cho mỗi suất.

Số suất hiển thị cho từng món là ước tính riêng. Các món cùng dùng một nguyên liệu không thể đồng thời coi toàn bộ lượng đó là kho riêng của mình.

### Bước 7 — Thêm tuyến giao nếu cần hỗ trợ liên chi nhánh

Admin vào **Branches → Configure transport route**:

1. Chọn **From branch** là chi nhánh gửi và **To branch** là chi nhánh nhận.
2. Nhập **Verified travel estimate (minutes)** và **Transfer cost (JPY)**.
3. Xác nhận **Operations manager approves this route**, rồi lưu.

Tuyến A → B không tự tạo tuyến B → A. Muốn sử dụng hai chiều, cấu hình từng chiều riêng. Thời gian và chi phí là dữ liệu do người dùng nhập, không lấy từ giao thông thời gian thực hoặc đơn vị giao hàng.

## 4. Quản lý tồn kho hằng ngày

Chọn chi nhánh trong **YOUR WORKSPACE**, rồi mở **Branch inventory**.

### Thêm nguyên liệu vào danh sách của chi nhánh

Chọn **Choose branch ingredients**, đánh dấu các nguyên liệu dùng chung cần theo dõi và lưu. Hành động này chỉ liên kết danh mục, chưa tạo số lượng tồn kho.

Nguyên liệu đã có trong công thức menu, số dư hoặc lịch sử kho vẫn có thể xuất hiện dù bỏ đánh dấu. Admin dùng **Shared ingredient catalog** để sửa định nghĩa chung, không phải số lượng tại cửa hàng.

### Đọc các cột số lượng

- **On hand**: tổng lượng đang ghi nhận trong kho.
- **Reserved**: phần đã giữ cho các lượt chuyển món được duyệt nhưng chưa bắt đầu chuẩn bị.
- **Available**: lượng còn có thể sử dụng, bằng `On hand − Reserved`.

### Nhập, sử dụng và kiểm kê

| Nút | Cách nhập | Tác động |
|---|---|---|
| Receive stock / Receive | Số lượng mới nhận | Cộng vào tồn kho |
| Use / waste | Số lượng đã dùng hoặc bỏ đi | Trừ khỏi tồn kho |
| Count | Tổng lượng thực tế đếm được | Đặt lại On hand về tổng đó |
| Report shortage | Mô tả tình trạng thiếu | Tạo báo cáo; không tự sửa kho |

Ví dụ, đang có 10 kg nhưng kiểm kê thực tế chỉ còn 7 kg: chọn **Count**, nhập `7`, không nhập `-3` và không dùng **Receive**.

Mỗi lần cập nhật:

1. Kiểm tra dòng **Saving to branch** và nguyên liệu/đơn vị.
2. Nhập số lượng và **Reason / delivery reference**.
3. Xem trước số dư trước → sau, rồi chọn **Save changes**.
4. Kiểm tra số dư và **Recent movements · [chi nhánh]**; lịch sử ghi lý do, người thao tác và thời gian.

Count cho phép đặt số dư bằng 0 nếu không xung đột với hàng giữ chỗ. Không thể xuất hoặc kiểm kê xuống dưới lượng đang được giữ cho chuyển món. Nếu cần hủy một yêu cầu đã duyệt nhưng chưa chuẩn bị, xử lý yêu cầu đó trước.

Ứng dụng chưa đồng bộ POS. Bán hàng, tiêu hao thông thường và hao hụt cần ghi nhận bằng **Use / waste**; nguyên liệu cho lượt chuyển món được ứng dụng trừ ở bước chuẩn bị, không nhập trừ thủ công lần nữa cho cùng lượt đó.

## 5. Quản lý thiết bị

### Thêm thiết bị

Vào **Equipment → Add equipment**:

1. Chọn **Owning branch — choose explicitly**. Không suy ra quyền sở hữu từ tên thiết bị hoặc chỉ từ màn hình đang mở.
2. Nhập **Asset name (not its branch assignment)**, ví dụ `Fryer 01`.
3. Nhập **Equipment type (e.g. fryer)** đúng với loại được công thức yêu cầu.
4. Chọn **Status**: `working`, `broken` hoặc `maintenance`; thêm ghi chú nếu cần.
5. Lưu, kiểm tra **Owned by** và thông báo **Saved for [chi nhánh]**.

`fryer` và `deep fryer` là hai tên loại khác nhau. Nếu công thức yêu cầu `fryer`, một thiết bị loại `deep fryer` không tự thay thế được. Nếu công thức cần cả `fryer, griller`, phải có đủ từng loại.

Quyền sở hữu của thiết bị đã lưu không thể đổi qua biểu mẫu chỉnh sửa để giữ đúng lịch sử sự cố. Đổi tên `Fryer A` thành `Fryer B` không chuyển nó sang chi nhánh B. Nếu khai báo nhầm, nhờ admin rà soát; không dùng đổi tên để giả lập việc di chuyển.

### Cập nhật tình trạng

- **Update equipment**: cập nhật trạng thái/ghi chú theo thực tế.
- **Report a problem**: mở báo cáo với thiết bị đã được chọn sẵn.
- **Open incident**: mở sự cố chưa kết thúc của thiết bị đó.

Thiết bị mang trạng thái `working` nhưng còn sự cố mở vẫn có thể bị chặn. Xử lý và kết thúc sự cố theo [mục 8](#8-kết-thúc-sự-cố), không chỉ đổi trạng thái thiết bị. Một thiết bị working khác cùng loại, không bị chặn, có thể đáp ứng yêu cầu của món trong khi sự cố cũ vẫn được lưu.

## 6. Báo cáo sự cố và tham khảo AI

### Tạo báo cáo

1. Chọn chi nhánh bị ảnh hưởng.
2. Vào **Incidents & recovery → Report incident**, hoặc **Overview → Report an incident**.
3. Chọn **Incident type**: `general`, `equipment` hoặc `stock`.
4. Với thiết bị/nguyên liệu, chọn **Affected item** của đúng chi nhánh.
5. Nhập **What happened?** rõ ràng: vấn đề gì, ảnh hưởng đến đâu, tình trạng đã xác minh.
6. Với thiết bị, nếu cần cập nhật cùng lúc, chọn **Also update equipment status** và xác nhận thay đổi bằng ô riêng.
7. Có thể để **Not now — set up branch help later** nếu chưa cần món từ cửa hàng khác.
8. Đánh dấu **I confirm these facts…**, rồi lưu.

Không tạo báo cáo mới cho thiết bị đã có sự cố mở; dùng **Open incident**. Báo cáo thiếu nguyên liệu không tự thay đổi tồn kho: ghi thêm biến động/kiểm kê nếu số dư thực tế cần sửa.

### Tạm dừng một số món

Trong sự cố, chọn **Pause / resume items**. Các món được đánh dấu sẽ tạm dừng trong thời gian sự cố này còn mở. Bỏ chọn để gỡ phần tạm dừng của sự cố đó; món vẫn có thể bị chặn bởi nguyên nhân khác.

### Dùng AI advice

1. Trên một sự cố chưa kết thúc, chọn **AI advice**.
2. Chờ thông báo **Requesting AI advice… No changes will be made.**
3. Đọc **AI proposal — review before acting** và thông tin model.
4. Người phụ trách kiểm tra đề xuất, rồi tự thực hiện hành động phù hợp trong ứng dụng.

Model mặc định là NVIDIA `nvidia/nemotron-3-super-120b-a12b`, được gọi qua Nebius. AI không tự sửa thiết bị, nhập/xuất kho, duyệt yêu cầu hoặc giao món. Nếu nhà cung cấp AI lỗi hoặc chưa được cấu hình, các luồng thủ công vẫn dùng được; nhờ người phụ trách kiểm tra cấu hình máy chủ khi cần.

Yêu cầu AI gửi ngữ cảnh sự cố, các ràng buộc chi nhánh và kết quả so sánh hỗ trợ tới nhà cung cấp, có thể sử dụng quota/credit của tài khoản cấu hình. Không nhập khóa API, thông tin khách hàng nhạy cảm hoặc bí mật kinh doanh không cần thiết vào ghi chú.

## 7. Chuyển món giữa các chi nhánh

Đây là chuyển **món ăn đã chuẩn bị**, không phải chuyển nguyên liệu thô. Trong mục này, **chi nhánh nhận** là nơi cần hỗ trợ; **chi nhánh gửi** là nơi chuẩn bị và gửi món.

### 7.1. Xác định nhu cầu tại chi nhánh nhận

1. Mở sự cố chưa kết thúc, chọn **Find a support branch**.
2. Trong **What does this branch need?**, chọn **Which dish?** từ menu đang hoạt động của chi nhánh nhận.
3. Điền **How many servings?**: số suất nguyên từ 1–500.
4. Điền **Needed within (minutes from now)**: số phút từ hiện tại, từ 5–480. Có nút nhanh 15/30/60/90 phút.
5. Xác nhận **I confirm the dish, servings and agreed customer deadline.**
6. Chọn **Find available branches →**.

Bước này lưu nhu cầu vào sự cố và tìm lựa chọn; chưa tạo lượt chuyển món.

### 7.2. So sánh chi nhánh hỗ trợ

Ở **Choose a support branch**:

- **Fastest available**: lựa chọn đủ điều kiện có tổng thời gian dự kiến ngắn nhất.
- **Time and capacity breakdown**: xem phân rã thời gian và năng lực.
- **Why … branches are unavailable**: mở lý do các chi nhánh bị loại.
- **Change request**: sửa món, số suất hoặc thời hạn trước khi tạo lượt chuyển.
- **Check again**: kiểm tra lại sau khi điều kiện thay đổi.

Thời gian dự kiến là: `chờ tại chi nhánh gửi + chuẩn bị + đóng gói + vận chuyển`.

Hệ thống cần kiểm tra trạng thái hoạt động của hai chi nhánh; menu/công thức, nguyên liệu khả dụng, thiết bị, năng lực và món tạm dừng ở chi nhánh gửi; tuyến đúng chiều đã được duyệt; giới hạn vận chuyển của món; và thời hạn khách hàng.

Ví dụ: tuyến đi mất **10 phút**, món chỉ cho phép vận chuyển **3 phút** thì vẫn bị chặn, dù khách hàng chấp nhận chờ **60 phút**. Tăng thời hạn khách hàng không thay đổi giới hạn vận chuyển của món. Không tăng chính sách vận chuyển chỉ để vượt qua bước kiểm tra; người phụ trách cần xác nhận điều kiện thực tế.

Admin có thể dùng **Review source menu**, **Review source equipment**, **Review source inventory**, **Review dish setup** hoặc **Set delivery route** để bổ sung cấu hình. Lối tắt kho/thiết bị chuyển workspace sang chi nhánh gửi; dùng **← Back to branch help** để quay lại nhu cầu của chi nhánh nhận và kiểm tra lại.

### 7.3. Gửi yêu cầu

1. Chọn **Choose [tên chi nhánh] →** trên lựa chọn đủ điều kiện.
2. Trong **Review your branch request**, kiểm tra chiều gửi/nhận, món, số suất, thời hạn và chi phí.
3. Chọn **Send request**.

Ứng dụng mở lượt chuyển trong **Prepared-food transfers**. Lúc này trạng thái là **Requested**; kho chưa bị giữ hoặc trừ. Các điều kiện có thể được kiểm tra lại khi bên gửi xử lý, nên kết quả tìm trước đó không phải cam kết hàng đã được giữ.

### 7.4. Duyệt, chuẩn bị, gửi và nhận

| Trạng thái hiện tại | Người chịu trách nhiệm | Nút tiếp theo | Kết quả |
|---|---|---|---|
| Requested | Chi nhánh gửi | Approve & reserve | Chuyển sang Approved; giữ nguyên liệu, chưa giảm On hand |
| Approved | Chi nhánh gửi | Start prep & consume stock | Chuyển sang Preparing; trừ nguyên liệu theo công thức × số suất và giải phóng phần giữ tương ứng |
| Preparing | Chi nhánh gửi | Confirm dispatch | Chuyển sang On the way sau khi xác nhận món thực sự đã rời cửa hàng |
| On the way | Chi nhánh nhận | Confirm receipt | Chuyển sang Received sau khi xác nhận đã nhận món |
| Received | Không còn bước giao tiếp theo | — | Giữ lịch sử; xử lý sự cố/thiết bị là việc riêng |

Mỗi bước có hộp thoại xác nhận. Đọc dòng **Next: [chi nhánh]** trên thẻ chuyển món. Không bỏ qua bước hoặc xác nhận giao/nhận khi sự kiện thực tế chưa xảy ra.

Với tài khoản admin, bạn có thể thao tác cả hai phía để thử luồng. Với manager, dùng tài khoản được gán cho bên chịu trách nhiệm; việc chỉ nhìn thấy lượt chuyển không đồng nghĩa có quyền thực hiện mọi bước.

Nhận món không làm tăng nguyên liệu thô ở kho chi nhánh nhận. Không nhập thêm kho nguyên liệu để đại diện cho món vừa nhận.

### 7.5. Hủy hoặc đổi thời hạn

- **Cancel transfer** chỉ có khi Requested hoặc Approved. Nếu đã giữ hàng, hủy sẽ giải phóng phần giữ. Sau **Start prep & consume stock**, không còn bước hủy để hoàn lại nguyên liệu.
- **Revise customer deadline**: phía nhận nhập thời hạn mới, lý do và xác nhận **Customer has agreed to the revised deadline**. Không tự kéo dài lời hứa với khách mà chưa có đồng ý.
- Khi đã có lượt chuyển không bị hủy, sự cố hiện **View transfer** thay cho thao tác gửi yêu cầu mới. Mở lượt chuyển đó để theo dõi hoặc đổi thời hạn.
- Xem **Timeline** và dùng **Refresh data** khi bên còn lại vừa xử lý. Ứng dụng không tự thực hiện giao hàng hoặc theo dõi vị trí tài xế.

## 8. Kết thúc sự cố

1. Hoàn tất hoặc hủy các lượt chuyển liên quan còn đang hoạt động.
2. Trong sự cố, chọn **Update status**.
3. Chọn `investigating` nếu còn xử lý, hoặc `resolved` khi đã hoàn tất.
4. Nhập **Action taken / resolution note** để mô tả việc đã làm.
5. Với thiết bị đã được xác minh sửa xong, có thể chọn **Working — repair verified** và đánh dấu **I verified and confirm this equipment status** trong cùng lần lưu.
6. Lưu, kiểm tra **Activity history** và quay lại **Overview** để xem lại độ sẵn sàng của món.

Đánh dấu sự cố resolved không tự sửa thiết bị hoặc điều chỉnh tồn kho nếu bạn không thực hiện các bước tương ứng. Nhận món hỗ trợ cũng không tự kết thúc sự cố. Việc resolved gỡ phần tạm dừng do sự cố đó, nhưng sự cố khác hoặc thiết bị hỏng khác vẫn có thể tiếp tục chặn món.

## 9. Quản lý tài khoản nhân sự

Admin vào **Team access → Add team member**:

1. Nhập **Username** và mật khẩu 12–200 ký tự.
2. Chọn **Role** là `manager` hoặc `admin`.
3. Với manager, chọn **Assigned branches (managers only)**.
4. Bật **Active**, rồi lưu và cung cấp thông tin đăng nhập qua kênh riêng.

Dùng **Edit access** để thay đổi quyền, chi nhánh hoặc trạng thái tài khoản. Khi sửa, để trống **New password (leave blank to keep)** nếu không muốn đổi mật khẩu. Ứng dụng chặn tự vô hiệu hóa hoặc tự hạ quyền tài khoản đang đăng nhập.

Tài khoản bị tắt sẽ mất quyền truy cập. Không đưa mật khẩu local thử nghiệm hoặc thông tin máy chủ vào tài liệu/repository công khai; dùng thông tin truy cập phù hợp cho bản triển khai thực tế.

## 10. Xử lý các tình huống thường gặp

| Tình huống | Kiểm tra và cách xử lý |
|---|---|
| Đã tạo món nhưng chi nhánh không thấy/bán được | Gán món trong Operating settings; kiểm tra Active, công thức, kho, thiết bị và lý do trong Menu readiness. |
| Checklist đã 6/6 nhưng món vẫn Needs attention | Checklist chỉ kiểm tra thiết lập cơ bản; xem lý do hiện tại và Ingredient breakdown, không chỉ đếm bước hoàn tất. |
| Đã tạo nguyên liệu nhưng kho chi nhánh trống | Liên kết bằng Choose branch ingredients hoặc công thức menu, rồi Receive stock. Tạo danh mục không phải nhập hàng. |
| Thiết bị mang tên B nhưng ứng dụng nói thuộc A | Xem Owned by; tên không quyết định quyền sở hữu. Không đổi tên để chuyển chi nhánh. |
| Đã đổi thiết bị thành working nhưng vẫn bị chặn | Kiểm tra Open incident và hoàn tất sự cố sau khi xác minh sửa chữa; kiểm tra cả các thiết bị/công thức liên quan. |
| Không có chi nhánh hỗ trợ | Mở Why … branches are unavailable; kiểm tra từng lý do ở cả nơi gửi và nhận, tuyến đúng chiều, công thức và thời hạn còn hiệu lực. |
| Khách chờ 60 phút mà tuyến 10 phút vẫn bị loại | Giới hạn vận chuyển của món có thể chỉ là 3 phút; đây là ràng buộc khác với thời hạn khách hàng. |
| Báo không có tuyến dù đã tạo A → B | Kiểm tra yêu cầu có cần B → A hay không, và tuyến đã được duyệt chưa. |
| Không thấy nút Approve / Prepare / Receive | Kiểm tra trạng thái hiện tại, dòng Next, quyền của tài khoản và chi nhánh phụ trách; sau đó Refresh data. |
| Không thể trừ kho/kiểm kê về số thấp hơn | Kiểm tra Reserved; không thể làm mất phần hàng đang giữ cho yêu cầu đã duyệt. |
| Không thể resolved sự cố | Xử lý các lượt chuyển liên quan còn hoạt động trước, và nhập ghi chú kết thúc. |
| Thời hạn đã qua | Trước khi gửi, dùng Change request; sau khi gửi, phía nhận dùng Revise customer deadline với lý do và xác nhận khách đã đồng ý. |
| AI lỗi hoặc chưa trả lời | Đọc thông báo, thử lại khi phù hợp hoặc nhờ kiểm tra cấu hình/quota nhà cung cấp; tiếp tục các bước thủ công nếu đủ điều kiện. |
| Mất phiên hoặc dữ liệu hiển thị chưa mới | Đăng nhập lại nếu cần, dùng Refresh data rồi chọn lại chi nhánh. Dữ liệu đã lưu vẫn được giữ trong database. |

## 11. Giới hạn của bản hiện tại

- Đây là bản local pilot, một chuỗi trên mỗi database; chưa phải hệ thống ERP/POS hoàn chỉnh.
- Chưa có đơn hàng/thanh toán, đồng bộ POS, đặt hàng nhà cung cấp hoặc chuyển nguyên liệu thô giữa chi nhánh.
- Chưa quản lý lô, hạn dùng, chuỗi lạnh, tự đổi đơn vị, vị trí tài xế hoặc giao thông thời gian thực.
- Thời gian chờ, năng lực, chi phí, tuyến và giới hạn vận chuyển là các giả định vận hành do người dùng cung cấp. Năng lực theo mẻ không phải lịch sản xuất chi tiết.
- Readiness, nhãn Fresh/Pantry, tuyến được duyệt hoặc AI advice không phải chứng nhận an toàn thực phẩm, dị ứng hay điều kiện bảo quản. Người phụ trách vẫn phải kiểm tra thực tế.
- Không đưa khóa API hoặc dữ liệu nhạy cảm vào biểu mẫu, ghi chú, ảnh/video hoặc repository công khai.

Tài liệu liên quan: [README — cài đặt và chạy](README.md), [DATABASE — PostgreSQL và lưu trữ](DATABASE.md), [RECORDING-GUIDE — chuẩn bị quay tương tác](RECORDING-GUIDE.md).
