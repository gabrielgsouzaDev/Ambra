import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StudentsService } from '../accounts/students.service';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let createStudent: jest.Mock;

  const HEADER =
    'nome,turma,rm,responsavel1_nome,responsavel1_email,responsavel2_nome,responsavel2_email';

  beforeEach(async () => {
    createStudent = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [ImportService, { provide: StudentsService, useValue: { createStudent } }],
    }).compile();
    service = moduleRef.get(ImportService);
  });

  it('cria as linhas válidas e reporta as inválidas pelo número da linha', async () => {
    createStudent.mockResolvedValue({});
    const csv = [
      HEADER,
      'Ana Souza,5A,001,João Souza,joao@x.com,,', // ok (1 responsável)
      'Bruno Lima,6B,002,Maria Lima,maria@x.com,Zé Lima,ze@x.com', // ok (2 responsáveis)
      'Sem Resp,,003,,,,', // inválida: 0 responsáveis
    ].join('\n');

    const result = await service.importCsv({ csv });

    expect(result.total).toBe(3);
    expect(result.created).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({ row: 4, rm: '003' });
    expect(createStudent).toHaveBeenCalledTimes(2);
  });

  it('reporta RM duplicado (erro do serviço) sem abortar as demais linhas', async () => {
    createStudent
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ConflictException('Já existe um aluno com este RM nesta escola.'));
    const csv = [
      HEADER,
      'Ana,5A,001,João,joao@x.com,,',
      'Outra,5A,001,Maria,maria@x.com,,',
    ].join('\n');

    const result = await service.importCsv({ csv });

    expect(result.created).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain('RM');
  });
});
