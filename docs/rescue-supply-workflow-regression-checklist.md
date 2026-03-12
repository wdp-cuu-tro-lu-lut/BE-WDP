# Checklist test nhanh: Rescue supply workflow + warehouse ledger

Nên đặt file này trong thư mục `docs/` vì đây là checklist nghiệp vụ backend phục vụ QA/regression test cho flow kho cứu trợ vừa bổ sung.

## Mục tiêu

Xác nhận nhanh các flow sau hoạt động đúng:

- Staff hoặc admin tạo được phiếu vật phẩm cho rescue request đã được review/assign
- Phiếu tự sinh đúng nhóm vật phẩm cứu trợ: nước, thực phẩm, bộ y tế
- Kiểm tra kho trả đúng trạng thái `READY` hoặc `INSUFFICIENT`
- Khi đủ hàng, dispatch sẽ trừ kho và ghi nhận transaction `OUT`
- Khi thiếu hàng, staff tạo được yêu cầu bổ sung và admin review được
- Khi admin duyệt bổ sung, kho tăng và ghi transaction `IN`
- Sau cứu trợ, hoàn kho vật phẩm dư sẽ tăng kho và ghi transaction `IN`
- Trang/sổ giao dịch kho xem được lịch sử nhập xuất theo source và thời gian

## Phạm vi quyền truy cập

- Toàn bộ endpoint dưới đây đang được bảo vệ bởi role `ADMIN` hoặc `STAFF`
- Riêng endpoint review replenishment chỉ cho `ADMIN`

## Tài khoản test có sẵn

- Admin: `admin@example.com` / `admin123`
- Staff: `staff@example.com` / `staff123`
- User: `user@example.com` / `user123`

## Chuẩn bị dữ liệu trước khi test

Trước khi chạy checklist này, nên chuẩn bị sẵn:

- 1 rescue request đã qua bước review/assign
- Request đó có ít nhất 1 team đang active assignment
- Trong `categories` có các category tương ứng với vật phẩm cứu trợ

Tên category hệ thống hiện map theo các alias sau:

- Nước: `Nước uống`, `Nước sạch`, hoặc `Nước`
- Thực phẩm: `Thực phẩm khô`, `Thực phẩm`, hoặc `Đồ ăn`
- Bộ y tế: `Thuốc men`, `Thiết bị y tế`, `Dụng cụ y tế`, hoặc `Bộ dụng cụ y tế`

Nếu thiếu một trong các nhóm category trên thì bước tạo phiếu có thể fail do không resolve được category mapping.

## Công thức sinh vật phẩm mặc định

Hệ thống đang tính số lượng theo `priority` của rescue request:

- `LOW`: 2 nước, 2 thực phẩm, 1 bộ y tế cho mỗi 5 người
- `MEDIUM`: 3 nước, 3 thực phẩm, 1 bộ y tế cho mỗi 4 người
- `HIGH`: 4 nước, 4 thực phẩm, 1 bộ y tế cho mỗi 3 người
- `CRITICAL`: 5 nước, 5 thực phẩm, 1 bộ y tế cho mỗi 2 người

Ví dụ với request `HIGH`, `estimatedPeople = 6` thì kỳ vọng:

- Nước: `24`
- Thực phẩm: `24`
- Bộ y tế: `2`

## Checklist

### 1. User tạo rescue request

- Đăng nhập bằng `user@example.com`
- Gọi `POST /rescue-requests`
- Body tối thiểu:

```json
{
  "address": "123 Warehouse QA Street",
  "priority": "HIGH",
  "note": "QA rescue supply workflow",
  "estimatedPeople": 6
}
```

- Kỳ vọng:
  - Tạo request thành công
  - Response có `id`
  - `status = NEW`

### 2. Admin review rescue request

- Đăng nhập bằng admin
- Gọi `PATCH /rescue-requests/admin/:id/review`
- Body mẫu:

```json
{
  "status": "REVIEWED",
  "priority": "HIGH",
  "requiredTeams": 1,
  "note": "Reviewed for warehouse QA"
}
```

- Kỳ vọng:
  - Review thành công
  - `status = REVIEWED`
  - `priority = HIGH`

### 3. Admin assign team cho rescue request

- Gọi `POST /rescue-requests/admin/:id/assignments`
- Body mẫu:

```json
{
  "teamIds": ["team-id-1"]
}
```

