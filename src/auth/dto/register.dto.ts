import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  MinLength,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { UserProfileDto } from "../../users/dto/user-profile.dto";

export class RegisterDto {
  @IsNotEmpty({ message: "Tên không được để trống" })
  @IsString({ message: "Tên phải là một chuỗi" })
  @MaxLength(100, { message: "Tên không được quá 100 ký tự" })
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    // Xóa khoảng trắng thừa đầu cuối VÀ thu gọn khoảng trắng kép ở giữa thành 1 dấu cách
    return value.trim().replace(/\s+/g, " ");
  })
  name: string;

  @IsNotEmpty({ message: "Email không được để trống" })
  @IsEmail({}, { message: "Email không đúng định dạng" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @IsString({ message: "Mật khẩu phải là một chuỗi" })
  @MaxLength(72, { message: "Mật khẩu không được quá 72 ký tự" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  @Matches(
    // Mở rộng thêm các ký tự đặc biệt phổ biến khác như #, _, -, ... thay vì gò bó trong vài ký tự
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d\W]{8,}$/,
    {
      message:
        "Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt",
    },
  )
  password: string;

  @IsOptional()
  @Transform(({ value }) => {
    // Nếu client lỡ gửi lên giá trị rỗng, null hoặc object rỗng thì tự động biến thành undefined để bỏ qua
    if (
      !value ||
      value === "" ||
      (typeof value === "object" && Object.keys(value).length === 0)
    ) {
      return undefined;
    }
    return value;
  })
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;
}
