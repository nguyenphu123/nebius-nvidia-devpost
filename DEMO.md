# Second Serving — Một bếp hỏng, không phải một lời hứa hỏng

## User story

Là người điều phối bếp cộng đồng, chị Linh cần biến nguyên liệu và nguồn lực đang có thành một kế hoạch phục vụ có thể kiểm tra. Khi số khách hoặc thiết bị thay đổi, chị muốn biết chính xác kế hoạch mới còn thiếu bao nhiêu suất, trước khi giao việc cho tình nguyện viên.

Nhân vật và tình huống dưới đây là giả định. Các con số là kết quả của bộ tính với công thức mẫu, không phải tác động đã đo ở bếp thật.

## Demo 3–4 phút

1. **Mở bài (20 giây).** “Một bếp cộng đồng không thiếu công thức trên mạng. Điều họ thiếu là một kế hoạch còn khả thi khi thực tế thay đổi.”
2. **Kế hoạch ban đầu (40 giây).** Reset sample kitchen. Linh có 120 khách, 4 tình nguyện viên, 2 bếp, 240 phút và $30 mua bổ sung. Chỉ vào nguyên liệu nhập tay, phân loại thực phẩm, menu, shopping và timeline. Kết quả: 120 suất, $10.20 mua thêm, hoàn tất phút 211. Đây là thời gian từ lúc bắt đầu chuẩn bị, không phải thời gian đếm ngược trực tiếp.
3. **Sự cố (60 giây).** Gửi vào assistant: `The lentils delivery has been cancelled. Set Lentils (dry) to 0 kg. We now have 140 guests and only 1 working burner. Keep everything else unchanged.` Chỉ ra đề xuất chưa sửa dữ liệu. Kiểm tra các trường rồi bấm Apply & rebuild plan. Kết quả: 80 suất, thiếu 60; nút approve bị khóa. Bảng trước–sau cho thấy sự thay đổi.
4. **Quyết định có kiểm chứng (45 giây).** “Linh đã xác nhận mượn được một bếp tương thích, sẵn sàng trước khi bắt đầu ca.” Gửi: `A replacement burner is confirmed and available before prep starts. Set working burners to 2. Keep all other settings unchanged.` Review rồi Apply. Kết quả: 140 suất, không dùng lentils, $28.10 mua bổ sung, hoàn tất phút 237. Chỉ còn 3 phút dư: cần người phụ trách đánh giá tính thực tế, không gọi đây là kế hoạch có dự phòng tốt.
5. **Kết (30 giây).** Mở shopping và timeline; trong tình huống giả định xác nhận có thể mua đủ trước prep. Approve rồi Export plan. “AI hiểu thay đổi bằng ngôn ngữ tự nhiên. Bộ tính kiểm tra nguồn lực. Người phụ trách giữ quyền quyết định.”

## Ranh giới cần nói thật

- Nemotron trên Nebius trích xuất thay đổi, không tạo menu mới trong phiên bản này.
- Bộ tính lựa chọn giữa ba công thức mẫu; không cam kết tối ưu lịch toàn cục.
- Nguyên liệu địa phương được lưu nhưng chưa có ánh xạ/công thức thì không được tính. Không đoán khối lượng mỗi bó/gói.
- Food type là mô tả, không xác nhận an toàn thực phẩm, hạn dùng hay điều kiện bảo quản.
- Không có đặt mua/giao hàng thật; approval là xác nhận trong phiên prototype.
- Refresh mất phiên; export trước khi đóng. Không để lộ .env hoặc API key khi quay màn hình.

## Khi API lỗi

Không gọi kết quả fallback là AI. Dùng nút sample disruption (ghi rõ no AI call), sau đó chỉnh Working burners thành 2 và Build kitchen plan. Diễn giải đây là demo bộ tính; AI live chưa chạy thành công. Không bấm disruption nhiều lần vì nó cộng thêm 20 khách mỗi lần; reset để bắt đầu lại.

## Tiêu chí đạt

- Đề xuất AI đúng, chưa áp dụng trước khi người dùng xác nhận.
- Sự cố tạo 80 suất / 140 khách và khóa approval.
- Khôi phục bếp tạo 140 suất với $28.10, phút 237.
- Đổi dữ liệu sau approval làm approval mất hiệu lực; export bị khóa cho tới khi tính lại.
- Export chứa đúng state, thực phẩm và trạng thái approval.

## Nhật ký diễn tập 2026-10-09

- Lần AI đầu trả trường ngoài schema; validator chặn và không sửa dữ liệu. Đã bổ sung nhắc định dạng output rõ ràng vào prompt, không nới validator.
- Chạy lại live AI nhận đúng guests=140, burners=1, lentils=0. Người dùng phải Apply; bộ tính trả 80 suất, thiếu 60, approval bị khóa.
- Lần live AI tiếp theo chỉ đề xuất burners=2. Sau Apply: 140 suất, $28.10, hoàn tất phút 237.
- Đã duyệt phiên giả lập và tải JSON bằng nút Export plan; đây không phải phê duyệt vận hành bếp thật.
- Một lần chạy thành công không đảm bảo mọi phản hồi AI đều đúng; luôn review proposal và giữ phương án demo bộ tính khi API lỗi.