- Kỳ vọng:
  - Assign thành công
  - Request chuyển sang `ASSIGNED`
  - Có ít nhất 1 assignment active

### 4. Staff tạo phiếu vật phẩm cứu trợ

- Đăng nhập bằng staff hoặc admin
- Gọi `POST /warehouse/rescue-orders`
- Body mẫu:

```json
{
  "rescueRequestId": "rescue-request-id",
  "estimatedPeople": 6,
  "note": "Phiếu cấp phát lần 1"
}
```

- Kỳ vọng:
  - Tạo phiếu thành công
  - Response có `id`
  - `status = PLANNED`
  - Có đúng 3 item: `WATER`, `FOOD`, `MEDICAL_KIT`
  - `affectedPeople = 6`
  - `damageLevel = HIGH`
  - `totalResponders` bằng tổng `teamSize` của các team assignment active
  - Với ví dụ `HIGH + 6 người`, số lượng item là `24`, `24`, `2`

### 5. Không được tạo phiếu trùng cho cùng rescue request

- Gọi lại `POST /warehouse/rescue-orders` với cùng `rescueRequestId`
- Kỳ vọng:
  - Bị chặn
  - HTTP `409`
  - Message gần nghĩa với `Rescue request already has a supply order`

### 6. Xem danh sách phiếu vật phẩm

- Gọi `GET /warehouse/rescue-orders?page=1&limit=20`
- Kỳ vọng:
  - Có phiếu vừa tạo trong danh sách
  - Response có `data` và `meta`
  - Có thể filter theo `rescueRequestId` hoặc `status`

### 7. Xem chi tiết phiếu vật phẩm

- Gọi `GET /warehouse/rescue-orders/:id`
- Kỳ vọng:
  - Có thông tin request, team, item, stock check
  - Mỗi item có các field như `requestedQuantity`, `dispatchedQuantity`, `returnedQuantity`, `lastShortageQuantity`

### 8. Kiểm tra nhánh đủ hàng

- Đảm bảo kho đang có đủ stock cho cả 3 nhóm vật phẩm
- Gọi `POST /warehouse/rescue-orders/:id/check-stock`
- Kỳ vọng:
  - Thành công
  - `status = READY`
  - `lastStockCheckAt` có giá trị
  - Trong `stockCheck.items`, mọi item có `isEnough = true`
  - `shortageQuantity = 0`

### 9. Dispatch phiếu khi đủ hàng

- Gọi `POST /warehouse/rescue-orders/:id/dispatch`
- Kỳ vọng:
  - Thành công
  - `status = DISPATCHED`
  - `dispatchedAt` có giá trị
  - `dispatchedQuantity` của từng item tăng đúng bằng `requestedQuantity`
  - `lastShortageQuantity = 0`
  - Stock kho của các category tương ứng bị giảm

### 10. Kiểm tra transaction sau dispatch

- Gọi `GET /warehouse/transactions?source=RESCUE_DISPATCH&type=OUT&page=1&limit=20`
- Kỳ vọng:
  - Có transaction mới cho phiếu vừa dispatch
  - Mỗi dòng có:
    - `type = OUT`
    - `source = RESCUE_DISPATCH`
    - `referenceId = rescueOrderId`
    - `quantity > 0`
    - `balanceBefore` lớn hơn hoặc bằng `balanceAfter`
    - `createdAt` có timestamp

### 11. Không được check-stock lại khi phiếu đã dispatch

- Gọi lại `POST /warehouse/rescue-orders/:id/check-stock`
- Kỳ vọng:
  - Bị chặn
  - HTTP `409`

### 12. Không được tạo replenishment request sau khi đã dispatch

- Gọi `POST /warehouse/rescue-orders/:id/replenishment-requests`
- Body mẫu:

```json
{
  "note": "Should fail after dispatch"
}
```

- Kỳ vọng:
  - Bị chặn
  - HTTP `409`

### 13. Hoàn tất rescue order và hoàn kho vật phẩm dư

- Gọi `POST /warehouse/rescue-orders/:id/complete`
- Body mẫu:

```json
{
  "note": "Hoàn tất cứu trợ, hoàn kho vật phẩm còn dư",
  "items": [
    {
      "orderItemId": "water-order-item-id",
      "returnedQuantity": 2,
      "condition": "GOOD"
    },
    {
      "orderItemId": "food-order-item-id",
      "returnedQuantity": 1,
      "condition": "GOOD"
    }
  ]
}
```

