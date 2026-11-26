import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '0912345679' })
  @IsString()
  @Matches(/^[0-9]{9,12}$/, { message: 'Số điện thoại không hợp lệ' })
  phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password!: string;

  @ApiProperty({ example: 'Lê Minh Tuấn' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;

  @ApiProperty({ example: 'TDP-05-P12' })
  @IsString()
  @IsNotEmpty({ message: 'Mã tổ dân phố không được để trống' })
  neighborhoodCode!: string;
}

export class LoginDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới tối thiểu 6 ký tự' })
  newPassword!: string;
}

