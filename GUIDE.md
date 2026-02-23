# Hướng dẫn chạy ứng dụng DroneDelivery

## Yêu cầu
- Node.js (phiên bản LTS được khuyến nghị)
- npm hoặc yarn

## Cài đặt thư viện
Trước khi chạy ứng dụng, hãy chắc chắn rằng bạn đã cài đặt các thư viện cần thiết:

```bash
npm install
```

## Chạy ứng dụng

### 1. Khởi động Development Server
Chạy lệnh sau để khởi động Expo development server:

```bash
npm start
```
hoặc
```bash
npx expo start
```

### 2. Chạy trên thiết bị/giả lập

- **Android**: Nhấn `a` trong terminal sau khi server đã khởi động, hoặc chạy `npm run android`.
- **iOS**: Nhấn `i` trong terminal (chỉ trên macOS), hoặc chạy `npm run ios`.
- **Web**: Nhấn `w` trong terminal, hoặc chạy `npm run web`.

### 3. Quét mã QR
Nếu bạn cài đặt ứng dụng **Expo Go** trên điện thoại (Android hoặc iOS), bạn có thể quét mã QR hiển thị trên terminal để chạy ứng dụng trực tiếp trên thiết bị của mình.

## Lưu ý
- Đảm bảo thiết bị của bạn và máy tính đang kết nối cùng một mạng Wi-Fi nếu bạn test trên thiết bị thật.