- Kỳ vọng:
  - Thành công
  - `status = COMPLETED`
  - `completedAt` có giá trị
  - `returnedQuantity` của các item được cộng đúng
  - Stock kho của category hoàn trả tăng lên

### 14. Kiểm tra transaction sau hoàn kho

- Gọi `GET /warehouse/transactions?source=RESCUE_RETURN&type=IN&page=1&limit=20`
- Kỳ vọng:
  - Có transaction mới tương ứng phần hoàn kho
  - `type = IN`
  - `source = RESCUE_RETURN`
  - `referenceId = rescueOrderId`

## Checklist nhánh thiếu hàng và bổ sung hàng

Nên dùng một rescue request khác để test nhánh này, tránh đụng vào phiếu đã `COMPLETED` ở trên.

### 15. Tạo phiếu mới cho request khác nhưng kho không đủ

- Tạo thêm 1 rescue request khác với `priority` cao hơn hoặc `estimatedPeople` lớn hơn
- Review và assign như các bước trên
- Gọi `POST /warehouse/rescue-orders`
- Kỳ vọng:
  - Tạo phiếu thành công
  - `status = PLANNED`

### 16. Check stock khi kho thiếu

- Gọi `POST /warehouse/rescue-orders/:id/check-stock`
- Kỳ vọng:
  - Thành công
  - `status = INSUFFICIENT`
  - Có ít nhất 1 item có:
    - `isEnough = false`
    - `shortageQuantity > 0`
  - `lastShortageQuantity` trên item được cập nhật

### 17. Staff tạo replenishment request

- Đăng nhập bằng staff
- Gọi `POST /warehouse/rescue-orders/:id/replenishment-requests`
- Body mẫu:

```json
{
  "note": "Kho thiếu hàng, đề nghị bổ sung gấp"
}
```

- Kỳ vọng:
  - Thành công
  - Response có `id`
  - `status = PENDING`
  - Chỉ sinh item cho các category đang thiếu
  - `requestedQuantity` của từng item bằng số thiếu thực tế tại lúc tạo request
  - Rescue order vẫn ở trạng thái `INSUFFICIENT`

### 18. Không được tạo 2 replenishment request pending cùng lúc

- Gọi lại `POST /warehouse/rescue-orders/:id/replenishment-requests`
- Kỳ vọng:
  - Bị chặn
  - HTTP `409`

### 19. Admin từ chối replenishment request

- Đăng nhập bằng admin
- Gọi `PATCH /warehouse/replenishment-requests/:id/review`
- Body mẫu:

```json
{
  "approved": false,
  "decisionNote": "Tạm thời chưa duyệt"
}
```

- Kỳ vọng:
  - Thành công
  - Request chuyển `REJECTED`
  - Kho không tăng
  - Không có transaction `MANUAL_REPLENISHMENT` mới

### 20. Tạo lại replenishment request sau khi request cũ đã bị reject

- Gọi lại `POST /warehouse/rescue-orders/:id/replenishment-requests`
- Kỳ vọng:
  - Tạo được request mới
  - `status = PENDING`

### 21. Admin duyệt replenishment request

- Gọi `PATCH /warehouse/replenishment-requests/:id/review`
- Body mẫu:

```json
{
  "approved": true,
  "decisionNote": "Duyệt nhập thêm từ kho dự phòng",
  "items": [
    {
      "itemId": "replenishment-item-id-1",
      "approvedQuantity": 10,
      "condition": "EXCELLENT"
    }
  ]
}
```

- Lưu ý:
  - Với item không truyền trong `items`, hệ thống sẽ mặc định duyệt bằng `requestedQuantity`
  - Có thể duyệt `approvedQuantity = 0` cho một item cụ thể

- Kỳ vọng:
  - Thành công
  - Request chuyển `APPROVED`
  - `reviewedById`, `reviewedAt`, `decisionNote` được set
  - Kho tăng theo `approvedQuantity`
  - Có transaction `IN` với `source = MANUAL_REPLENISHMENT`
  - Rescue order được tính lại trạng thái:
    - `READY` nếu kho đã đủ
    - `INSUFFICIENT` nếu vẫn còn thiếu

