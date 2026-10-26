16. Luồng hoàn chỉnh từ lúc chạy app

Giai đoạn 1: Khởi động
npm start
↓
dist/main.js
↓
NestFactory.create(AppModule)
↓
ConfigModule đọc .env
↓
validateEnvironment kiểm tra config

    Nếu config sai:
        App dừng
    Nếu config đúng:
        App tiếp tục khởi tạo

Giai đoạn 2: Khởi tạo JWT
AuthModule
↓
ConfigService
↓
JWT_SECRET
JWT_EXPIRES_IN
↓
JwtModule.registerAsync()
Giai đoạn 3: Server lắng nghe
PORT=3000
↓
app.listen(3000)
Giai đoạn 4: Đăng nhập
POST /auth/login
↓
ValidationPipe
↓
AuthController.login()
↓
AuthService.login()
↓
Tìm User
↓
bcrypt.compare()
↓
jwtService.signAsync()
↓
Trả access_token
Giai đoạn 5: Truy cập profile
GET /profile
Authorization: Bearer <token>
↓
JwtAuthGuard
↓
extractToken()
↓
verifyAsync()
↓
request.user = payload
↓
ProfileController.profile()
↓
Trả dữ liệu user
Bạn có thể ghi nhớ bằng công thức:
.env
↓
ConfigModule
↓
ConfigService
↓
JWT Module
↓
Login tạo token
↓
Client gửi Bearer token
↓
Auth Guard kiểm tra
↓
req.user = payload
↓
Controller xử lý
Hoặc ngắn gọn hơn:
Config để biết dùng gì.
DTO để kiểm tra dữ liệu vào.
Service để xử lý nghiệp vụ.
JWT để cấp danh tính.
Guard để kiểm tra danh tính.
req.user để controller biết ai đang gọi.
