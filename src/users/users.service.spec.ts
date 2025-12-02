import { Test, TestingModule } from '@nestjs/testing';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'hashedpassword',
    phone: '123456789',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new user', async () => {
    const createUserDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRepository.create.mockReturnValue(mockUser);
    mockRepository.save.mockResolvedValue(mockUser);

    const user = await service.create(createUserDto);

    expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
    expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
    expect(user).toBeDefined();
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@example.com');
  });

  it('should find all users', async () => {
    const users = [mockUser];
    mockRepository.find.mockResolvedValue(users);

    const result = await service.findAll();

    expect(mockRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('should find one user', async () => {
    mockRepository.findOne.mockResolvedValue(mockUser);

    const user = await service.findOne(1);

    expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(user).toBeDefined();
    expect(user.name).toBe('John Doe');
  });

  it('should throw NotFoundException when user not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('should update a user', async () => {
    const updateUserDto = {
      name: 'Jane Doe',
    };
    const updatedUser = { ...mockUser, name: 'Jane Doe' };

    mockRepository.findOne.mockResolvedValue({ ...mockUser });
    mockRepository.save.mockResolvedValue(updatedUser);

    const user = await service.update(1, updateUserDto);

    expect(user).toBeDefined();
    expect(user.name).toBe('Jane Doe');
  });

  it('should remove a user', async () => {
    mockRepository.findOne.mockResolvedValue(mockUser);
    mockRepository.remove.mockResolvedValue(mockUser);

    await service.remove(1);

    expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
  });

  it('should throw NotFoundException when removing non-existent user', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});
