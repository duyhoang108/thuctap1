import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

// Custom validator xử lý triệt để logic ngày sinh nâng cao
function IsValidBirthDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidBirthDate",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Nếu rỗng thì bỏ qua (vì đã có @IsOptional xử lý)

          // 1. Kiểm tra định dạng cơ bản YYYY-MM-DD
          const regex = /^\d{4}-\d{2}-\d{2}$/;
          if (!regex.test(value)) return false;

          const [year, month, day] = value.split("-").map(Number);
          const birthDate = new Date(year, month - 1, day);
          const today = new Date();

          // 2. Kiểm tra xem ngày tháng có thực sự tồn tại không (Ví dụ: tránh ngày 2023-02-31)
          if (
            birthDate.getFullYear() !== year ||
            birthDate.getMonth() !== month - 1 ||
            birthDate.getDate() !== day
          ) {
            return false;
          }

          // 3. Chặn ngày sinh ở tương lai
          if (birthDate > today) return false;

          // 4. Chặn năm quá cũ (ví dụ trước năm 1900)
          if (year < 1900) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return "Ngày sinh không hợp lệ (phải đúng định dạng YYYY-MM-DD, không được là ngày trong tương lai hoặc trước năm 1900)";
        },
      },
    });
  };
}

export class UserProfileDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Chuyển chuỗi rỗng thành undefined để @IsOptional hoạt động chính xác
    if (value === "" || (typeof value === "string" && value.trim() === "")) {
      return undefined;
    }
    return typeof value === "string" ? value.trim() : value;
  })
  @IsString({ message: "Số điện thoại phải là chuỗi ký tự" })
  @Matches(/^(?:\+84|84|0)(?:[35789][0-9]|2[0-9]|1[2689])[0-9]{7}$/, {
    message: "Số điện thoại không đúng định dạng tại Việt Nam",
  })
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || (typeof value === "string" && value.trim() === "")) {
      return undefined;
    }
    return typeof value === "string" ? value.trim() : value;
  })
  @IsValidBirthDate()
  dateOfBirth?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || (typeof value === "string" && value.trim() === "")) {
      return undefined;
    }
    // Tự động chuyển về chữ thường để tránh lỗi khi client gửi "Male" hoặc "MALE"
    return typeof value === "string" ? value.trim().toLowerCase() : value;
  })
  @IsEnum(Gender, {
    message: "Giới tính phải là male, female hoặc other",
  })
  gender?: Gender;
}
