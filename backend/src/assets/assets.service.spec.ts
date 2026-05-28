import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  asset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('AssetsService', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('retourne les assets de la bonne company', async () => {
      const companyId = 'company-1';
      const fakeAssets = [
        { id: 'asset-1', companyId, name: 'Laptop', tags: [], _count: { locationHistory: 0 } },
        { id: 'asset-2', companyId, name: 'Monitor', tags: [], _count: { locationHistory: 2 } },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(fakeAssets);

      const result = await service.findAll(companyId);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId } }),
      );
      expect(result).toEqual(fakeAssets);
    });
  });

  describe('create', () => {
    it('calcule netBookValue correctement (prix 1000, 10 ans, achat il y a 5 ans -> ~500)', async () => {
      const companyId = 'company-1';
      // Purchase date 5 years ago
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const dto = {
        name: 'Machine',
        category: 'Equipement',
        purchasePrice: 1000,
        purchaseDate: fiveYearsAgo.toISOString(),
        depreciationYears: 10,
      };

      const createdAsset = { id: 'asset-new', companyId, ...dto, netBookValue: 500 };
      mockPrisma.asset.create.mockResolvedValue(createdAsset);

      await service.create(dto, companyId);

      const callArg = mockPrisma.asset.create.mock.calls[0][0];
      const nbv: number = callArg.data.netBookValue;
      // Allow 5% tolerance for time drift during test execution
      expect(nbv).toBeGreaterThan(450);
      expect(nbv).toBeLessThan(550);
    });
  });

  describe('findOne', () => {
    it('throw NotFoundException si non trouvé', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown-id', 'company-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw ForbiddenException si mauvaise company', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-1',
        companyId: 'other-company',
        name: 'Laptop',
        tags: [],
        locationHistory: [],
      });

      await expect(service.findOne('asset-1', 'company-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('supprime si autorisé', async () => {
      const companyId = 'company-1';
      const asset = {
        id: 'asset-1',
        companyId,
        name: 'Laptop',
        tags: [],
        locationHistory: [],
      };
      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.asset.delete.mockResolvedValue(asset);

      const result = await service.remove('asset-1', companyId);

      expect(mockPrisma.asset.delete).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
      });
      expect(result).toEqual(asset);
    });
  });
});
