# Recording data — successful branch recovery

This is clearly labelled, fictional planning data for the normal authenticated app at `/login` → `/ops`, not a separate interactive demo or the retired port-3101 preview. It is not evidence of real deliveries or validated food-handling policies.

## Add the dataset once

Keep the intended PostgreSQL server running and create your application administrator first. Choose only the command for your database mode:

```powershell
# Bundled local PostgreSQL; keep npm run dev:local-db running in another terminal.
npm run data:demo:local
```

```powershell
# External PostgreSQL configured by DATABASE_URL in .env.
npm run data:demo
```

Setup is additive and transactional. Existing users, branches, stock, recipes, policies and incidents are preserved. It refuses conflicting names instead of taking over records. Rerunning is a no-op: it does not refill stock, repair a fryer, resolve incidents, reset transfers or extend deadlines. No new account/password is created.

## The fictional scenario

| Branch | Role in the recording |
|---|---|
| DEMO Shinjuku East | Receiving branch. Initially sells both demo dishes; its fryer will fail during the take. |
| DEMO Yotsuya Kitchen | Support branch. Working fryer, enough stock, capacity 30, queue 2 minutes. |
| DEMO Akasaka Pickup | Nearer alternative. Offers only the veggie bowl and has no fryer; cannot provide karaage. |

Two menu items are added: **DEMO Chicken Karaage** and **DEMO Veggie Rice Bowl**, with five separate `DEMO` ingredient definitions and branch-owned opening stock/equipment.

For six karaage servings, Yotsuya's estimate is **2 min queue + 8 min prep + 3 min packing + 12 min travel = 25 minutes**, at **¥650**. The demo dish's fictional travel limit is 20 minutes; existing dishes' transport policies are not changed. The nearer Akasaka route is 5 minutes, but that branch lacks the menu/equipment/ingredients for karaage.

These times, locations, recipes and approvals are illustrative assumptions, not verified real-world transport or food-safety authorization.

## Quay video theo thứ tự này

1. Mở `http://127.0.0.1:3000/login`, đăng nhập admin hiện có. Trong `/ops`, bấm **Refresh data** rồi chọn **DEMO Shinjuku East** ở **YOUR WORKSPACE**.
2. Mở **Overview**: hai món demo ban đầu đều sẵn sàng. Không cần quay lại toàn bộ quá trình nhập liệu.
3. Vào **Equipment → DEMO East Fryer 01 → Report a problem**.
4. Nhập **What happened?**: `DEMO: fryer stopped heating during lunch service. Six karaage servings need support from another branch.` Chọn **Mark broken**, xác nhận thay đổi thiết bị và xác nhận sự cố. Lưu; có thể để thông tin hỗ trợ món là **Not now — set up branch help later** ở bước này.
5. Trở lại **Overview** nếu muốn thể hiện karaage bị chặn, còn veggie bowl vẫn bán được. Sau đó mở sự cố trong **Incidents & recovery**.
6. Chọn **AI advice** và đợi phản hồi thực tế. AI cần khóa/quota Nebius hợp lệ; không ghi là AI đã xử lý nếu nhà cung cấp báo lỗi.
7. Chọn **Find a support branch**: **DEMO Chicken Karaage**, **6 servings**, **60 minutes** tính từ lúc quay; xác nhận thông tin và chọn **Find available branches →**. Không tạo deadline từ hôm trước.
8. So sánh: **DEMO Yotsuya Kitchen** đủ điều kiện, khoảng **25 min / ¥650**; **DEMO Akasaka Pickup** gần hơn nhưng không đủ điều kiện. Các chi nhánh cũ vẫn được giữ và có thể xuất hiện trong danh sách bị loại.
9. **Choose DEMO Yotsuya Kitchen → → Send request**. Đọc lại chiều gửi/nhận và số suất trước khi gửi.
10. Trong **Prepared-food transfers**, dùng admin để lần lượt thực hiện **Approve & reserve → Start prep & consume stock → Confirm dispatch → Confirm receipt**, xác nhận từng hộp thoại. Dòng **Next** chỉ rõ chi nhánh phụ trách; nếu dùng manager, cần tài khoản có quyền bên tương ứng.
11. Kết quả mong đợi: **Received**. Kho gà tại Yotsuya giảm **8 → 6.8 kg**; nguyên liệu thô tại Shinjuku không tăng khi nhận món. Có thể chọn Yotsuya trong workspace để xem lịch sử biến động kho.
12. Nếu quay đoạn phục hồi thiết bị, chỉ trong tình huống giả lập đã xác nhận sửa xong: về Shinjuku, **Update status → resolved**, thêm ghi chú, chọn **Working — repair verified** và xác nhận thiết bị. Nhận món không tự sửa fryer hay resolved sự cố.

Việc chuẩn bị/giao/nhận trong take này là thao tác mô phỏng với dữ liệu `DEMO`, không phải bằng chứng món ăn thật đã được vận chuyển. Caption nên nói rõ đây là một demo scenario.

## Nếu muốn quay lại lần nữa

- Không chạy seed để mong reset: script cố ý không thay đổi dữ liệu đã có.
- Hoàn tất hoặc hủy lượt chuyển cũ theo đúng trạng thái. Sau khi bắt đầu prep, không thể dùng Cancel để hoàn lại nguyên liệu.
- Xử lý sự cố cũ và xác nhận fryer working nếu cần tạo báo cáo mới; ứng dụng không cho tạo hai sự cố mở trên cùng thiết bị.
- Kiểm tra tồn kho còn đủ, bổ sung stock demo có lý do nếu thực sự cần. Một lượt sáu suất dùng 1.2 kg gà, 0.18 kg coating và 0.12 l dầu tại bên gửi.
- Tạo nhu cầu mới với deadline mới ngay lúc quay. Nếu tiếp tục lượt chuyển đang mở mà đã quá hạn, dùng **Revise customer deadline** với xác nhận phù hợp trong kịch bản giả lập.

The seed verifies the complete transfer on a cloned in-memory state before committing new data. It does not pre-create an incident, consume the persistent opening stock or save a completed transfer. PostgreSQL integration tests exercise the persistent workflow separately on a disposable database.
