//12. Vì sao tạo interface cho req.user?
// Đã tạo jwt-payload.interface.ts và authenticated-request.interface.ts
// Nếu không khai báo, TypeScript có thể không biết request.user tồn tại.
// Khi khai báo request: AuthenticatedRequest, TypeScript sẽ biết request.user là JwtPayload.
/* TypeScript hiểu:
  request.user.sub
  request.user.email
  request.user.name
  điều hợp lệ đây là lợi ích của type safety
 */
export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  token_type?: "access" | "refresh";
  iat?: number;
  exp?: number;
}
