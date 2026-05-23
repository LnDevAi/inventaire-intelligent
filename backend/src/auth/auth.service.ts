import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UpdateMeDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        companyId: dto.companyId,
        role: dto.role ?? 'AGENT',
      },
    });

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signToken(user);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: { select: { name: true, country: true, subscriptionPlan: true } },
        _count: { select: { locationsCaptured: true } },
      },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updates: { name?: string; email?: string; passwordHash?: string } = {};
    if (dto.name)  updates.name  = dto.name;
    if (dto.email) updates.email = dto.email;

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new UnauthorizedException('Mot de passe actuel requis');
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const valid = await bcrypt.compare(dto.currentPassword, user!.passwordHash);
      if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');
      updates.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updates,
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
  }

  private signToken(user: { id: string; email: string; companyId: string; role: string }) {
    const payload = { sub: user.id, email: user.email, companyId: user.companyId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, companyId: user.companyId, role: user.role },
    };
  }
}
