import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request, HttpCode, HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

interface AuthRequest {
  user: { id: string; companyId: string; role: UserRole };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.usersService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.usersService.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req: AuthRequest, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, req.user.companyId, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.usersService.remove(id, req.user.companyId, req.user.id);
  }
}
