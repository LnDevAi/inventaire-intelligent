import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  createdAt: true,
  _count: { select: { locationsCaptured: true } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async create(companyId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, companyId, role: dto.role ?? 'AGENT' },
      select: USER_SELECT,
    });
  }

  async update(id: string, companyId: string, requesterId: string, dto: UpdateUserDto) {
    await this.findOne(id, companyId);
    // Empêche un admin de rétrograder son propre rôle
    if (id === requesterId && dto.role) throw new ForbiddenException('Impossible de modifier son propre rôle');
    return this.prisma.user.update({
      where: { id },
      data: { ...dto },
      select: USER_SELECT,
    });
  }

  async remove(id: string, companyId: string, requesterId: string) {
    await this.findOne(id, companyId);
    if (id === requesterId) throw new ForbiddenException('Impossible de supprimer son propre compte');
    await this.prisma.user.delete({ where: { id } });
  }
}