### 22. Kiểm tra transaction sau duyệt bổ sung hàng

- Gọi `GET /warehouse/transactions?source=MANUAL_REPLENISHMENT&type=IN&page=1&limit=20`
- Kỳ vọng:
  - Có transaction mới của request vừa duyệt
  - `referenceId = replenishmentRequestId`
  - `balanceAfter` lớn hơn hoặc bằng `balanceBefore`

### 23. Dispatch phiếu sau khi kho đã đủ lại

- Nếu sau bước 21, rescue order đã về `READY`, gọi `POST /warehouse/rescue-orders/:id/dispatch`
- Kỳ vọng:
  - Dispatch thành công
  - `status = DISPATCHED`
  - Có transaction `RESCUE_DISPATCH`

## Checklist phân quyền

### 24. Staff không được review replenishment request

- Đăng nhập bằng staff
- Gọi `PATCH /warehouse/replenishment-requests/:id/review`
- Kỳ vọng:
  - Bị chặn bởi role guard
  - HTTP `403`

### 25. User thường không được gọi các API warehouse

- Đăng nhập bằng `user@example.com`
- Thử gọi `GET /warehouse/rescue-orders`
- Kỳ vọng:
  - Bị chặn
  - HTTP `403`

## Checklist sổ giao dịch kho

### 26. Xem toàn bộ ledger nhập xuất kho

- Gọi `GET /warehouse/transactions?page=1&limit=20`
- Kỳ vọng:
  - Có `data` và `meta`
  - Dữ liệu sắp xếp mới nhất trước
  - Mỗi record có các field chính:
    - `id`
    - `categoryId`
    - `type`
    - `source`
    - `referenceId`
    - `quantity`
    - `balanceBefore`
    - `balanceAfter`
    - `note`
    - `createdAt`

### 27. Filter ledger theo source

- Gọi lần lượt:
  - `GET /warehouse/transactions?source=RESCUE_DISPATCH`
  - `GET /warehouse/transactions?source=RESCUE_RETURN`
  - `GET /warehouse/transactions?source=MANUAL_REPLENISHMENT`

- Kỳ vọng:
  - Mỗi request chỉ trả record đúng `source`

### 28. Filter ledger theo type

- Gọi:
  - `GET /warehouse/transactions?type=IN`
  - `GET /warehouse/transactions?type=OUT`

- Kỳ vọng:
  - Kết quả lọc đúng theo chiều nhập/xuất kho

### 29. Filter ledger theo category và khoảng thời gian

- Gọi ví dụ:

```http
GET /warehouse/transactions?categoryId=category-id&from=2026-03-01&to=2026-03-31&page=1&limit=20
```

- Kỳ vọng:
  - Chỉ trả record của category được chọn
  - `createdAt` nằm trong khoảng filter

## Case fail nhanh nên thử thêm

- Tạo rescue order cho request chưa `REVIEWED/ASSIGNED` phải fail `409`
- Tạo rescue order với `estimatedPeople < 1` phải fail `409`
- Tạo rescue order cho request không có assignment active phải fail `409`
- Dispatch phiếu đang thiếu hàng phải fail `409`
- Complete phiếu chưa `DISPATCHED` phải fail `409`
- Hoàn kho với `returnedQuantity` lớn hơn phần đã dispatch còn lại phải fail `409`
- Review lại request đã `APPROVED` hoặc `REJECTED` phải fail `409`
- Tạo replenishment request khi kho đang đủ phải fail `409`

## Kết luận pass nhanh

Có thể đánh dấu backend pass cho flow này nếu các điều kiện sau đều đúng:

- Phiếu vật phẩm tạo ra đúng 3 nhóm item cứu trợ theo công thức
- `check-stock` đổi trạng thái chính xác giữa `READY` và `INSUFFICIENT`
- `dispatch` làm giảm kho và sinh transaction `RESCUE_DISPATCH`
- `replenishment request` chỉ tạo khi thật sự thiếu hàng
- Admin review request làm tăng kho đúng theo lượng duyệt và sinh transaction `MANUAL_REPLENISHMENT`
- `complete` hoàn kho được vật phẩm dư và sinh transaction `RESCUE_RETURN`
- Ledger xem được đầy đủ lịch sử nhập xuất và filter hoạt động đúng
- Phân quyền `ADMIN/STAFF/USER` đúng như mong đợi