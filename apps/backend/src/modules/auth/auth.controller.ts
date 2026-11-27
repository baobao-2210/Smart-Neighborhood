import { Body, Controller, Get, Ip, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
} from '../../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('neighborhoods')
  getNeighborhoods() {
    return this.authService.getActiveNeighborhoods();
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}

